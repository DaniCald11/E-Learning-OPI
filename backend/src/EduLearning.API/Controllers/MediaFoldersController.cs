using System.ComponentModel.DataAnnotations;
using System.Data;
using EduLearning.Application.Catalog;
using EduLearning.Domain.Catalog;
using EduLearning.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduLearning.API.Controllers;

public sealed record FolderRequest([Required, MaxLength(100)] string Name);

public sealed record MoveMediaRequest([MaxLength(100)] string? Folder);

[ApiController, Route("api/v1/admin/media-folders"), Authorize(Policy = "Admin")]
public sealed class MediaFoldersController(ApplicationDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List() =>
        Ok(await db.MediaFolders.AsNoTracking().OrderBy(x => x.Name).ToArrayAsync());

    [HttpPost]
    public async Task<IActionResult> Create(FolderRequest input)
    {
        var name = Normalize(input.Name);
        if (name.Length == 0)
            throw new CatalogException("Escribe el nombre de la carpeta.");
        var folder = new MediaFolder { Id = Guid.NewGuid(), Name = name };
        db.Add(folder);
        await db.SaveChangesAsync();
        return Ok(folder);
    }

    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Rename(Guid id, FolderRequest input)
    {
        var name = Normalize(input.Name);
        if (name.Length == 0)
            throw new CatalogException("Escribe el nombre de la carpeta.");
        await using var transaction = await db.Database.BeginTransactionAsync(
            IsolationLevel.Serializable
        );
        var folder = await db.MediaFolders.SingleOrDefaultAsync(x => x.Id == id)
            ?? throw new CatalogException("La carpeta ya no existe.", 404);
        if (await db.MediaFolders.AnyAsync(x => x.Id != id && x.Name == name))
            throw new CatalogException("Ya existe una carpeta con ese nombre.", 409);
        await db
            .MediaFiles.Where(x => x.Kind == "Library" && x.Folder == folder.Name)
            .ExecuteUpdateAsync(update => update.SetProperty(x => x.Folder, name));
        folder.Name = name;
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        return Ok(folder);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(
            IsolationLevel.Serializable
        );
        var folder = await db.MediaFolders.SingleOrDefaultAsync(x => x.Id == id)
            ?? throw new CatalogException("La carpeta ya no existe.", 404);
        await db
            .MediaFiles.Where(x => x.Kind == "Library" && x.Folder == folder.Name)
            .ExecuteUpdateAsync(update => update.SetProperty(x => x.Folder, ""));
        db.MediaFolders.Remove(folder);
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        return NoContent();
    }

    private static string Normalize(string? input)
    {
        var name = input?.Trim() ?? "";
        if (
            name.Length > 100
            || name is "." or ".."
            || name.Any(c => char.IsControl(c) || c == '/' || c == '\\')
        )
            throw new CatalogException(
                "Usa un nombre de carpeta de hasta 100 caracteres, sin barras."
            );
        return name;
    }

    internal static async Task<MediaFolder?> FindAsync(ApplicationDbContext db, string? input)
    {
        var name = Normalize(input);
        if (name.Length == 0)
            return null;
        return await db.MediaFolders.AsNoTracking().SingleOrDefaultAsync(x => x.Name == name)
            ?? throw new CatalogException("Crea primero la carpeta en la Biblioteca.");
    }

    internal static async Task<string> ResolveAsync(ApplicationDbContext db, string? input) =>
        (await FindAsync(db, input))?.Name ?? "";
}
