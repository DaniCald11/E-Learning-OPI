using System.Threading.RateLimiting;
using System.Text.Json.Serialization;
using Amazon;
using Amazon.SimpleEmailV2;
using EduLearning.Application.Auth;
using EduLearning.Domain.Identity;
using EduLearning.Infrastructure.Email;
using EduLearning.Infrastructure.Identity;
using EduLearning.Infrastructure.Persistence;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
var development = builder.Environment.IsDevelopment();
var publicUrl = builder.Configuration["App:PublicUrl"];
if (!Uri.TryCreate(publicUrl, UriKind.Absolute, out var appUri) ||
    (!development && appUri.Scheme != "https") || appUri.Scheme is not ("http" or "https"))
    throw new InvalidOperationException("Configura App:PublicUrl; HTTPS es obligatorio fuera de desarrollo.");
var connection = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Falta ConnectionStrings:DefaultConnection.");
builder.Services.AddDbContext<ApplicationDbContext>(options => options.UseSqlServer(connection));
builder.Services.AddIdentity<ApplicationUser, IdentityRole<Guid>>(options =>
{
    options.User.RequireUniqueEmail = true;
    options.Password.RequiredLength = 12;
    options.SignIn.RequireConfirmedEmail = true;
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
}).AddEntityFrameworkStores<ApplicationDbContext>().AddDefaultTokenProviders();
builder.Services.Configure<DataProtectionTokenProviderOptions>(options => options.TokenLifespan = TimeSpan.FromHours(1));
builder.Services.Configure<SecurityStampValidatorOptions>(options => options.ValidationInterval = TimeSpan.Zero);
builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.Name = "EduLearning.Session";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Strict;
    options.Cookie.SecurePolicy = development ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
    options.ExpireTimeSpan = TimeSpan.FromHours(8);
    options.SlidingExpiration = true;
    options.Events.OnRedirectToLogin = context => { context.Response.StatusCode = 401; return Task.CompletedTask; };
    options.Events.OnRedirectToAccessDenied = context => { context.Response.StatusCode = 403; return Task.CompletedTask; };
    options.Events.OnValidatePrincipal = async context =>
    {
        await SecurityStampValidator.ValidatePrincipalAsync(context);
        if (context.Principal?.Identity?.IsAuthenticated != true) return;
        var manager = context.HttpContext.RequestServices.GetRequiredService<UserManager<ApplicationUser>>();
        var user = await manager.GetUserAsync(context.Principal);
        if (user is null || !user.IsActive || (context.Principal.IsInRole(UserRoles.Admin) && user.AdminSlot != 1))
        {
            context.RejectPrincipal();
            await context.HttpContext.RequestServices.GetRequiredService<SignInManager<ApplicationUser>>().SignOutAsync();
        }
    };
});
var keyPath = builder.Configuration["DataProtection:Path"];
if (string.IsNullOrWhiteSpace(keyPath)) throw new InvalidOperationException("Configura DataProtection:Path en almacenamiento privado persistente.");
Directory.CreateDirectory(keyPath);
if (!OperatingSystem.IsWindows()) File.SetUnixFileMode(keyPath, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
builder.Services.AddDataProtection().SetApplicationName("EduLearning").PersistKeysToFileSystem(new DirectoryInfo(keyPath));
builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-CSRF-TOKEN";
    options.Cookie.Name = "EduLearning.Antiforgery";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Strict;
    options.Cookie.SecurePolicy = development ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
});
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("Admin", policy => policy.RequireAuthenticatedUser().RequireRole(UserRoles.Admin));
    options.AddPolicy("Student", policy => policy.RequireAuthenticatedUser().RequireRole(UserRoles.Student));
});
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = 429;
    options.AddPolicy("auth", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        { PermitLimit = builder.Configuration.GetValue("Auth:RateLimit", 20), Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
});
builder.Services.AddControllers().AddJsonOptions(options =>
    options.JsonSerializerOptions.UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow);
builder.Services.AddProblemDetails();
if (development) builder.Services.AddOpenApi();
builder.Services.AddScoped<IIdentityService, IdentityService>();
builder.Services.AddScoped<DatabaseInitializer>();
var emailProvider = builder.Configuration["Email:Provider"];
if (emailProvider == "Development" && development)
    builder.Services.AddScoped<ITransactionalEmail, DevelopmentEmail>();
else if (emailProvider == "SES" && !string.IsNullOrWhiteSpace(builder.Configuration["Email:From"]) &&
         !string.IsNullOrWhiteSpace(builder.Configuration["Email:Region"]))
{
    builder.Services.AddSingleton<IAmazonSimpleEmailServiceV2>(_ => new AmazonSimpleEmailServiceV2Client(RegionEndpoint.GetBySystemName(builder.Configuration["Email:Region"])));
    builder.Services.AddScoped<ITransactionalEmail, SesEmail>();
}
else throw new InvalidOperationException("Configura SES para correo; el adaptador Development solo se permite en Development.");
var app = builder.Build();
app.UseExceptionHandler();
app.UseStatusCodePages();
if (!development) { app.UseHsts(); app.UseHttpsRedirection(); }
app.UseRouting();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/api") &&
        !HttpMethods.IsGet(context.Request.Method) && !HttpMethods.IsHead(context.Request.Method) && !HttpMethods.IsOptions(context.Request.Method))
    {
        try { await context.RequestServices.GetRequiredService<IAntiforgery>().ValidateRequestAsync(context); }
        catch (AntiforgeryValidationException)
        {
            await Results.Problem(statusCode: 400, title: "Token CSRF inválido o ausente.").ExecuteAsync(context);
            return;
        }
    }
    await next();
});
app.MapControllers();
if (development) app.MapOpenApi();
app.MapGet("/api/v1/health", async (ApplicationDbContext db) =>
    await db.Database.CanConnectAsync() ? Results.Ok(new { status = "ready" }) : Results.Problem(statusCode: 503));
// Migration/initialization is explicit, never silently applied on normal startup.
if (args.Contains("--migrate"))
{
    using var scope = app.Services.CreateScope();
    await scope.ServiceProvider.GetRequiredService<ApplicationDbContext>().Database.MigrateAsync();
    await scope.ServiceProvider.GetRequiredService<DatabaseInitializer>().InitializeAsync();
    return;
}
app.Run();
public partial class Program { }
