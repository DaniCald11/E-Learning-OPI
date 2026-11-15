using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using EduLearning.Application.Catalog;
using EduLearning.Domain.Catalog;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace EduLearning.Infrastructure.Catalog;

public sealed class PrivateMediaStorage(
    LocalMediaStorage local,
    IConfiguration config,
    IHostEnvironment environment,
    IHttpClientFactory clients
) : IDisposable
{
    private AmazonS3Client? s3;
    private bool IsLocal =>
        environment.IsDevelopment() && config["Media:Provider"] is null or "Local";

    private string Required(string key) =>
        !string.IsNullOrWhiteSpace(config[key])
            ? config[key]!
            : throw new CatalogException(
                "Falta configurar el proveedor de medios en los ajustes seguros del entorno.",
                503
            );

    private AmazonS3Client R2 =>
        s3 ??= new AmazonS3Client(
            new BasicAWSCredentials(
                Required("Media:R2AccessKeyId"),
                Required("Media:R2SecretAccessKey")
            ),
            new AmazonS3Config
            {
                ServiceURL = "https://" + Required("Media:AccountId") + ".r2.cloudflarestorage.com",
                ForcePathStyle = true,
                AuthenticationRegion = "auto",
            }
        );

    public async Task<MediaFile> SaveAsync(
        Stream source,
        string name,
        long size,
        string contentType,
        string? folder,
        CancellationToken cancellationToken
    )
    {
        if (IsLocal)
            return await local.SaveAsync(
                source,
                name,
                size,
                contentType,
                folder,
                cancellationToken
            );
        if (config["Media:Provider"] != "Cloudflare")
            throw new CatalogException(
                "Configura el proveedor privado de medios antes de subir archivos.",
                503
            );
        if (size <= 0 || size > 100 * 1024 * 1024 || !source.CanSeek)
            throw new CatalogException("Carga inválida o superior a 100 MB.");
        var header = new byte[16];
        var count = await source.ReadAtLeastAsync(
            header,
            Math.Min((int)Math.Min(size, 16), 16),
            false,
            cancellationToken
        );
        LocalMediaStorage.ValidateHeader(header, count, contentType);
        source.Position = 0;
        name = Path.GetFileName(name);
        if (name.Length is 0 or > 255 || folder?.Length > 100)
            throw new CatalogException("Nombre de archivo o carpeta inválidos.");
        var file = new MediaFile
        {
            Id = Guid.NewGuid(),
            OriginalFileName = name,
            SizeBytes = size,
            ContentType = contentType,
            Folder = folder?.Trim() ?? "",
        };
        if (contentType.StartsWith("video/"))
        {
            using var request = new HttpRequestMessage(
                HttpMethod.Post,
                "https://api.cloudflare.com/client/v4/accounts/"
                    + Uri.EscapeDataString(Required("Media:AccountId"))
                    + "/stream"
            );
            request.Headers.Authorization = new AuthenticationHeaderValue(
                "Bearer",
                Required("Media:StreamApiToken")
            );
            using var multipart = new MultipartFormDataContent();
            var stream = new StreamContent(source);
            stream.Headers.ContentType = new MediaTypeHeaderValue(contentType);
            multipart.Add(stream, "file", name);
            multipart.Add(new StringContent("true"), "requireSignedURLs");
            request.Content = multipart;
            using var response = await clients
                .CreateClient("Cloudflare")
                .SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
                throw new CatalogException(
                    "El proveedor no pudo procesar el video. Revisa su configuración.",
                    502
                );
            using var data = JsonDocument.Parse(
                await response.Content.ReadAsStringAsync(cancellationToken)
            );
            if (
                !data.RootElement.TryGetProperty("result", out var result)
                || !result.TryGetProperty("uid", out var uid)
            )
                throw new CatalogException("Respuesta de video inesperada.", 502);
            file.Provider = "CloudflareStream";
            file.StorageKey = uid.GetString()!;
            if (!result.TryGetProperty("requireSignedURLs", out var signed) || !signed.GetBoolean())
            {
                await DeleteAsync(file);
                throw new CatalogException(
                    "El proveedor no confirmó la protección del video.",
                    502
                );
            }
            file.ProcessingStatus =
                result.TryGetProperty("readyToStream", out var ready) && ready.GetBoolean()
                    ? "Ready"
                    : "Processing";
        }
        else
        {
            file.Provider = "R2";
            file.StorageKey = file.Id.ToString("N");
            await R2.PutObjectAsync(
                new PutObjectRequest
                {
                    BucketName = Required("Media:R2Bucket"),
                    Key = file.StorageKey,
                    InputStream = source,
                    ContentType = contentType,
                    AutoCloseStream = false,
                },
                cancellationToken
            );
        }
        return file;
    }

    public async Task<Stream> OpenAsync(MediaFile file, CancellationToken cancellationToken)
    {
        if (file.Provider == "Local")
            return local.Open(file);
        if (file.Provider != "R2")
            throw new CatalogException(
                "El recurso debe reproducirse mediante streaming protegido.",
                400
            );
        var response = await R2.GetObjectAsync(
            Required("Media:R2Bucket"),
            file.StorageKey,
            cancellationToken
        );
        return response.ResponseStream;
    }

    public string PlaybackUrl(MediaFile file)
    {
        if (file.Provider != "CloudflareStream")
            throw new CatalogException("El medio no es un video de Stream.");
        using var rsa = RSA.Create();
        rsa.ImportFromPem(File.ReadAllText(Required("Media:StreamSigningKeyPath")));
        var key = Required("Media:StreamSigningKeyId");
        var header = WebEncoders.Base64UrlEncode(
            Encoding.UTF8.GetBytes(JsonSerializer.Serialize(new { alg = "RS256", kid = key }))
        );
        var payload = WebEncoders.Base64UrlEncode(
            Encoding.UTF8.GetBytes(
                JsonSerializer.Serialize(
                    new
                    {
                        sub = file.StorageKey,
                        kid = key,
                        exp = DateTimeOffset.UtcNow.AddMinutes(10).ToUnixTimeSeconds(),
                    }
                )
            )
        );
        var message = header + "." + payload;
        var signature = WebEncoders.Base64UrlEncode(
            rsa.SignData(
                Encoding.UTF8.GetBytes(message),
                HashAlgorithmName.SHA256,
                RSASignaturePadding.Pkcs1
            )
        );
        return "https://customer-"
            + Uri.EscapeDataString(Required("Media:StreamCustomerCode"))
            + ".cloudflarestream.com/"
            + message
            + "."
            + signature
            + "/iframe";
    }

    public async Task RefreshAsync(MediaFile file)
    {
        if (file.Provider != "CloudflareStream")
            return;
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            "https://api.cloudflare.com/client/v4/accounts/"
                + Uri.EscapeDataString(Required("Media:AccountId"))
                + "/stream/"
                + Uri.EscapeDataString(file.StorageKey)
        );
        request.Headers.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            Required("Media:StreamApiToken")
        );
        using var response = await clients.CreateClient("Cloudflare").SendAsync(request);
        if (!response.IsSuccessStatusCode)
            throw new CatalogException("No se pudo actualizar el procesamiento del video.", 502);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var result = document.RootElement.GetProperty("result");
        file.ProcessingStatus =
            result.GetProperty("requireSignedURLs").GetBoolean()
            && result.GetProperty("readyToStream").GetBoolean()
                ? "Ready"
                : "Processing";
    }

    public async Task DeleteAsync(MediaFile file)
    {
        if (file.Provider == "Local")
        {
            local.Delete(file);
            return;
        }
        if (file.Provider == "R2")
        {
            await R2.DeleteObjectAsync(Required("Media:R2Bucket"), file.StorageKey);
            return;
        }
        using var request = new HttpRequestMessage(
            HttpMethod.Delete,
            "https://api.cloudflare.com/client/v4/accounts/"
                + Uri.EscapeDataString(Required("Media:AccountId"))
                + "/stream/"
                + Uri.EscapeDataString(file.StorageKey)
        );
        request.Headers.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            Required("Media:StreamApiToken")
        );
        using var response = await clients.CreateClient("Cloudflare").SendAsync(request);
        response.EnsureSuccessStatusCode();
    }

    public void Dispose() => s3?.Dispose();
}
