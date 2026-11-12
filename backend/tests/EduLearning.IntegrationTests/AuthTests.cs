using System.Net;
using System.Net.Http.Json;
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
    public string DirectoryPath { get; } = Path.Combine(Path.GetTempPath(), "opi-auth-" + Guid.NewGuid().ToString("N"));
    private string Connection { get; set; } = "";
    private readonly Dictionary<string, string?> previous = [];
    public async Task InitializeAsync()
    {
        var master = Environment.GetEnvironmentVariable("IntegrationTests__ConnectionString")
            ?? throw new InvalidOperationException("Run python3 scripts/dev.py test with local SQL Server available.");
        var builder = new SqlConnectionStringBuilder(master) { InitialCatalog = "EduLearningTest_" + Guid.NewGuid().ToString("N") };
        Connection = builder.ConnectionString;
        foreach (var (key, value) in new Dictionary<string, string>
        {
            ["ASPNETCORE_ENVIRONMENT"] = "Development",
            ["ConnectionStrings__DefaultConnection"] = Connection,
            ["App__PublicUrl"] = "http://localhost",
            ["DataProtection__Path"] = Path.Combine(DirectoryPath, "keys"),
            ["Email__Provider"] = "Development",
            ["Email__OutboxPath"] = Path.Combine(DirectoryPath, "mail"),
            ["BootstrapAdmin__Email"] = AdminEmail,
            ["BootstrapAdmin__Password"] = Password,
            ["Auth__RateLimit"] = "1000"
        }) { previous[key] = Environment.GetEnvironmentVariable(key); Environment.SetEnvironmentVariable(key, value); }
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
    public HttpClient Client() => Factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
    public async Task<HttpResponseMessage> SendAsync(HttpClient client, string route, object? data = null, HttpMethod? method = null)
    {
        var token = await client.GetFromJsonAsync<JsonElement>("/api/v1/auth/csrf");
        using var request = new HttpRequestMessage(method ?? HttpMethod.Post, route) { Content = JsonContent.Create(data ?? new { }) };
        request.Headers.Add("X-CSRF-TOKEN", token.GetProperty("token").GetString());
        return await client.SendAsync(request);
    }
    public async Task<Dictionary<string, string?>> MailAsync(string recipient, string subject)
    {
        foreach (var path in Directory.GetFiles(Path.Combine(DirectoryPath, "mail"), "*.json").OrderByDescending(File.GetLastWriteTimeUtc))
        {
            var value = JsonDocument.Parse(await File.ReadAllTextAsync(path)).RootElement;
            if (value.GetProperty("recipient").GetString() == recipient && value.GetProperty("subject").GetString() == subject)
                return QueryHelpers.ParseQuery(new Uri(value.GetProperty("body").GetString()!).Query)
                    .ToDictionary(x => x.Key, x => (string?)x.Value.ToString());
        }
        throw new InvalidOperationException("Expected development email was not delivered");
    }
    public async Task<string> RegisterAsync(HttpClient client, bool confirm = true)
    {
        var email = $"student-{Guid.NewGuid():N}@example.test";
        Assert.Equal(HttpStatusCode.NoContent, (await SendAsync(client, "/api/v1/auth/register", new { email, fullName = "Alumno de prueba", password = Password })).StatusCode);
        if (confirm) Assert.Equal(HttpStatusCode.NoContent, (await SendAsync(client, "/api/v1/auth/confirm-email", await MailAsync(email, "Confirma tu cuenta"))).StatusCode);
        return email;
    }
    public async Task DisposeAsync()
    {
        await Factory.DisposeAsync();
        await using var db = new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>().UseSqlServer(Connection).Options);
        await db.Database.EnsureDeletedAsync();
        if (Directory.Exists(DirectoryPath)) Directory.Delete(DirectoryPath, true);
        foreach (var (key, value) in previous) Environment.SetEnvironmentVariable(key, value);
    }
}
public sealed class AuthTests(AuthFixture fixture) : IClassFixture<AuthFixture>
{
    [Fact]
    public async Task Anonymous_and_student_cannot_access_administration()
    {
        using var client = fixture.Client();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1/admin/status")).StatusCode);
        var email = await fixture.RegisterAsync(client);
        Assert.Equal(HttpStatusCode.NoContent, (await fixture.SendAsync(client, "/api/v1/auth/login", new { email, password = fixture.Password })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/v1/admin/status")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/v1/student/status")).StatusCode);
        var profile = await client.GetFromJsonAsync<JsonElement>("/api/v1/users/me");
        Assert.Equal(new[] { "Student" }, profile.GetProperty("roles").EnumerateArray().Select(x => x.GetString()));
    }
    [Fact]
    public async Task Registration_cannot_choose_role_or_admin_slot()
    {
        using var client = fixture.Client();
        Assert.Equal(HttpStatusCode.BadRequest, (await fixture.SendAsync(client, "/api/v1/auth/register",
            new { email = "escalate@example.test", fullName = "Intruso", password = fixture.Password, role = "Admin", adminSlot = 1 })).StatusCode);
    }
    [Fact]
    public async Task Mutating_requests_require_csrf_even_login_and_registration()
    {
        using var client = fixture.Client();
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/v1/auth/login", new { email = fixture.AdminEmail, password = fixture.Password })).StatusCode);
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/register")
        { Content = JsonContent.Create(new { email = "bad@example.test", fullName = "Prueba", password = fixture.Password }) };
        request.Headers.Add("X-CSRF-TOKEN", "forged");
        Assert.Equal(HttpStatusCode.BadRequest, (await client.SendAsync(request)).StatusCode);
    }
    [Fact]
    public async Task Confirmation_is_required_before_login()
    {
        using var client = fixture.Client();
        var email = await fixture.RegisterAsync(client, false);
        Assert.Equal(HttpStatusCode.Unauthorized, (await fixture.SendAsync(client, "/api/v1/auth/login", new { email, password = fixture.Password })).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await fixture.SendAsync(client, "/api/v1/auth/confirm-email", await fixture.MailAsync(email, "Confirma tu cuenta"))).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await fixture.SendAsync(client, "/api/v1/auth/login", new { email, password = fixture.Password })).StatusCode);
    }
    [Fact]
    public async Task Logout_removes_access_and_cookie_is_http_only()
    {
        using var client = fixture.Client();
        var login = await fixture.SendAsync(client, "/api/v1/auth/login", new { email = fixture.AdminEmail, password = fixture.Password });
        Assert.Equal(HttpStatusCode.NoContent, login.StatusCode);
        var cookie = string.Join(";", login.Headers.GetValues("Set-Cookie"));
        Assert.Contains("httponly", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=strict", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/v1/admin/status")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await fixture.SendAsync(client, "/api/v1/auth/logout")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1/users/me")).StatusCode);
    }
    [Fact]
    public async Task Profile_update_persists_without_role_changes()
    {
        using var client = fixture.Client();
        var email = await fixture.RegisterAsync(client);
        await fixture.SendAsync(client, "/api/v1/auth/login", new { email, password = fixture.Password });
        Assert.Equal(HttpStatusCode.NoContent, (await fixture.SendAsync(client, "/api/v1/users/me", new { fullName = "Nombre actualizado" }, HttpMethod.Patch)).StatusCode);
        var profile = await client.GetFromJsonAsync<JsonElement>("/api/v1/users/me");
        Assert.Equal("Nombre actualizado", profile.GetProperty("fullName").GetString());
        Assert.Equal(HttpStatusCode.BadRequest, (await fixture.SendAsync(client, "/api/v1/users/me", new { fullName = "Intruso", roles = new[] { "Admin" } }, HttpMethod.Patch)).StatusCode);
    }
    [Fact]
    public async Task Password_reset_invalidates_sessions_and_old_password()
    {
        using var client = fixture.Client();
        using var anonymous = fixture.Client();
        var email = await fixture.RegisterAsync(client);
        await fixture.SendAsync(client, "/api/v1/auth/login", new { email, password = fixture.Password });
        Assert.Equal(HttpStatusCode.Accepted, (await fixture.SendAsync(anonymous, "/api/v1/auth/forgot-password", new { email })).StatusCode);
        var message = await fixture.MailAsync(email, "Restablece tu contraseña");
        var password = "Bb2!" + Guid.NewGuid().ToString("N");
        Assert.Equal(HttpStatusCode.NoContent, (await fixture.SendAsync(anonymous, "/api/v1/auth/reset-password", new { email, token = message["token"], password })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1/users/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await fixture.SendAsync(anonymous, "/api/v1/auth/login", new { email, password = fixture.Password })).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await fixture.SendAsync(anonymous, "/api/v1/auth/login", new { email, password })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await fixture.SendAsync(anonymous, "/api/v1/auth/reset-password", new { email, token = message["token"], password })).StatusCode);
    }
    [Fact]
    public async Task Forgot_password_does_not_disclose_unknown_account()
    {
        using var client = fixture.Client();
        Assert.Equal(HttpStatusCode.Accepted, (await fixture.SendAsync(client, "/api/v1/auth/forgot-password", new { email = "missing@example.test" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await fixture.SendAsync(client, "/api/v1/auth/confirm-email", new { userId = Guid.NewGuid().ToString(), token = "invalid" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await fixture.SendAsync(client, "/api/v1/auth/confirm-email", new { userId = "not-a-guid", token = "invalid" })).StatusCode);
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
        db.Users.Add(new ApplicationUser { Id = Guid.NewGuid(), UserName = "second", NormalizedUserName = "SECOND", FullName = "Segundo", AdminSlot = 1 });
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
        await Assert.ThrowsAsync<SqlException>(() => db.Database.ExecuteSqlInterpolatedAsync($"INSERT INTO AspNetUserRoles (UserId, RoleId) VALUES ({user.Id}, {role.Id})"));
    }
    [Fact]
    public async Task Lockout_blocks_login_after_five_invalid_attempts()
    {
        using var client = fixture.Client();
        var email = await fixture.RegisterAsync(client);
        for (var attempt = 0; attempt < 5; attempt++)
            Assert.Equal(HttpStatusCode.Unauthorized, (await fixture.SendAsync(client, "/api/v1/auth/login", new { email, password = "wrong-password" })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await fixture.SendAsync(client, "/api/v1/auth/login", new { email, password = fixture.Password })).StatusCode);
    }
    [Fact]
    public async Task Deactivated_user_loses_existing_session()
    {
        using var client = fixture.Client();
        var email = await fixture.RegisterAsync(client);
        await fixture.SendAsync(client, "/api/v1/auth/login", new { email, password = fixture.Password });
        using (var scope = fixture.Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var user = await db.Users.SingleAsync(x => x.Email == email); user.IsActive = false; await db.SaveChangesAsync();
        }
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1/users/me")).StatusCode);
    }
    [Fact]
    public async Task Concurrent_registration_keeps_one_user_and_returns_a_controlled_failure()
    {
        using var first = fixture.Client(); using var second = fixture.Client();
        var email = $"concurrent-{Guid.NewGuid():N}@example.test";
        var data = new { email, fullName = "Alumno concurrente", password = fixture.Password };
        var responses = await Task.WhenAll(fixture.SendAsync(first, "/api/v1/auth/register", data), fixture.SendAsync(second, "/api/v1/auth/register", data));
        Assert.Single(responses, response => response.StatusCode == HttpStatusCode.NoContent);
        Assert.Single(responses, response => response.StatusCode == HttpStatusCode.BadRequest);
        using var scope = fixture.Factory.Services.CreateScope();
        Assert.Equal(1, await scope.ServiceProvider.GetRequiredService<ApplicationDbContext>().Users.CountAsync(x => x.Email == email));
    }
    [Fact]
    public async Task Invalid_registration_data_is_rejected()
    {
        using var client = fixture.Client();
        Assert.Equal(HttpStatusCode.BadRequest, (await fixture.SendAsync(client, "/api/v1/auth/register", new { email = "invalid", fullName = "A", password = "weak" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await fixture.SendAsync(client, "/api/v1/auth/register", new { email = "trim@example.test", fullName = " a ", password = fixture.Password })).StatusCode);
    }
    [Fact]
    public async Task Auth_rate_limit_returns_429()
    {
        var previous = Environment.GetEnvironmentVariable("Auth__RateLimit");
        try
        {
            Environment.SetEnvironmentVariable("Auth__RateLimit", "2");
            await using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(host => host.UseEnvironment("Development"));
            using var client = factory.CreateClient();
            Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/v1/auth/csrf")).StatusCode);
            Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/v1/auth/csrf")).StatusCode);
            Assert.Equal(HttpStatusCode.TooManyRequests, (await client.GetAsync("/api/v1/auth/csrf")).StatusCode);
        }
        finally { Environment.SetEnvironmentVariable("Auth__RateLimit", previous); }
    }
    [Fact]
    public void Production_refuses_development_email_adapter()
    {
        var previous = Environment.GetEnvironmentVariable("App__PublicUrl");
        try
        {
            Environment.SetEnvironmentVariable("App__PublicUrl", "https://localhost");
            using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(host => host.UseEnvironment("Production"));
            var exception = Assert.Throws<InvalidOperationException>(() => factory.CreateClient());
            Assert.Contains("Configura SES", exception.Message);
        }
        finally { Environment.SetEnvironmentVariable("App__PublicUrl", previous); }
    }

}
