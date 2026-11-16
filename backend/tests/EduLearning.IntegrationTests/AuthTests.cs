using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using EduLearning.Domain.Identity;
using EduLearning.Infrastructure.Identity;
using EduLearning.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace EduLearning.IntegrationTests;

public sealed class AuthFixture : IAsyncLifetime
{
    public WebApplicationFactory<Program> Factory { get; private set; } = null!;
    public string AdminEmail { get; } = "admin@example.test";
    public string Password { get; } = "Aa1!" + Guid.NewGuid().ToString("N");
    public string DirectoryPath { get; } =
        Path.Combine(Path.GetTempPath(), "opi-auth-" + Guid.NewGuid().ToString("N"));
    private string Connection { get; set; } = "";
    private readonly Dictionary<string, string?> previous = [];

    public async Task InitializeAsync()
    {
        var master = Environment.GetEnvironmentVariable("IntegrationTests__ConnectionString")
            ?? throw new InvalidOperationException(
                "Run python3 scripts/dev.py test with local SQL Server available."
            );
        var builder = new SqlConnectionStringBuilder(master)
        {
            InitialCatalog = "EduLearningTest_" + Guid.NewGuid().ToString("N"),
        };
        Connection = builder.ConnectionString;
        foreach (
            var (key, value) in new Dictionary<string, string>
            {
                ["ASPNETCORE_ENVIRONMENT"] = "Development",
                ["ConnectionStrings__DefaultConnection"] = Connection,
                ["App__PublicUrl"] = "http://localhost",
                ["DataProtection__Path"] = Path.Combine(DirectoryPath, "keys"),
                ["Email__Provider"] = "Development",
                ["Email__OutboxPath"] = Path.Combine(DirectoryPath, "mail"),
                ["BootstrapAdmin__Email"] = AdminEmail,
                ["BootstrapAdmin__Password"] = Password,
                ["Auth__RateLimit"] = "1000",
            }
        )
        {
            previous[key] = Environment.GetEnvironmentVariable(key);
            Environment.SetEnvironmentVariable(key, value);
        }
        Factory = new WebApplicationFactory<Program>().WithWebHostBuilder(host =>
        {
            host.UseEnvironment("Development");
            host.ConfigureLogging(logging => logging.ClearProviders());
        });
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await db.Database.MigrateAsync();
        await scope.ServiceProvider.GetRequiredService<DatabaseInitializer>().InitializeAsync();
    }

    public HttpClient Client() =>
        Factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

    public async Task<HttpResponseMessage> SendAsync(
        HttpClient client,
        string route,
        object? data = null,
        HttpMethod? method = null
    )
    {
        var token = await client.GetFromJsonAsync<JsonElement>("/api/v1/auth/csrf");
        using var request = new HttpRequestMessage(method ?? HttpMethod.Post, route)
        {
            Content = JsonContent.Create(
                data ?? new { },
                options: new JsonSerializerOptions(JsonSerializerDefaults.Web)
                {
                    Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() },
                }
            ),
        };
        request.Headers.Add("X-CSRF-TOKEN", token.GetProperty("token").GetString());
        return await client.SendAsync(request);
    }

    public async Task<Dictionary<string, string?>> MailAsync(string recipient, string subject)
    {
        foreach (
            var path in Directory
                .GetFiles(Path.Combine(DirectoryPath, "mail"), "*.json")
                .OrderByDescending(File.GetLastWriteTimeUtc)
        )
        {
            var value = JsonDocument.Parse(await File.ReadAllTextAsync(path)).RootElement;
            if (
                value.GetProperty("recipient").GetString() == recipient
                && value.GetProperty("subject").GetString() == subject
            )
                return QueryHelpers
                    .ParseQuery(new Uri(value.GetProperty("body").GetString()!).Query)
                    .ToDictionary(x => x.Key, x => (string?)x.Value.ToString());
        }
        throw new InvalidOperationException("Expected development email was not delivered");
    }

    public async Task<string> RegisterAsync(HttpClient client, bool confirm = true)
    {
        var email = $"student-{Guid.NewGuid():N}@example.test";
        Assert.Equal(
            HttpStatusCode.NoContent,
            (
                await SendAsync(
                    client,
                    "/api/v1/auth/register",
                    new
                    {
                        email,
                        fullName = "Alumno de prueba",
                        password = Password,
                    }
                )
            ).StatusCode
        );
        if (confirm)
            Assert.Equal(
                HttpStatusCode.NoContent,
                (
                    await SendAsync(
                        client,
                        "/api/v1/auth/confirm-email",
                        await MailAsync(email, "Confirma tu cuenta")
                    )
                ).StatusCode
            );
        return email;
    }

    public async Task DisposeAsync()
    {
        await Factory.DisposeAsync();
        await using var db = new ApplicationDbContext(
            new DbContextOptionsBuilder<ApplicationDbContext>().UseSqlServer(Connection).Options
        );
        await db.Database.EnsureDeletedAsync();
        if (Directory.Exists(DirectoryPath))
            Directory.Delete(DirectoryPath, true);
        foreach (var (key, value) in previous)
            Environment.SetEnvironmentVariable(key, value);
    }
}

