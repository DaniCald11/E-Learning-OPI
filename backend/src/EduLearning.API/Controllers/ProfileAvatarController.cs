using System.Security.Claims;
using EduLearning.Application.Catalog;
using EduLearning.Infrastructure.Catalog;
using EduLearning.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduLearning.API.Controllers;

[ApiController, Route("api/v1/users/me/avatar"), Authorize]
public sealed class ProfileAvatarController(ApplicationDbContext db, PrivateMediaStorage storage)
    : ControllerBase
{
    [
        HttpPost,
        RequestSizeLimit(3 * 1024 * 1024),
        RequestFormLimits(MultipartBodyLengthLimit = 3 * 1024 * 1024)
    ]
    public async Task<IActionResult> Upload(
        [FromForm] IFormFile file,
        CancellationToken cancellationToken
    )
    {
        if (
            file.Length <= 0
            || file.Length > 2 * 1024 * 1024
            || file.ContentType is not ("image/png" or "image/jpeg")
        )
            throw new CatalogException("Usa una foto PNG o JPG de hasta 2 MB.");
        var id = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await db.Users.SingleAsync(x => x.Id == id);
        await using var source = file.OpenReadStream();
        var media = await storage.SaveAsync(
            source,
            file.FileName,
            file.Length,
            file.ContentType,
            null,
            cancellationToken
        );
        media.Kind = "Avatar";
        media.OwnerUserId = id;
        await using var transaction = await db.Database.BeginTransactionAsync();
        try
        {
            db.Add(media);
            await db.SaveChangesAsync();
            user.AvatarMediaId = media.Id;
            await db.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch
        {
            await storage.DeleteAsync(media);
            throw;
        }
        return NoContent();
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var id = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var avatar = await db
            .Users.Where(x => x.Id == id)
            .Select(x => x.AvatarMediaId)
            .SingleAsync();
        var media = await db.MediaFiles.SingleOrDefaultAsync(x =>
            x.Id == avatar && x.Kind == "Avatar" && x.OwnerUserId == id
        ) ?? throw new CatalogException("No hay foto de perfil.", 404);
        Response.Headers.CacheControl = "private, no-store";
        Response.Headers.XContentTypeOptions = "nosniff";
        return File(await storage.OpenAsync(media, HttpContext.RequestAborted), media.ContentType);
    }

    [HttpDelete]
    public async Task<IActionResult> Remove()
    {
        var id = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await db.Users.SingleAsync(x => x.Id == id);
        user.AvatarMediaId = null;
        await db.SaveChangesAsync();
        return NoContent();
    }
}
