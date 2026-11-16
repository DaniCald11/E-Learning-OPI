using System.ComponentModel.DataAnnotations;
using EduLearning.Domain.Catalog;

namespace EduLearning.Application.Catalog;

public sealed record CategoryInput(
    [Required, MaxLength(100)] string Name,
    [Required, RegularExpression("^[a-z0-9]+(?:-[a-z0-9]+)*$")] string Slug
);

public sealed record QuizOption(Guid Id, string Text, bool IsCorrect);

public sealed record QuizQuestion(Guid Id, string Prompt, decimal Points, QuizOption[] Options);

public sealed record CourseQuiz(Guid Id, string Title, QuizQuestion[] Questions);

public sealed record CourseLesson(
    Guid Id,
    string Title,
    string Type,
    bool IsRequired,
    Guid[] MediaIds
);

public sealed record CourseModule(Guid Id, string Title, CourseLesson[] Lessons);

public sealed record CourseTopic(Guid Id, string Title, CourseModule[] Modules);

public sealed record CourseDraft(
    [Required, StringLength(200, MinimumLength = 2)] string Title,
    [Required, RegularExpression("^[a-z0-9]+(?:-[a-z0-9]+)*$"), MaxLength(200)] string Slug,
    [MaxLength(10000)] string Description,
    CourseTopic[] Topics,
    CourseQuiz? Quiz,
    string? RowVersion
);

public sealed record CourseView(
    Guid Id,
    CourseDraft Draft,
    PublicationStatus Status,
    int PublishedVersion,
    bool HasUnpublishedChanges,
    string[] WorkshopIssues
);

public sealed record ProductCourseInput(Guid CourseId, int Position, bool IsRequired);

public sealed record ProductDraft(
    [Required, StringLength(200, MinimumLength = 2)] string Title,
    [Required, RegularExpression("^[a-z0-9]+(?:-[a-z0-9]+)*$"), MaxLength(200)] string Slug,
    [Required, MaxLength(500)] string Summary,
    [MaxLength(20000)] string Description,
    ProductType Type,
    Guid CategoryId,
    [Range(typeof(decimal), "0.01", "999999999.99")] decimal Price,
    string Currency,
    Guid? CoverMediaId,
    ProductCourseInput[] Courses,
    string? RowVersion
);

public sealed record ProductView(
    Guid Id,
    ProductDraft Draft,
    PublicationStatus Status,
    int PublishedVersion
);

public sealed record PublishedCourse(
    Guid CourseId,
    Guid CourseVersionId,
    int Version,
    string Title,
    string Description,
    int Position,
    bool IsRequired,
    object Outline
);

public sealed record PublishedProduct(
    Guid Id,
    Guid ProductVersionId,
    int Version,
    string Title,
    string Slug,
    string Summary,
    string Description,
    ProductType Type,
    Guid CategoryId,
    string Category,
    decimal Price,
    string Currency,
    Guid? CoverMediaId,
    PublishedCourse[] Courses
);

public sealed record Page<T>(T[] Items, int Total, int PageNumber, int PageSize);

public sealed class CatalogException(string message, int status = 400) : Exception(message)
{
    public int Status { get; } = status;
}

public interface ICatalogService
{
    Task<Category[]> CategoriesAsync(bool admin = false);
    Task<Category> CreateCategoryAsync(CategoryInput input);
    Task<CourseView[]> CoursesAsync();
    Task<CourseView> CourseAsync(Guid id);
    Task<CourseView> SaveCourseAsync(Guid? id, CourseDraft input);
    Task<CourseView> PublishCourseAsync(Guid id);
    Task<CourseView> ArchiveCourseAsync(Guid id);
    Task<ProductView[]> ProductsAsync();
    Task<ProductView> ProductAsync(Guid id);
    Task<ProductView> SaveProductAsync(Guid? id, ProductDraft input);
    Task<ProductView> PublishProductAsync(Guid id);
    Task<ProductView> UnpublishProductAsync(Guid id);
    Task<ProductView> DuplicateProductAsync(Guid id);
    Task<Page<PublishedProduct>> CatalogAsync(
        string? search,
        ProductType? type,
        Guid? category,
        string? sort,
        int page,
        int pageSize
    );
    Task<PublishedProduct> DetailAsync(string slug);
    Task<MediaFile[]> MediaAsync();
    Task<MediaFile> AddMediaAsync(MediaFile file);
}
