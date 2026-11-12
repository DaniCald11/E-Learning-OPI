using System.Security.Claims;
using EduLearning.Application.Auth;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
namespace EduLearning.API.Controllers;

[ApiController, Route("api/v1/users/me"), Authorize]
public sealed class ProfileController(IIdentityService identity) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        Response.Headers.CacheControl = "no-store";
        var user = await identity.ProfileAsync(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        return user is null ? Unauthorized() : Ok(user);
    }
    [HttpPatch]
    public async Task<IActionResult> Patch(ProfileRequest request)
    {
        var result = await identity.UpdateProfileAsync(User.FindFirstValue(ClaimTypes.NameIdentifier)!, request);
        return result.Succeeded ? NoContent() : Problem(statusCode: 400, title: "No se pudo actualizar el perfil.");
    }
}
