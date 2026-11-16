using System.Text;
using EduLearning.Application.Auth;
using EduLearning.Domain.Identity;
using EduLearning.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace EduLearning.Infrastructure.Identity;

public sealed class IdentityService(
    UserManager<ApplicationUser> users,
    SignInManager<ApplicationUser> signIn,
    ApplicationDbContext db,
    ITransactionalEmail email,
    IConfiguration configuration
) : IIdentityService
{
    private static AuthResult Result(IdentityResult result) =>
        result.Succeeded
            ? AuthResult.Success
            : AuthResult.Failure(
                "No se pudo completar la solicitud. Revisa los datos y los requisitos de contraseña."
            );

    private static string Encode(string value) =>
        WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(value));

    private static string? Decode(string value)
    {
        try
        {
            return Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(value));
        }
        catch (FormatException)
        {
            return null;
        }
    }

    private string Link(string route, Dictionary<string, string?> query) =>
        QueryHelpers.AddQueryString(configuration["App:PublicUrl"]!.TrimEnd('/') + route, query);

    public async Task<AuthResult> RegisterAsync(RegisterRequest request)
    {
        if (request.FullName.Trim().Length < 2)
            return AuthResult.Failure("El nombre debe tener al menos dos caracteres.");
        try
        {
            // Keep role creation and registration atomic; never accept a role from the client.
            await using var transaction = await db.Database.BeginTransactionAsync();
            var user = new ApplicationUser
            {
                Id = Guid.NewGuid(),
                UserName = request.Email.Trim(),
                Email = request.Email.Trim(),
                FullName = request.FullName.Trim(),
            };
            var result = await users.CreateAsync(user, request.Password);
            if (!result.Succeeded)
                return Result(result);
            result = await users.AddToRoleAsync(user, UserRoles.Student);
            if (!result.Succeeded)
                return Result(result);
            var token = Encode(await users.GenerateEmailConfirmationTokenAsync(user));
            await email.SendAsync(
                user.Email!,
                "Confirma tu cuenta",
                Link(
                    "/confirmar-correo",
                    new() { ["userId"] = user.Id.ToString(), ["token"] = token }
                )
            );
            await transaction.CommitAsync();
            return AuthResult.Success;
        }
        catch (DbUpdateException exception)
            when (exception.InnerException is SqlException { Number: 2601 or 2627 })
        {
            return AuthResult.Failure("No se pudo completar el registro con esos datos.");
        }
    }

    public async Task<AuthResult> LoginAsync(LoginRequest request)
    {
        var user = await users.FindByEmailAsync(request.Email.Trim());
        if (user is null || !user.IsActive)
            return AuthResult.Failure("Correo o contraseña incorrectos, o cuenta no disponible.");
        var result = await signIn.PasswordSignInAsync(user, request.Password, false, true);
        return result.Succeeded
            ? AuthResult.Success
            : AuthResult.Failure("Correo o contraseña incorrectos, o cuenta no disponible.");
    }

    public Task LogoutAsync() => signIn.SignOutAsync();

    public async Task<AuthResult> ConfirmAsync(ConfirmRequest request)
    {
        if (!Guid.TryParse(request.UserId, out _))
            return AuthResult.Failure("Enlace inválido o vencido.");
        var token = Decode(request.Token);
        var user = await users.FindByIdAsync(request.UserId);
        if (user is null || token is null)
            return AuthResult.Failure("Enlace inválido o vencido.");
        return Result(await users.ConfirmEmailAsync(user, token));
    }

    public async Task ForgotAsync(EmailRequest request)
    {
        var user = await users.FindByEmailAsync(request.Email.Trim());
        if (user is null || !user.IsActive || !user.EmailConfirmed)
            return;
        var token = Encode(await users.GeneratePasswordResetTokenAsync(user));
        await email.SendAsync(
            user.Email!,
            "Restablece tu contraseña",
            Link("/restablecer-contrasena", new() { ["email"] = user.Email, ["token"] = token })
        );
    }

    public async Task<AuthResult> ResetAsync(ResetRequest request)
    {
        var user = await users.FindByEmailAsync(request.Email.Trim());
        var token = Decode(request.Token);
        if (user is null || !user.IsActive || token is null)
            return AuthResult.Failure("Enlace inválido o vencido.");
        var result = await users.ResetPasswordAsync(user, token, request.Password);
        if (result.Succeeded)
            await users.SetLockoutEndDateAsync(user, null);
        return Result(result);
    }

    public async Task<UserProfile?> ProfileAsync(string userId)
    {
        var user = await users.FindByIdAsync(userId);
        if (user is null || !user.IsActive)
            return null;
        return new(
            user.Id.ToString(),
            user.Email!,
            user.FullName,
            [.. await users.GetRolesAsync(user)],
            user.Bio,
            user.AvatarMediaId.HasValue
                ? "/api/v1/users/me/avatar?v=" + user.AvatarMediaId.Value.ToString("N")
                : null
        );
    }

    public async Task<AuthResult> UpdateProfileAsync(string userId, ProfileRequest request)
    {
        var user = await users.FindByIdAsync(userId);
        if (user is null || !user.IsActive)
            return AuthResult.Failure("Cuenta no disponible.");
        if (request.FullName.Trim().Length < 2)
            return AuthResult.Failure("El nombre debe tener al menos dos caracteres.");
        user.FullName = request.FullName.Trim();
        user.Bio = string.IsNullOrWhiteSpace(request.Bio) ? null : request.Bio.Trim();
        return Result(await users.UpdateAsync(user));
    }
}
