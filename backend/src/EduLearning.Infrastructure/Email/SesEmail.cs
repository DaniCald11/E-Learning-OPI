using Amazon.SimpleEmailV2;
using Amazon.SimpleEmailV2.Model;
using EduLearning.Application.Auth;
using Microsoft.Extensions.Configuration;
namespace EduLearning.Infrastructure.Email;

public sealed class SesEmail(IAmazonSimpleEmailServiceV2 client, IConfiguration configuration) : ITransactionalEmail
{
    public async Task SendAsync(string recipient, string subject, string body) =>
        await client.SendEmailAsync(new SendEmailRequest
        {
            FromEmailAddress = configuration["Email:From"],
            Destination = new Destination { ToAddresses = [recipient] },
            Content = new EmailContent
            {
                Simple = new Message
                {
                    Subject = new Content { Data = subject, Charset = "UTF-8" },
                    Body = new Body { Text = new Content { Data = body, Charset = "UTF-8" } }
                }
            }
        });
}
