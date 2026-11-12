using EduLearning.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
namespace EduLearning.Infrastructure.Persistence;

public sealed class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>(options)
{
    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.Entity<ApplicationUser>(user =>
        {
            user.Property(x => x.FullName).HasMaxLength(200).IsRequired();
            user.HasIndex(x => x.NormalizedEmail).IsUnique().HasFilter("[NormalizedEmail] IS NOT NULL");
            user.HasIndex(x => x.AdminSlot).IsUnique().HasFilter("[AdminSlot] IS NOT NULL");
            user.ToTable("AspNetUsers", table => { table.HasCheckConstraint("CK_User_AdminSlot", "[AdminSlot] IS NULL OR [AdminSlot] = 1"); table.HasTrigger("TR_Users_AdminSlot"); });
        });
        builder.Entity<IdentityUserRole<Guid>>().ToTable("AspNetUserRoles", table => table.HasTrigger("TR_UserRoles_SingleAdmin"));
    }
}
