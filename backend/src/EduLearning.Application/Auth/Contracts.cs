using System.ComponentModel.DataAnnotations;

namespace EduLearning.Application.Auth;

public sealed record RegisterRequest(
    [Required, EmailAddress, MaxLength(256)] string Email,
    [Required, StringLength(200, MinimumLength = 2)] string FullName,
    [Required, StringLength(128, MinimumLength = 12)] string Password
);

public sealed record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password
);

public sealed record EmailRequest([Required, EmailAddress] string Email);

public sealed record ConfirmRequest([Required] string UserId, [Required] string Token);

public sealed record ResetRequest(
    [Required, EmailAddress] string Email,
    [Required] string Token,
    [Required, StringLength(128, MinimumLength = 12)] string Password
);

public sealed record ProfileRequest(
    [Required, StringLength(200, MinimumLength = 2)] string FullName,
    [MaxLength(500)] string? Bio = null
);

public sealed record UserProfile(
    string Id,
    string Email,
    string FullName,
    string[] Roles,
    string? Bio = null,
    string? AvatarUrl = null
);

public sealed record AuthResult(bool Succeeded, string[] Errors)
{
    public static AuthResult Success => new(true, []);

    public static AuthResult Failure(params string[] errors) => new(false, errors);
}

public interface IIdentityService
{
    Task<AuthResult> RegisterAsync(RegisterRequest request);
    Task<AuthResult> LoginAsync(LoginRequest request);
    Task LogoutAsync();
    Task<AuthResult> ConfirmAsync(ConfirmRequest request);
    Task ForgotAsync(EmailRequest request);
    Task<AuthResult> ResetAsync(ResetRequest request);
    Task<UserProfile?> ProfileAsync(string userId);
    Task<AuthResult> UpdateProfileAsync(string userId, ProfileRequest request);
}

public interface ITransactionalEmail
{
    Task SendAsync(string recipient, string subject, string body);
}
