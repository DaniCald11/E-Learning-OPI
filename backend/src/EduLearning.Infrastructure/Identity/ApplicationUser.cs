using Microsoft.AspNetCore.Identity;

namespace EduLearning.Infrastructure.Identity;

public sealed class ApplicationUser : IdentityUser<Guid>
{
    public string FullName { get; set; } = "";
    public string? Bio { get; set; }
    public Guid? AvatarMediaId { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;

    // Null for students; SQL unique filtered index permits only one admin slot.
    public int? AdminSlot { get; set; }
}
