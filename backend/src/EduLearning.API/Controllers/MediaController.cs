using EduLearning.Application.Catalog;
using EduLearning.Infrastructure.Catalog;
using EduLearning.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduLearning.API.Controllers;

[ApiController, Route("api/v1/admin/media"), Authorize(Policy = "Admin")]
public sealed class MediaController(
    ICatalogService catalog,
    PrivateMediaStorage storage,
    ApplicationDbContext db
) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List() =>
        Ok(
            (await catalog.MediaAsync()).Select(m => new
            {
                m.Id,
                m.OriginalFileName,
                m.ContentType,
                m.SizeBytes,
                m.Folder,
                m.CreatedAtUtc,
                m.ProcessingStatus,
                m.Provider,
            })
        );

    [
        HttpPost,
        RequestSizeLimit(105 * 1024 * 1024),
        RequestFormLimits(MultipartBodyLengthLimit = 105 * 1024 * 1024)
    ]
    public async Task<IActionResult> Upload(
        [FromForm] IFormFile file,
        [FromForm] string? folder,
        CancellationToken cancellationToken
    )
    {
        await using var source = file.OpenReadStream();
        var media = await storage.SaveAsync(
            source,
            file.FileName,
            file.Length,
            file.ContentType,
            folder,
            cancellationToken
        );
        try
        {
            await catalog.AddMediaAsync(media);
        }
        catch
        {
            await storage.DeleteAsync(media);
            throw;
        }
        return Ok(
            new
            {
                media.Id,
                media.OriginalFileName,
                media.ContentType,
                media.SizeBytes,
                media.Folder,
                media.ProcessingStatus,
                media.Provider,
            }
        );
    }

    [HttpPost("{id:guid}/refresh")]
    public async Task<IActionResult> Refresh(Guid id)
    {
        var media = await db.MediaFiles.SingleOrDefaultAsync(x => x.Id == id)
            ?? throw new CatalogException("Archivo no encontrado.", 404);
        await storage.RefreshAsync(media);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("{id:guid}/content")]
    public async Task<IActionResult> Content(Guid id)
    {
        var media = await db.MediaFiles.SingleOrDefaultAsync(x => x.Id == id)
            ?? throw new CatalogException("Archivo no encontrado.", 404);
        Response.Headers.CacheControl = "private, no-store";
        Response.Headers.XContentTypeOptions = "nosniff";
        if (media.Provider == "CloudflareStream")
            return Redirect(storage.PlaybackUrl(media));
        return File(
            await storage.OpenAsync(media, HttpContext.RequestAborted),
            media.ContentType,
            enableRangeProcessing: true
        );
    }
}

[ApiController, Route("api/v1/media")]
public sealed class PublicCoverController(ApplicationDbContext db, PrivateMediaStorage storage)
    : ControllerBase
{
    [HttpGet("{id:guid}/cover")]
    public async Task<IActionResult> Cover(Guid id)
    {
        var file = await db.MediaFiles.SingleOrDefaultAsync(x =>
            x.Id == id && x.ContentType.StartsWith("image/")
        ) ?? throw new CatalogException("Portada no encontrada.", 404);
        if (
            !await db.ProductVersions.AnyAsync(v =>
                v.CoverMediaId == id
                && db.Products.Any(p =>
                    p.Id == v.ProductId
                    && p.Status == EduLearning.Domain.Catalog.PublicationStatus.Published
                )
                && v.Number
                    == db.ProductVersions.Where(x => x.ProductId == v.ProductId).Max(x => x.Number)
            )
        )
            return NotFound();
        Response.Headers.XContentTypeOptions = "nosniff";
        return File(await storage.OpenAsync(file, HttpContext.RequestAborted), file.ContentType);
    }
}
