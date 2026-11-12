using System.Security.Claims;
using EduLearning.Application.Auth;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
namespace EduLearning.API.Controllers;

[ApiController, Route("api/v1/admin/status"), Authorize(Policy = "Admin")]
public sealed class AdminStatusController : ControllerBase
{
    [HttpGet] public IActionResult Get() => Ok(new { role = "Admin" });
}