public sealed class AuthTests(AuthFixture fixture) : IClassFixture<AuthFixture>
{
    [Fact]
    public async Task Anonymous_and_student_cannot_access_administration()
    {
        using var client = fixture.Client();
        Assert.Equal(
            HttpStatusCode.Unauthorized,
            (await client.GetAsync("/api/v1/admin/status")).StatusCode
        );
        var email = await fixture.RegisterAsync(client);
        Assert.Equal(
            HttpStatusCode.NoContent,
            (
                await fixture.SendAsync(
                    client,
                    "/api/v1/auth/login",
                    new { email, password = fixture.Password }
                )
            ).StatusCode
        );
        Assert.Equal(
            HttpStatusCode.Forbidden,
            (await client.GetAsync("/api/v1/admin/status")).StatusCode
        );
        Assert.Equal(
            HttpStatusCode.OK,
            (await client.GetAsync("/api/v1/student/status")).StatusCode
        );
        var profile = await client.GetFromJsonAsync<JsonElement>("/api/v1/users/me");
        Assert.Equal(
            new[] { "Student" },
            profile.GetProperty("roles").EnumerateArray().Select(x => x.GetString())
        );
    }

    [Fact]
    public async Task Registration_cannot_choose_role_or_admin_slot()
    {
        using var client = fixture.Client();
        Assert.Equal(
            HttpStatusCode.BadRequest,
            (
                await fixture.SendAsync(
                    client,
                    "/api/v1/auth/register",
                    new
                    {
                        email = "escalate@example.test",
                        fullName = "Intruso",
                        password = fixture.Password,
                        role = "Admin",
                        adminSlot = 1,
                    }
                )
            ).StatusCode
        );
    }

    [Fact]
    public async Task Mutating_requests_require_csrf_even_login_and_registration()
    {
        using var client = fixture.Client();
        Assert.Equal(
            HttpStatusCode.BadRequest,
            (
                await client.PostAsJsonAsync(
                    "/api/v1/auth/login",
                    new { email = fixture.AdminEmail, password = fixture.Password }
                )
            ).StatusCode
        );
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/register")
        {
            Content = JsonContent.Create(
                new
                {
                    email = "bad@example.test",
                    fullName = "Prueba",
                    password = fixture.Password,
                }
            ),
        };
        request.Headers.Add("X-CSRF-TOKEN", "forged");
        Assert.Equal(HttpStatusCode.BadRequest, (await client.SendAsync(request)).StatusCode);
    }

    [Fact]
    public async Task Confirmation_is_required_before_login()
    {
        using var client = fixture.Client();
        var email = await fixture.RegisterAsync(client, false);
        Assert.Equal(
            HttpStatusCode.Unauthorized,
            (
                await fixture.SendAsync(
                    client,
                    "/api/v1/auth/login",
                    new { email, password = fixture.Password }
                )
            ).StatusCode
        );
        Assert.Equal(
            HttpStatusCode.NoContent,
            (
                await fixture.SendAsync(
                    client,
                    "/api/v1/auth/confirm-email",
                    await fixture.MailAsync(email, "Confirma tu cuenta")
                )
            ).StatusCode
        );
        Assert.Equal(
            HttpStatusCode.NoContent,
            (
                await fixture.SendAsync(
                    client,
                    "/api/v1/auth/login",
                    new { email, password = fixture.Password }
                )
            ).StatusCode
        );
    }

