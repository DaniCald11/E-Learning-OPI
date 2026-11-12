using System.Text.Json;
using EduLearning.Application.Auth;
using Microsoft.Extensions.Configuration;
namespace EduLearning.Infrastructure.Email;
// Private file sink, never exposed through an HTTP endpoint or logs.
public sealed class DevelopmentEmail(IConfiguration configuration) : ITransactionalEmail
{
    public async Task SendAsync(string recipient, string subject, string body)
    {
        var directory = Path.GetFullPath(configuration["Email:OutboxPath"] ?? ".data/mail");
        Directory.CreateDirectory(directory);
        if (!OperatingSystem.IsWindows()) File.SetUnixFileMode(directory, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
        var path = Path.Combine(directory, $"{Guid.NewGuid():N}.json");
        var options = new FileStreamOptions { Mode = FileMode.CreateNew, Access = FileAccess.Write };
        if (!OperatingSystem.IsWindows()) options.UnixCreateMode = UnixFileMode.UserRead | UnixFileMode.UserWrite;
        await using var stream = new FileStream(path, options);
        await JsonSerializer.SerializeAsync(stream, new { recipient, subject, body });
    }
}
