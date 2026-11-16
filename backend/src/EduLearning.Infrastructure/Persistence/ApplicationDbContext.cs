using EduLearning.Domain.Catalog;
using EduLearning.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace EduLearning.Infrastructure.Persistence;

public sealed class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>(options)
{
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Course> Courses => Set<Course>();
    public DbSet<CourseVersion> CourseVersions => Set<CourseVersion>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductCourse> ProductCourses => Set<ProductCourse>();
    public DbSet<ProductVersion> ProductVersions => Set<ProductVersion>();
    public DbSet<ProductVersionCourse> ProductVersionCourses => Set<ProductVersionCourse>();
    public DbSet<MediaFolder> MediaFolders => Set<MediaFolder>();
    public DbSet<MediaFile> MediaFiles => Set<MediaFile>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.Entity<Category>().Property(x => x.Name).HasMaxLength(100);
        builder.Entity<Category>().Property(x => x.Slug).HasMaxLength(200);
        builder.Entity<Category>().HasIndex(x => x.Slug).IsUnique();
        builder.Entity<Course>(e =>
        {
            e.Property(x => x.Title).HasMaxLength(200);
            e.Property(x => x.Slug).HasMaxLength(200);
            e.HasIndex(x => x.Slug).IsUnique();
            e.Property(x => x.RowVersion).IsRowVersion();
            e.HasMany(x => x.Versions)
                .WithOne()
                .HasForeignKey(x => x.CourseId)
                .OnDelete(DeleteBehavior.Restrict);
        });
        builder.Entity<CourseVersion>().HasIndex(x => new { x.CourseId, x.Number }).IsUnique();
        builder.Entity<Product>(e =>
        {
            e.Property(x => x.Title).HasMaxLength(200);
            e.Property(x => x.Slug).HasMaxLength(200);
            e.HasIndex(x => x.Slug).IsUnique();
            e.Property(x => x.Price).HasPrecision(18, 2);
            e.Property(x => x.Currency).HasMaxLength(3);
            e.Property(x => x.RowVersion).IsRowVersion();
            e.HasMany(x => x.Courses).WithOne().HasForeignKey(x => x.ProductId);
            e.HasMany(x => x.Versions)
                .WithOne()
                .HasForeignKey(x => x.ProductId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasOne<Category>()
                .WithMany()
                .HasForeignKey(x => x.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasOne<MediaFile>()
                .WithMany()
                .HasForeignKey(x => x.CoverMediaId)
                .OnDelete(DeleteBehavior.Restrict);
        });
        builder.Entity<ProductCourse>(e =>
        {
            e.HasKey(x => new { x.ProductId, x.CourseId });
            e.HasOne<Course>()
                .WithMany()
                .HasForeignKey(x => x.CourseId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => new { x.ProductId, x.Position }).IsUnique();
        });
        builder.Entity<ProductVersion>().Property(x => x.Price).HasPrecision(18, 2);
        builder.Entity<ProductVersion>().Property(x => x.Title).HasMaxLength(200);
        builder.Entity<ProductVersion>().Property(x => x.Slug).HasMaxLength(200);
        builder.Entity<ProductVersion>().Property(x => x.Summary).HasMaxLength(500);
        builder.Entity<ProductVersion>().HasIndex(x => new { x.Slug, x.Number });
        builder.Entity<ProductVersion>().HasIndex(x => new { x.ProductId, x.Number }).IsUnique();
        builder
            .Entity<ProductVersion>()
            .HasMany(x => x.Courses)
            .WithOne()
            .HasForeignKey(x => x.ProductVersionId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.Entity<ProductVersionCourse>(e =>
        {
            e.HasKey(x => new { x.ProductVersionId, x.CourseVersionId });
            e.HasOne<CourseVersion>()
                .WithMany()
                .HasForeignKey(x => x.CourseVersionId)
                .OnDelete(DeleteBehavior.Restrict);
        });
        builder.Entity<MediaFolder>().Property(x => x.Name).HasMaxLength(100);
        builder.Entity<MediaFolder>().HasIndex(x => x.Name).IsUnique();
        builder.Entity<MediaFile>(e =>
        {
            e.Property(x => x.OriginalFileName).HasMaxLength(255);
            e.Property(x => x.StorageKey).HasMaxLength(500);
            e.Property(x => x.Folder).HasMaxLength(100);
        });

        builder.Entity<ApplicationUser>(user =>
        {
            user.Property(x => x.Bio).HasMaxLength(500);
            user.HasOne<MediaFile>()
                .WithMany()
                .HasForeignKey(x => x.AvatarMediaId)
                .OnDelete(DeleteBehavior.Restrict);
            user.Property(x => x.FullName).HasMaxLength(200).IsRequired();
            user.HasIndex(x => x.NormalizedEmail)
                .IsUnique()
                .HasFilter("[NormalizedEmail] IS NOT NULL");
            user.HasIndex(x => x.AdminSlot).IsUnique().HasFilter("[AdminSlot] IS NOT NULL");
            user.ToTable("AspNetUsers", table =>
            {
                table.HasCheckConstraint(
                    "CK_User_AdminSlot",
                    "[AdminSlot] IS NULL OR [AdminSlot] = 1"
                );
                table.HasTrigger("TR_Users_AdminSlot");
            });
        });
        builder
            .Entity<IdentityUserRole<Guid>>()
            .ToTable("AspNetUserRoles", table => table.HasTrigger("TR_UserRoles_SingleAdmin"));
    }
}
