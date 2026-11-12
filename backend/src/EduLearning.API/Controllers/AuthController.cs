using System.Security.Claims;
using EduLearning.Application.Auth;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
namespace EduLearning.API.Controllers;

[ApiController, Route("api/v1/auth"), EnableRateLimiting("auth")]
public sealed class AuthController(IIdentityService identity) : ControllerBase
{
    private IActionResult Result(AuthResult result) => result.Succeeded ? NoContent()
        : Problem(statusCode: 400, title: "No se pudo completar la solicitud.", detail: string.Join(" ", result.Errors));
    [HttpGet("csrf")]
    public IActionResult Csrf([FromServices] IAntiforgery antiforgery)
    {
        Response.Headers.CacheControl = "no-store";
        return Ok(new { token = antiforgery.GetAndStoreTokens(HttpContext).RequestToken });
    }
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request) => Result(await identity.RegisterAsync(request));
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var result = await identity.LoginAsync(request);
        return result.Succeeded ? NoContent() : Problem(statusCode: 401, title: "No se pudo iniciar sesión.", detail: result.Errors[0]);
    }
    [Authorize, HttpPost("logout")]
    public async Task<IActionResult> Logout() { await identity.LogoutAsync(); return NoContent(); }
    [HttpPost("confirm-email")]
    public async Task<IActionResult> Confirm(ConfirmRequest request) => Result(await identity.ConfirmAsync(request));
    [HttpPost("forgot-password")]
    public async Task<IActionResult> Forgot(EmailRequest request)
    { await identity.ForgotAsync(request); return Accepted(new { message = "Si la cuenta existe y está confirmada, recibirás instrucciones." }); }
    [HttpPost("reset-password")]
    public async Task<IActionResult> Reset(ResetRequest request) => Result(await identity.ResetAsync(request));
}