    [Fact]
    public async Task Logout_removes_access_and_cookie_is_http_only()
    {
        using var client = fixture.Client();
        var login = await fixture.SendAsync(
            client,
            "/api/v1/auth/login",
            new { email = fixture.AdminEmail, password = fixture.Password }
        );
        Assert.Equal(HttpStatusCode.NoContent, login.StatusCode);
        var cookie = string.Join(";", login.Headers.GetValues("Set-Cookie"));
        Assert.Contains("httponly", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=strict", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/v1/admin/status")).StatusCode);
        Assert.Equal(
            HttpStatusCode.NoContent,
            (await fixture.SendAsync(client, "/api/v1/auth/logout")).StatusCode
        );
        Assert.Equal(
            HttpStatusCode.Unauthorized,
            (await client.GetAsync("/api/v1/users/me")).StatusCode
        );
    }

    [Fact]
    public async Task Profile_update_persists_without_role_changes()
    {
        using var client = fixture.Client();
        var email = await fixture.RegisterAsync(client);
        await fixture.SendAsync(
            client,
            "/api/v1/auth/login",
            new { email, password = fixture.Password }
        );
        Assert.Equal(
            HttpStatusCode.NoContent,
            (
                await fixture.SendAsync(
                    client,
                    "/api/v1/users/me",
                    new { fullName = "Nombre actualizado" },
                    HttpMethod.Patch
                )
            ).StatusCode
        );
        var profile = await client.GetFromJsonAsync<JsonElement>("/api/v1/users/me");
        Assert.Equal("Nombre actualizado", profile.GetProperty("fullName").GetString());
        Assert.Equal(
            HttpStatusCode.BadRequest,
            (
                await fixture.SendAsync(
                    client,
                    "/api/v1/users/me",
                    new { fullName = "Intruso", roles = new[] { "Admin" } },
                    HttpMethod.Patch
                )
            ).StatusCode
        );
    }

    [Fact]
    public async Task Password_reset_invalidates_sessions_and_old_password()
    {
        using var client = fixture.Client();
        using var anonymous = fixture.Client();
        var email = await fixture.RegisterAsync(client);
        await fixture.SendAsync(
            client,
            "/api/v1/auth/login",
            new { email, password = fixture.Password }
        );
        Assert.Equal(
            HttpStatusCode.Accepted,
            (
                await fixture.SendAsync(anonymous, "/api/v1/auth/forgot-password", new { email })
            ).StatusCode
        );
        var message = await fixture.MailAsync(email, "Restablece tu contraseña");
        var password = "Bb2!" + Guid.NewGuid().ToString("N");
        Assert.Equal(
            HttpStatusCode.NoContent,
            (
                await fixture.SendAsync(
                    anonymous,
                    "/api/v1/auth/reset-password",
                    new
                    {
                        email,
                        token = message["token"],
                        password,
                    }
                )
            ).StatusCode
        );
        Assert.Equal(
            HttpStatusCode.Unauthorized,
            (await client.GetAsync("/api/v1/users/me")).StatusCode
        );
        Assert.Equal(
            HttpStatusCode.Unauthorized,
            (
                await fixture.SendAsync(
                    anonymous,
                    "/api/v1/auth/login",
                    new { email, password = fixture.Password }
                )
            ).StatusCode
        );
        Assert.Equal(
            HttpStatusCode.NoContent,
            (
                await fixture.SendAsync(anonymous, "/api/v1/auth/login", new { email, password })
            ).StatusCode
        );
        Assert.Equal(
            HttpStatusCode.BadRequest,
            (
                await fixture.SendAsync(
                    anonymous,
                    "/api/v1/auth/reset-password",
                    new
                    {
                        email,
                        token = message["token"],
                        password,
                    }
                )
            ).StatusCode
        );
    }

    [Fact]
    public async Task Forgot_password_does_not_disclose_unknown_account()
    {
        using var client = fixture.Client();
        Assert.Equal(
            HttpStatusCode.Accepted,
            (
                await fixture.SendAsync(
                    client,
                    "/api/v1/auth/forgot-password",
                    new { email = "missing@example.test" }
                )
            ).StatusCode
        );
        Assert.Equal(
            HttpStatusCode.BadRequest,
            (
                await fixture.SendAsync(
                    client,
                    "/api/v1/auth/confirm-email",
                    new { userId = Guid.NewGuid().ToString(), token = "invalid" }
                )
            ).StatusCode
        );
        Assert.Equal(
            HttpStatusCode.BadRequest,
            (
                await fixture.SendAsync(
                    client,
                    "/api/v1/auth/confirm-email",
                    new { userId = "not-a-guid", token = "invalid" }
                )
            ).StatusCode
        );
    }

    [Fact]
    public async Task Bootstrap_is_repeatable_and_sql_rejects_a_second_admin_slot()
    {
        using var scope = fixture.Factory.Services.CreateScope();
        var initializer = scope.ServiceProvider.GetRequiredService<DatabaseInitializer>();
        await initializer.InitializeAsync();
        await initializer.InitializeAsync();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.Equal(1, await db.Users.CountAsync(x => x.AdminSlot == 1));
        db.Users.Add(
            new ApplicationUser
            {
                Id = Guid.NewGuid(),
                UserName = "second",
                NormalizedUserName = "SECOND",
                FullName = "Segundo",
                AdminSlot = 1,
            }
        );
        await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
    }

    [Fact]
    public async Task Sql_rejects_assigning_admin_role_to_another_user()
    {
        using var client = fixture.Client();
        var email = await fixture.RegisterAsync(client);
        using var scope = fixture.Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var user = await db.Users.SingleAsync(x => x.Email == email);
        var role = await db.Roles.SingleAsync(x => x.NormalizedName == "ADMIN");
        await Assert.ThrowsAsync<SqlException>(() =>
            db.Database.ExecuteSqlInterpolatedAsync(
                $"INSERT INTO AspNetUserRoles (UserId, RoleId) VALUES ({user.Id}, {role.Id})"
            )
        );
    }

    [Fact]
    public async Task Lockout_blocks_login_after_five_invalid_attempts()
    {
        using var client = fixture.Client();
        var email = await fixture.RegisterAsync(client);
        for (var attempt = 0; attempt < 5; attempt++)
            Assert.Equal(
                HttpStatusCode.Unauthorized,
                (
                    await fixture.SendAsync(
                        client,
                        "/api/v1/auth/login",
                        new { email, password = "wrong-password" }
                    )
                ).StatusCode
            );
        Assert.Equal(
            HttpStatusCode.Unauthorized,
            (
                await fixture.SendAsync(
                    client,
                    "/api/v1/auth/login",
                    new { email, password = fixture.Password }
                )
            ).StatusCode
        );
    }

    [Fact]
    public async Task Deactivated_user_loses_existing_session()
    {
        using var client = fixture.Client();
        var email = await fixture.RegisterAsync(client);
        await fixture.SendAsync(
            client,
            "/api/v1/auth/login",
            new { email, password = fixture.Password }
        );
        using (var scope = fixture.Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var user = await db.Users.SingleAsync(x => x.Email == email);
            user.IsActive = false;
            await db.SaveChangesAsync();
        }
        Assert.Equal(
            HttpStatusCode.Unauthorized,
            (await client.GetAsync("/api/v1/users/me")).StatusCode
        );
    }

    [Fact]
    public async Task Concurrent_registration_keeps_one_user_and_returns_a_controlled_failure()
    {
        using var first = fixture.Client();
        using var second = fixture.Client();
        var email = $"concurrent-{Guid.NewGuid():N}@example.test";
        var data = new
        {
            email,
            fullName = "Alumno concurrente",
            password = fixture.Password,
        };
        var responses = await Task.WhenAll(
            fixture.SendAsync(first, "/api/v1/auth/register", data),
            fixture.SendAsync(second, "/api/v1/auth/register", data)
        );
        Assert.Single(responses, response => response.StatusCode == HttpStatusCode.NoContent);
        Assert.Single(responses, response => response.StatusCode == HttpStatusCode.BadRequest);
        using var scope = fixture.Factory.Services.CreateScope();
        Assert.Equal(
            1,
            await scope
                .ServiceProvider.GetRequiredService<ApplicationDbContext>()
                .Users.CountAsync(x => x.Email == email)
        );
    }

    [Fact]
    public async Task Invalid_registration_data_is_rejected()
    {
        using var client = fixture.Client();
        Assert.Equal(
            HttpStatusCode.BadRequest,
            (
                await fixture.SendAsync(
                    client,
                    "/api/v1/auth/register",
                    new
                    {
                        email = "invalid",
                        fullName = "A",
                        password = "weak",
                    }
                )
            ).StatusCode
        );
        Assert.Equal(
            HttpStatusCode.BadRequest,
            (
                await fixture.SendAsync(
                    client,
                    "/api/v1/auth/register",
                    new
                    {
                        email = "trim@example.test",
                        fullName = " a ",
                        password = fixture.Password,
                    }
                )
            ).StatusCode
        );
    }

    [Fact]
    public async Task Auth_rate_limit_returns_429()
    {
        var previous = Environment.GetEnvironmentVariable("Auth__RateLimit");
        try
        {
            Environment.SetEnvironmentVariable("Auth__RateLimit", "2");
            await using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(
                host => host.UseEnvironment("Development")
            );
            using var client = factory.CreateClient();
            Assert.Equal(
                HttpStatusCode.OK,
                (await client.GetAsync("/api/v1/auth/csrf")).StatusCode
            );
            Assert.Equal(
                HttpStatusCode.OK,
                (await client.GetAsync("/api/v1/auth/csrf")).StatusCode
            );
            Assert.Equal(
                HttpStatusCode.TooManyRequests,
                (await client.GetAsync("/api/v1/auth/csrf")).StatusCode
            );
        }
        finally
        {
            Environment.SetEnvironmentVariable("Auth__RateLimit", previous);
        }
    }

    [Fact]
    public void Production_refuses_development_email_adapter()
    {
        var previous = Environment.GetEnvironmentVariable("App__PublicUrl");
        try
        {
            Environment.SetEnvironmentVariable("App__PublicUrl", "https://localhost");
            using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(host =>
                host.UseEnvironment("Production")
            );
            var exception = Assert.Throws<InvalidOperationException>(() => factory.CreateClient());
            Assert.Contains("Configura SES", exception.Message);
        }
        finally
        {
            Environment.SetEnvironmentVariable("App__PublicUrl", previous);
        }
    }

    private async Task<HttpClient> AdminAsync()
    {
        var client = fixture.Client();
        Assert.Equal(
            HttpStatusCode.NoContent,
            (
                await fixture.SendAsync(
                    client,
                    "/api/v1/auth/login",
                    new { email = fixture.AdminEmail, password = fixture.Password }
                )
            ).StatusCode
        );
        return client;
    }

    private async Task<Guid> UploadVideoAsync(HttpClient client)
    {
        var token = await client.GetFromJsonAsync<JsonElement>("/api/v1/auth/csrf");
        using var data = new MultipartFormDataContent();
        var bytes = new byte[24];
        Encoding.ASCII.GetBytes("ftyp").CopyTo(bytes, 4);
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("video/mp4");
        data.Add(file, "file", "video.mp4");
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/media")
        {
            Content = data,
        };
        request.Headers.Add("X-CSRF-TOKEN", token.GetProperty("token").GetString());
        var response = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("id")
            .GetGuid();
    }

    private async Task<JsonElement> CourseAsync(HttpClient client, bool quiz = true)
    {
        var media = await UploadVideoAsync(client);
        var draft = new EduLearning.Application.Catalog.CourseDraft(
            "Curso reutilizable",
            "course-" + Guid.NewGuid().ToString("N"),
            "Contenido de prueba",
            [
                new(
                    Guid.NewGuid(),
                    "Tema",
                    [
                        new(
                            Guid.NewGuid(),
                            "Módulo",
                            [new(Guid.NewGuid(), "Video", "Video", true, [media])]
                        ),
                    ]
                ),
            ],
            quiz
                ? new(
                    Guid.NewGuid(),
                    "Evaluación",
                    [
                        new(
                            Guid.NewGuid(),
                            "Pregunta",
                            1,
                            [
                                new(Guid.NewGuid(), "Correcta", true),
                                new(Guid.NewGuid(), "Otra", false),
                            ]
                        ),
                    ]
                )
                : null,
            null
        );
        var response = await fixture.SendAsync(client, "/api/v1/admin/courses", draft);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<JsonElement>();
        var published = await fixture.SendAsync(
            client,
            "/api/v1/admin/courses/" + result.GetProperty("id").GetGuid() + "/publish"
        );
        Assert.Equal(HttpStatusCode.OK, published.StatusCode);
        return await published.Content.ReadFromJsonAsync<JsonElement>();
    }

    private async Task<JsonElement> ProductAsync(
        HttpClient client,
        Guid courseId,
        string type = "Workshop"
    )
    {
        var category = await fixture.SendAsync(
            client,
            "/api/v1/admin/categories",
            new { name = "Categoría", slug = "cat-" + Guid.NewGuid().ToString("N") }
        );
        Assert.Equal(HttpStatusCode.OK, category.StatusCode);
        var categoryId = (await category.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("id")
            .GetGuid();
        var response = await fixture.SendAsync(
            client,
            "/api/v1/admin/products",
            new
            {
                title = "Formación de prueba",
                slug = "product-" + Guid.NewGuid().ToString("N"),
                summary = "Aprende",
                description = "Descripción",
                type,
                categoryId,
                price = 1200,
                currency = "MXN",
                coverMediaId = (Guid?)null,
                courses = new[]
                {
                    new
                    {
                        courseId,
                        position = 1,
                        isRequired = true,
                    },
                },
                rowVersion = (string?)null,
            }
        );
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    [Fact]
    public async Task Catalog_publication_reuses_course_and_hides_private_answers_and_files()
    {
        using var admin = await AdminAsync();
        using var visitor = fixture.Client();
        var course = await CourseAsync(admin);
        var courseId = course.GetProperty("id").GetGuid();
        var product = await ProductAsync(admin, courseId);
        var id = product.GetProperty("id").GetGuid();
        var slug = product.GetProperty("draft").GetProperty("slug").GetString();
        Assert.Equal(
            HttpStatusCode.NotFound,
            (await visitor.GetAsync("/api/v1/products/" + slug)).StatusCode
        );
        Assert.Equal(
            HttpStatusCode.OK,
            (await fixture.SendAsync(admin, "/api/v1/admin/products/" + id + "/publish")).StatusCode
        );
        var response = await visitor.GetAsync("/api/v1/products/" + slug);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("isCorrect", json);
        Assert.DoesNotContain("storageKey", json);
        Assert.DoesNotContain("mediaIds", json);
        var another = await ProductAsync(admin, courseId);
        Assert.Equal(
            HttpStatusCode.OK,
            (
                await fixture.SendAsync(
                    admin,
                    "/api/v1/admin/products/" + another.GetProperty("id").GetGuid() + "/publish"
                )
            ).StatusCode
        );
        using var scope = fixture.Factory.Services.CreateScope();
        Assert.Equal(
            1,
            await scope
                .ServiceProvider.GetRequiredService<ApplicationDbContext>()
                .Courses.CountAsync(c => c.Id == courseId)
        );
    }

    [Fact]
    public async Task Workshop_and_individual_sale_are_mutually_exclusive_in_both_directions()
    {
        using var admin = await AdminAsync();
        foreach (var first in new[] { "Workshop", "IndividualCourse" })
        {
            var course = await CourseAsync(admin);
            var courseId = course.GetProperty("id").GetGuid();
            var p = await ProductAsync(admin, courseId, first);
            Assert.Equal(
                HttpStatusCode.OK,
                (
                    await fixture.SendAsync(
                        admin,
                        "/api/v1/admin/products/" + p.GetProperty("id").GetGuid() + "/publish"
                    )
                ).StatusCode
            );
            var other = await ProductAsync(
                admin,
                courseId,
                first == "Workshop" ? "IndividualCourse" : "Workshop"
            );
            Assert.Equal(
                HttpStatusCode.Conflict,
                (
                    await fixture.SendAsync(
                        admin,
                        "/api/v1/admin/products/" + other.GetProperty("id").GetGuid() + "/publish"
                    )
                ).StatusCode
            );
        }
    }

    [Fact]
    public async Task Workshop_requires_a_published_quiz_and_video()
    {
        using var admin = await AdminAsync();
        var course = await CourseAsync(admin, false);
        var product = await ProductAsync(admin, course.GetProperty("id").GetGuid());
        Assert.Equal(
            HttpStatusCode.BadRequest,
            (
                await fixture.SendAsync(
                    admin,
                    "/api/v1/admin/products/" + product.GetProperty("id").GetGuid() + "/publish"
                )
            ).StatusCode
        );
        var response = await fixture.SendAsync(
            admin,
            "/api/v1/admin/courses",
            new
            {
                title = "Borrador",
                slug = "empty-" + Guid.NewGuid().ToString("N"),
                description = "",
                topics = Array.Empty<object>(),
                quiz = (object?)null,
                rowVersion = (string?)null,
            }
        );
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var id = (await response.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("id")
            .GetGuid();
        Assert.Equal(
            HttpStatusCode.BadRequest,
            (await fixture.SendAsync(admin, "/api/v1/admin/courses/" + id + "/publish")).StatusCode
        );
    }

    [Fact]
    public async Task Previous_course_and_product_versions_remain_immutable_after_edits()
    {
        using var admin = await AdminAsync();
        using var visitor = fixture.Client();
        var course = await CourseAsync(admin);
        var courseId = course.GetProperty("id").GetGuid();
        var product = await ProductAsync(admin, courseId);
        var id = product.GetProperty("id").GetGuid();
        var slug = product.GetProperty("draft").GetProperty("slug").GetString();
        await fixture.SendAsync(admin, "/api/v1/admin/products/" + id + "/publish");
        var before = await visitor.GetFromJsonAsync<JsonElement>("/api/v1/products/" + slug);
        var version = before.GetProperty("courses")[0].GetProperty("courseVersionId").GetGuid();
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        var edited = JsonSerializer.Deserialize<EduLearning.Application.Catalog.CourseDraft>(
            course.GetProperty("draft"),
            options
        )! with
        {
            Title = "Título nuevo",
        };
        Assert.Equal(
            HttpStatusCode.OK,
            (
                await fixture.SendAsync(
                    admin,
                    "/api/v1/admin/courses/" + courseId,
                    edited,
                    HttpMethod.Put
                )
            ).StatusCode
        );
        Assert.Equal(
            HttpStatusCode.OK,
            (
                await fixture.SendAsync(admin, "/api/v1/admin/courses/" + courseId + "/publish")
            ).StatusCode
        );
        var still = await visitor.GetFromJsonAsync<JsonElement>("/api/v1/products/" + slug);
        Assert.Equal(
            version,
            still.GetProperty("courses")[0].GetProperty("courseVersionId").GetGuid()
        );
        Assert.Equal(
            "Curso reutilizable",
            still.GetProperty("courses")[0].GetProperty("title").GetString()
        );
        Assert.Equal(
            HttpStatusCode.OK,
            (await fixture.SendAsync(admin, "/api/v1/admin/products/" + id + "/publish")).StatusCode
        );
        var latest = await visitor.GetFromJsonAsync<JsonElement>("/api/v1/products/" + slug);
        Assert.Equal(2, latest.GetProperty("version").GetInt32());
        Assert.Equal(
            "Título nuevo",
            latest.GetProperty("courses")[0].GetProperty("title").GetString()
        );
        using var scope = fixture.Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.Contains(
            "Curso reutilizable",
            (await db.CourseVersions.FindAsync(version))!.SnapshotJson
        );
        Assert.Equal(2, await db.ProductVersions.CountAsync(v => v.ProductId == id));
    }

    [Fact]
    public async Task Draft_concurrency_and_public_catalog_filters_are_enforced()
    {
        using var admin = await AdminAsync();
        using var visitor = fixture.Client();
        var course = await CourseAsync(admin);
        var id = course.GetProperty("id").GetGuid();
        var draft = JsonSerializer.Deserialize<EduLearning.Application.Catalog.CourseDraft>(
            course.GetProperty("draft"),
            new JsonSerializerOptions(JsonSerializerDefaults.Web)
        )!;
        Assert.Equal(
            HttpStatusCode.OK,
            (
                await fixture.SendAsync(
                    admin,
                    "/api/v1/admin/courses/" + id,
                    draft with
                    {
                        Title = "Cambio",
                    },
                    HttpMethod.Put
                )
            ).StatusCode
        );
        Assert.Equal(
            HttpStatusCode.Conflict,
            (
                await fixture.SendAsync(admin, "/api/v1/admin/courses/" + id, draft, HttpMethod.Put)
            ).StatusCode
        );
        var product = await ProductAsync(admin, id);
        var pid = product.GetProperty("id").GetGuid();
        await fixture.SendAsync(admin, "/api/v1/admin/products/" + pid + "/publish");
        var category = product.GetProperty("draft").GetProperty("categoryId").GetGuid();
        var page = await visitor.GetFromJsonAsync<JsonElement>(
            "/api/v1/products?category=" + category + "&type=Workshop&pageSize=1"
        );
        Assert.Equal(1, page.GetProperty("total").GetInt32());
        Assert.Single(page.GetProperty("items").EnumerateArray());
        Assert.Equal(
            HttpStatusCode.BadRequest,
            (await visitor.GetAsync("/api/v1/products?pageSize=1000")).StatusCode
        );
        await fixture.SendAsync(admin, "/api/v1/admin/products/" + pid + "/unpublish");
        Assert.Equal(
            HttpStatusCode.NotFound,
            (
                await visitor.GetAsync(
                    "/api/v1/products/"
                        + product.GetProperty("draft").GetProperty("slug").GetString()
                )
            ).StatusCode
        );
    }

    [Fact]
    public async Task Media_library_is_private_and_rejects_disguised_uploads()
    {
        using var admin = await AdminAsync();
        using var visitor = fixture.Client();
        var media = await UploadVideoAsync(admin);
        Assert.Equal(
            HttpStatusCode.Unauthorized,
            (await visitor.GetAsync("/api/v1/admin/media/" + media + "/content")).StatusCode
        );
        Assert.Equal(
            HttpStatusCode.OK,
            (await admin.GetAsync("/api/v1/admin/media/" + media + "/content")).StatusCode
        );
        var token = await admin.GetFromJsonAsync<JsonElement>("/api/v1/auth/csrf");
        using var data = new MultipartFormDataContent();
        var file = new ByteArrayContent(Encoding.UTF8.GetBytes("not a PDF"));
        file.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(
            "application/pdf"
        );
        data.Add(file, "file", "fake.pdf");
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/media")
        {
            Content = data,
        };
        request.Headers.Add("X-CSRF-TOKEN", token.GetProperty("token").GetString());
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.SendAsync(request)).StatusCode);
        Assert.Equal(
            HttpStatusCode.Unauthorized,
            (await visitor.GetAsync("/api/v1/admin/products")).StatusCode
        );
    }

    [Fact]
    public async Task Product_drafts_do_not_mutate_public_price_and_duplicate_preserves_course_reference()
    {
        using var admin = await AdminAsync();
        using var visitor = fixture.Client();
        var course = await CourseAsync(admin);
        var courseId = course.GetProperty("id").GetGuid();
        var product = await ProductAsync(admin, courseId);
        var id = product.GetProperty("id").GetGuid();
        var publication = await fixture.SendAsync(
            admin,
            "/api/v1/admin/products/" + id + "/publish"
        );
        Assert.Equal(HttpStatusCode.OK, publication.StatusCode);
        var current = await publication.Content.ReadFromJsonAsync<JsonElement>();
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        options.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
        var draft = JsonSerializer.Deserialize<EduLearning.Application.Catalog.ProductDraft>(
            current.GetProperty("draft"),
            options
        )!;
        var edited = draft with { Price = 1500 };
        var response = await fixture.SendAsync(
            admin,
            "/api/v1/admin/products/" + id,
            edited,
            HttpMethod.Put
        );
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var stale = await fixture.SendAsync(
            admin,
            "/api/v1/admin/products/" + id,
            edited,
            HttpMethod.Put
        );
        Assert.Equal(HttpStatusCode.Conflict, stale.StatusCode);
        var publicProduct = await visitor.GetFromJsonAsync<JsonElement>(
            "/api/v1/products/" + draft.Slug
        );
        Assert.Equal(1200, publicProduct.GetProperty("price").GetDecimal());
        var duplicate = await fixture.SendAsync(
            admin,
            "/api/v1/admin/products/" + id + "/duplicate"
        );
        Assert.Equal(HttpStatusCode.OK, duplicate.StatusCode);
        var copy = await duplicate.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Draft", copy.GetProperty("status").GetString());
        Assert.Equal(0, copy.GetProperty("publishedVersion").GetInt32());
        Assert.Equal(
            courseId,
            copy.GetProperty("draft").GetProperty("courses")[0].GetProperty("courseId").GetGuid()
        );
    }

    [Fact]
    public void Workshop_optional_courses_and_quizzes_with_multiple_correct_answers_are_rejected()
    {
        var product = new EduLearning.Application.Catalog.ProductDraft(
            "Taller",
            "taller",
            "Resumen",
            "Descripción",
            EduLearning.Domain.Catalog.ProductType.Workshop,
            Guid.NewGuid(),
            100,
            "MXN",
            null,
            [new(Guid.NewGuid(), 1, false)],
            null
        );
        Assert.Throws<EduLearning.Application.Catalog.CatalogException>(() =>
            EduLearning.Application.Catalog.CatalogRules.ValidateProduct(product)
        );
        var course = new EduLearning.Application.Catalog.CourseDraft(
            "Curso",
            "curso",
            "",
            [],
            new(
                Guid.NewGuid(),
                "Evaluación",
                [
                    new(
                        Guid.NewGuid(),
                        "Pregunta",
                        1,
                        [new(Guid.NewGuid(), "A", true), new(Guid.NewGuid(), "B", true)]
                    ),
                ]
            ),
            null
        );
        Assert.Throws<EduLearning.Application.Catalog.CatalogException>(() =>
            EduLearning.Application.Catalog.CatalogRules.ValidateCourse(course)
        );
    }

    private static readonly byte[] PhotoPng = Convert.FromBase64String(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a/csAAAAASUVORK5CYII="
    );

    private async Task<HttpResponseMessage> SendPhotoAsync(
        HttpClient client,
        string type = "image/png"
    )
    {
        var token = await client.GetFromJsonAsync<JsonElement>("/api/v1/auth/csrf");
        using var data = new MultipartFormDataContent();
        var file = new ByteArrayContent(PhotoPng);
        file.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(type);
        data.Add(file, "file", "profile.png");
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/users/me/avatar")
        {
            Content = data,
        };
        request.Headers.Add("X-CSRF-TOKEN", token.GetProperty("token").GetString());
        return await client.SendAsync(request);
    }

    [Fact]
    public async Task Profile_bio_and_photo_persist_and_remain_private()
    {
        using var student = fixture.Client();
        var email = await fixture.RegisterAsync(student);
        await fixture.SendAsync(
            student,
            "/api/v1/auth/login",
            new { email, password = fixture.Password }
        );
        Assert.Equal(
            HttpStatusCode.NoContent,
            (
                await fixture.SendAsync(
                    student,
                    "/api/v1/users/me",
                    new { fullName = "Asesor de prueba", bio = "Profesional inmobiliario" },
                    HttpMethod.Patch
                )
            ).StatusCode
        );
        Assert.Equal(HttpStatusCode.NoContent, (await SendPhotoAsync(student)).StatusCode);
        var profile = await student.GetFromJsonAsync<JsonElement>("/api/v1/users/me");
        Assert.Equal("Profesional inmobiliario", profile.GetProperty("bio").GetString());
        var url = profile.GetProperty("avatarUrl").GetString()!;
        Assert.StartsWith("/api/v1/users/me/avatar?v=", url);
        Assert.Equal(PhotoPng, await student.GetByteArrayAsync(url));
        using var visitor = fixture.Client();
        Assert.Equal(HttpStatusCode.Unauthorized, (await visitor.GetAsync(url)).StatusCode);
        using var other = fixture.Client();
        var otherEmail = await fixture.RegisterAsync(other);
        await fixture.SendAsync(
            other,
            "/api/v1/auth/login",
            new { email = otherEmail, password = fixture.Password }
        );
        Assert.Equal(HttpStatusCode.NotFound, (await other.GetAsync(url)).StatusCode);
        using var admin = await AdminAsync();
        using var scope = fixture.Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var avatar = await db
            .Users.Where(x => x.Email == email)
            .Select(x => x.AvatarMediaId)
            .SingleAsync();
        Assert.Equal(
            HttpStatusCode.NotFound,
            (await admin.GetAsync("/api/v1/admin/media/" + avatar + "/content")).StatusCode
        );
        Assert.DoesNotContain(
            avatar!.Value.ToString(),
            await admin.GetStringAsync("/api/v1/admin/media")
        );
        Assert.Equal(
            HttpStatusCode.NoContent,
            (
                await fixture.SendAsync(student, "/api/v1/users/me/avatar", null, HttpMethod.Delete)
            ).StatusCode
        );
        Assert.Equal(HttpStatusCode.NotFound, (await student.GetAsync(url)).StatusCode);
    }

    [Fact]
    public async Task Profile_rejects_invalid_photo_types_and_oversized_bio()
    {
        using var client = await AdminAsync();
        Assert.Equal(
            HttpStatusCode.BadRequest,
            (await SendPhotoAsync(client, "application/pdf")).StatusCode
        );
        Assert.Equal(
            HttpStatusCode.BadRequest,
            (
                await fixture.SendAsync(
                    client,
                    "/api/v1/users/me",
                    new { fullName = "Admin", bio = new string('x', 501) },
                    HttpMethod.Patch
                )
            ).StatusCode
        );
    }

    [Fact]
    public async Task Folders_exist_without_files_and_existing_media_can_be_moved()
    {
        using var admin = await AdminAsync();
        var name = "Carpeta " + Guid.NewGuid().ToString("N");
        var created = await fixture.SendAsync(admin, "/api/v1/admin/media-folders", new { name });
        Assert.Equal(HttpStatusCode.OK, created.StatusCode);
        Assert.Contains(name, await admin.GetStringAsync("/api/v1/admin/media-folders"));
        Assert.Equal(
            HttpStatusCode.Conflict,
            (await fixture.SendAsync(admin, "/api/v1/admin/media-folders", new { name })).StatusCode
        );
        var media = await UploadVideoAsync(admin);
        Assert.Equal(
            HttpStatusCode.NoContent,
            (
                await fixture.SendAsync(
                    admin,
                    "/api/v1/admin/media/" + media,
                    new { folder = name },
                    HttpMethod.Patch
                )
            ).StatusCode
        );
        using var scope = fixture.Factory.Services.CreateScope();
        Assert.Equal(
            name,
            (
                await scope
                    .ServiceProvider.GetRequiredService<ApplicationDbContext>()
                    .MediaFiles.FindAsync(media)
            )!.Folder
        );
        Assert.Equal(
            HttpStatusCode.BadRequest,
            (
                await fixture.SendAsync(
                    admin,
                    "/api/v1/admin/media/" + media,
                    new { folder = "No existe" },
                    HttpMethod.Patch
                )
            ).StatusCode
        );
        Assert.Equal(
            HttpStatusCode.BadRequest,
            (
                await fixture.SendAsync(
                    admin,
                    "/api/v1/admin/media-folders",
                    new { name = "../fuera" }
                )
            ).StatusCode
        );
        using var student = fixture.Client();
        var email = await fixture.RegisterAsync(student);
        await fixture.SendAsync(
            student,
            "/api/v1/auth/login",
            new { email, password = fixture.Password }
        );
        Assert.Equal(
            HttpStatusCode.Forbidden,
            (await student.GetAsync("/api/v1/admin/media-folders")).StatusCode
        );
    }

    [Fact]
    public async Task Upgrade_keeps_existing_library_files_and_imports_folder_names()
    {
        using var scope = fixture.Factory.Services.CreateScope();
        var original = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var connection = new SqlConnectionStringBuilder(original.Database.GetConnectionString())
        {
            InitialCatalog = "EduLearningUpgradeTest_" + Guid.NewGuid().ToString("N"),
        };
        await using var db = new ApplicationDbContext(
            new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseSqlServer(connection.ConnectionString)
                .Options
        );
        try
        {
            var migrator =
                Microsoft.EntityFrameworkCore.Infrastructure.AccessorExtensions.GetService<Microsoft.EntityFrameworkCore.Migrations.IMigrator>(
                    db
                );
            await migrator.MigrateAsync("20261115022646_CatalogAndImmutableVersions");
            await db.Database.ExecuteSqlRawAsync(
                "INSERT INTO MediaFiles (Id,OriginalFileName,ContentType,StorageKey,Provider,ProcessingStatus,SizeBytes,Folder,CreatedAtUtc) VALUES (NEWID(),'legacy.pdf','application/pdf','legacy','Local','Ready',10,' Ventas ',SYSUTCDATETIME()),(NEWID(),'legacy-two.pdf','application/pdf','legacy-two','Local','Ready',10,'Ventas',SYSUTCDATETIME());"
            );
            await migrator.MigrateAsync();
            Assert.Equal(
                2,
                await db.MediaFiles.CountAsync(x => x.Kind == "Library" && x.Folder == "Ventas")
            );
            Assert.Equal(1, await db.MediaFolders.CountAsync(x => x.Name == "Ventas"));
        }
        finally
        {
            await db.Database.EnsureDeletedAsync();
        }
    }
}
