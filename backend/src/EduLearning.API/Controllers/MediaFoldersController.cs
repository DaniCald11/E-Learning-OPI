using System.ComponentModel.DataAnnotations;
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

    internal static async Task<string> ResolveAsync(ApplicationDbContext db, string? input)
    {
        var name = Normalize(input);
        if (name.Length == 0)
            return "";
        return await db
            .MediaFolders.Where(x => x.Name == name)
            .Select(x => x.Name)
            .SingleOrDefaultAsync()
            ?? throw new CatalogException("Crea primero la carpeta en la Biblioteca.");
    }
}
