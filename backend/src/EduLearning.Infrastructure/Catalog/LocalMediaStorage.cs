using EduLearning.Application.Catalog;
using EduLearning.Domain.Catalog;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace EduLearning.Infrastructure.Catalog;

public sealed class LocalMediaStorage(IConfiguration configuration, IHostEnvironment environment)
{
    private string Root
    {
        get
        {
            if (!environment.IsDevelopment())
                throw new CatalogException(
                    "Configura el almacenamiento privado de producción antes de subir medios.",
                    503
                );
            var root = Path.GetFullPath(
                configuration["Media:Path"]
                    ?? Path.Combine(configuration["DataProtection:Path"]!, "..", "media")
            );
            Directory.CreateDirectory(root);
            if (!OperatingSystem.IsWindows())
                File.SetUnixFileMode(
                    root,
                    UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute
                );
            return root;
        }
    }

    public async Task<MediaFile> SaveAsync(
        Stream source,
        string original,
        long size,
        string contentType,
        string? folder,
        CancellationToken cancellationToken
    )
    {
        if (size <= 0 || size > 100 * 1024 * 1024)
            throw new CatalogException("El archivo debe pesar entre 1 byte y 100 MB.");
        var header = new byte[16];
        var count = await source.ReadAtLeastAsync(
            header,
            Math.Min((int)Math.Min(size, 16), 16),
            false,
            cancellationToken
        );
        var detected = ValidateHeader(header, count, contentType);
        var name = Path.GetFileName(original);
        if (string.IsNullOrWhiteSpace(name) || name.Length > 255 || folder?.Length > 100)
            throw new CatalogException("Revisa el nombre o la carpeta del archivo.");
        var id = Guid.NewGuid();
        var key = id.ToString("N");
        var path = Path.Combine(Root, key);
        try
        {
            var options = new FileStreamOptions
            {
                Mode = FileMode.CreateNew,
                Access = FileAccess.Write,
                Options = FileOptions.Asynchronous,
            };
            if (!OperatingSystem.IsWindows())
                options.UnixCreateMode = UnixFileMode.UserRead | UnixFileMode.UserWrite;
            await using var destination = new FileStream(path, options);
            await destination.WriteAsync(header.AsMemory(0, count), cancellationToken);
            var buffer = new byte[81920];
            long total = count;
            int read;
            while ((read = await source.ReadAsync(buffer, cancellationToken)) > 0)
            {
                total += read;
                if (total > size || total > 100 * 1024 * 1024)
                    throw new CatalogException("Archivo demasiado grande.");
                await destination.WriteAsync(buffer.AsMemory(0, read), cancellationToken);
            }
            if (total != size)
                throw new CatalogException("La carga está incompleta.");
            return new MediaFile
            {
                Id = id,
                StorageKey = key,
                OriginalFileName = name,
                ContentType = detected,
                SizeBytes = total,
                Folder = folder?.Trim() ?? "",
            };
        }
        catch
        {
            if (File.Exists(path))
                File.Delete(path);
            throw;
        }
    }

    public static string ValidateHeader(byte[] header, int count, string contentType)
    {
        string? detected =
            count >= 5 && header.AsSpan(0, 5).SequenceEqual("%PDF-"u8) ? "application/pdf"
            : count >= 8
            && header.AsSpan(0, 8).SequenceEqual(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 })
                ? "image/png"
            : count >= 3 && header[0] == 255 && header[1] == 216 && header[2] == 255 ? "image/jpeg"
            : count >= 12 && header.AsSpan(4, 4).SequenceEqual("ftyp"u8) ? "video/mp4"
            : count >= 4 && header.AsSpan(0, 4).SequenceEqual(new byte[] { 26, 69, 223, 163 })
                ? "video/webm"
            : null;
        if (detected is null || detected != contentType)
            throw new CatalogException(
                "El tipo del archivo no coincide con su contenido. Se permiten PDF, PNG, JPEG, MP4 y WebM."
            );
        return detected;
    }

    public Stream Open(MediaFile file)
    {
        if (file.StorageKey != file.Id.ToString("N"))
            throw new CatalogException("Referencia de medio inválida.", 404);
        var path = Path.Combine(Root, file.StorageKey);
        if (!File.Exists(path))
            throw new CatalogException("Archivo no disponible.", 404);
        return File.OpenRead(path);
    }

    public void Delete(MediaFile file)
    {
        var path = Path.Combine(Root, file.Id.ToString("N"));
        if (File.Exists(path))
            File.Delete(path);
    }
}
