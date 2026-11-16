namespace EduLearning.Domain.Catalog;

public enum ProductType
{
    IndividualCourse,
    Workshop,
    CertificationProgram,
}

public enum PublicationStatus
{
    Draft,
    Published,
    Archived,
}

public sealed class Category
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string Slug { get; set; } = "";
    public bool IsActive { get; set; } = true;
}

public sealed class Course
{
    public Guid Id { get; set; }
    public string Title { get; set; } = "";
    public string Slug { get; set; } = "";
    public string Description { get; set; } = "";
    public string DraftJson { get; set; } = "{}";
    public PublicationStatus Status { get; set; }
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    public byte[] RowVersion { get; set; } = [];
    public List<CourseVersion> Versions { get; set; } = [];
}

public sealed class CourseVersion
{
    public Guid Id { get; set; }
    public Guid CourseId { get; set; }
    public int Number { get; set; }
    public string SnapshotJson { get; set; } = "";
    public DateTime PublishedAtUtc { get; set; }
}

public sealed class Product
{
    public Guid Id { get; set; }
    public string Title { get; set; } = "";
    public string Slug { get; set; } = "";
    public string Summary { get; set; } = "";
    public string Description { get; set; } = "";
    public ProductType Type { get; set; }
    public Guid CategoryId { get; set; }
    public decimal Price { get; set; }
    public string Currency { get; set; } = "MXN";
    public Guid? CoverMediaId { get; set; }
    public PublicationStatus Status { get; set; }
    public byte[] RowVersion { get; set; } = [];
    public List<ProductCourse> Courses { get; set; } = [];
    public List<ProductVersion> Versions { get; set; } = [];
}

public sealed class ProductCourse
{
    public Guid ProductId { get; set; }
    public Guid CourseId { get; set; }
    public int Position { get; set; }
    public bool IsRequired { get; set; } = true;
}

public sealed class ProductVersion
{
    public string Title { get; set; } = "";
    public string Slug { get; set; } = "";
    public string Summary { get; set; } = "";
    public ProductType Type { get; set; }
    public Guid CategoryId { get; set; }
    public decimal Price { get; set; }
    public Guid? CoverMediaId { get; set; }
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public int Number { get; set; }
    public string SnapshotJson { get; set; } = "";
    public DateTime PublishedAtUtc { get; set; }
    public List<ProductVersionCourse> Courses { get; set; } = [];
}

public sealed class ProductVersionCourse
{
    public Guid ProductVersionId { get; set; }
    public Guid CourseVersionId { get; set; }
    public int Position { get; set; }
    public bool IsRequired { get; set; } = true;
}

public sealed class MediaFile
{
    public string Kind { get; set; } = "Library";
    public Guid? OwnerUserId { get; set; }
    public Guid Id { get; set; }
    public string OriginalFileName { get; set; } = "";
    public string ContentType { get; set; } = "";
    public string StorageKey { get; set; } = "";
    public string Provider { get; set; } = "Local";
    public string ProcessingStatus { get; set; } = "Ready";
    public long SizeBytes { get; set; }
    public string Folder { get; set; } = "";
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public sealed class MediaFolder
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
