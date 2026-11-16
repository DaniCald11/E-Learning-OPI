using System.Data;
using System.Text.Json;
using System.Text.Json.Serialization;
using EduLearning.Application.Catalog;
using EduLearning.Domain.Catalog;
using EduLearning.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace EduLearning.Infrastructure.Catalog;

public sealed class CatalogService(ApplicationDbContext db) : ICatalogService
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private static CourseDraft Read(Course course) =>
        JsonSerializer.Deserialize<CourseDraft>(course.DraftJson, Json)! with
        {
            RowVersion = Convert.ToBase64String(course.RowVersion),
        };

    private static CourseView View(Course c) =>
        new(c.Id, Read(c), c.Status, c.Versions.Count == 0 ? 0 : c.Versions.Max(v => v.Number));

    private static ProductDraft Read(Product p) =>
        new(
            p.Title,
            p.Slug,
            p.Summary,
            p.Description,
            p.Type,
            p.CategoryId,
            p.Price,
            p.Currency,
            p.CoverMediaId,
            p.Courses.OrderBy(x => x.Position)
                .Select(x => new ProductCourseInput(x.CourseId, x.Position, x.IsRequired))
                .ToArray(),
            Convert.ToBase64String(p.RowVersion)
        );

    private static ProductView View(Product p) =>
        new(p.Id, Read(p), p.Status, p.Versions.Count == 0 ? 0 : p.Versions.Max(v => v.Number));

    private static void Version(byte[] actual, string? supplied)
    {
        if (supplied is null || Convert.ToBase64String(actual) != supplied)
            throw new CatalogException("Este borrador cambió. Recarga antes de guardar.", 409);
    }

    private async Task LockAsync() =>
        await db.Database.ExecuteSqlRawAsync(
            "DECLARE @r int; EXEC @r=sp_getapplock @Resource='EduLearning.CatalogPublication', @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=15000; IF @r<0 THROW 51020, 'Catalog publication lock unavailable', 1;"
        );

    public async Task<Category[]> CategoriesAsync(bool admin = false) =>
        await db.Categories.Where(c => admin || c.IsActive).OrderBy(c => c.Name).ToArrayAsync();

    public async Task<Category> CreateCategoryAsync(CategoryInput input)
    {
        if (string.IsNullOrWhiteSpace(input.Name))
            throw new CatalogException("Escribe el nombre de la categoría.");
        var c = new Category
        {
            Id = Guid.NewGuid(),
            Name = input.Name.Trim(),
            Slug = input.Slug,
        };
        db.Add(c);
        await db.SaveChangesAsync();
        return c;
    }

    public async Task<CourseView[]> CoursesAsync() =>
        (
            await db
                .Courses.Include(x => x.Versions)
                .OrderByDescending(x => x.UpdatedAtUtc)
                .ToArrayAsync()
        )
            .Select(View)
            .ToArray();

    private async Task<Course> FindCourse(Guid id) =>
        await db.Courses.Include(x => x.Versions).SingleOrDefaultAsync(x => x.Id == id)
        ?? throw new CatalogException("Curso no encontrado.", 404);

    public async Task<CourseView> CourseAsync(Guid id) => View(await FindCourse(id));

    private async Task ValidateMedia(CourseDraft input, bool publishing)
    {
        var lessons = input.Topics.SelectMany(x => x.Modules).SelectMany(x => x.Lessons).ToArray();
        var ids = lessons.SelectMany(x => x.MediaIds).Distinct().ToArray();
        var media = await db
            .MediaFiles.Where(x => ids.Contains(x.Id) && x.Kind == "Library")
            .ToArrayAsync();
        if (publishing && media.Any(x => x.ProcessingStatus != "Ready"))
            throw new CatalogException("Espera a que termine el procesamiento de los materiales.");
        if (media.Length != ids.Length)
            throw new CatalogException("Un material no existe en la biblioteca.");
        if (
            publishing
            && lessons.Any(l =>
                l.Type is "Video" or "Mixed"
                && !media.Any(m => l.MediaIds.Contains(m.Id) && m.ContentType.StartsWith("video/"))
            )
        )
            throw new CatalogException("Cada lección de video debe tener un video válido.");
        if (
            publishing
            && lessons.Any(l =>
                l.Type == "Document"
                && !media.Any(m => l.MediaIds.Contains(m.Id) && m.ContentType == "application/pdf")
            )
        )
            throw new CatalogException("Cada lección de documento debe tener un PDF.");
    }

    public async Task<CourseView> SaveCourseAsync(Guid? id, CourseDraft input)
    {
        CatalogRules.ValidateCourse(input);
        await ValidateMedia(input, false);
        var c = id.HasValue ? await FindCourse(id.Value) : new Course { Id = Guid.NewGuid() };
        if (id.HasValue)
            Version(c.RowVersion, input.RowVersion);
        else
            db.Add(c);
        c.Title = input.Title.Trim();
        c.Slug = input.Slug;
        c.Description = input.Description;
        c.DraftJson = JsonSerializer.Serialize(input with { RowVersion = null }, Json);
        c.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return View(c);
    }

    public async Task<CourseView> PublishCourseAsync(Guid id)
    {
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        await LockAsync();
        var c = await FindCourse(id);
        var draft = Read(c);
        CatalogRules.ValidateCourse(draft, true);
        await ValidateMedia(draft, true);
        var newVersion = new CourseVersion
        {
            Id = Guid.NewGuid(),
            CourseId = c.Id,
            Number = c.Versions.Count + 1,
            SnapshotJson = JsonSerializer.Serialize(draft with { RowVersion = null }, Json),
            PublishedAtUtc = DateTime.UtcNow,
        };
        c.Versions.Add(newVersion);
        db.Entry(newVersion).State = EntityState.Added;
        c.Status = PublicationStatus.Published;
        c.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        return View(c);
    }

    public async Task<CourseView> ArchiveCourseAsync(Guid id)
    {
        await using var tx = await db.Database.BeginTransactionAsync();
        await LockAsync();
        var c = await FindCourse(id);
        if (
            await db.ProductCourses.AnyAsync(x =>
                x.CourseId == id
                && db.Products.Any(p =>
                    p.Id == x.ProductId && p.Status == PublicationStatus.Published
                )
            )
        )
            throw new CatalogException(
                "Despublica los productos activos antes de archivar el curso. Sus versiones se conservan.",
                409
            );
        c.Status = PublicationStatus.Archived;
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        return View(c);
    }

    public async Task<ProductView[]> ProductsAsync() =>
        (
            await db
                .Products.Include(x => x.Courses)
                .Include(x => x.Versions)
                .OrderBy(x => x.Title)
                .ToArrayAsync()
        )
            .Select(View)
            .ToArray();

    private async Task<Product> FindProduct(Guid id) =>
        await db
            .Products.Include(x => x.Courses)
            .Include(x => x.Versions)
            .SingleOrDefaultAsync(x => x.Id == id)
        ?? throw new CatalogException("Producto no encontrado.", 404);

    public async Task<ProductView> ProductAsync(Guid id) => View(await FindProduct(id));

    public async Task<ProductView> SaveProductAsync(Guid? id, ProductDraft input)
    {
        CatalogRules.ValidateProduct(input);
        if (!await db.Categories.AnyAsync(x => x.Id == input.CategoryId && x.IsActive))
            throw new CatalogException("Selecciona una categoría activa.");
        if (
            await db.Courses.CountAsync(x => input.Courses.Select(c => c.CourseId).Contains(x.Id))
            != input.Courses.Length
        )
            throw new CatalogException("Un curso no existe.");
        if (
            input.CoverMediaId.HasValue
            && !await db.MediaFiles.AnyAsync(x =>
                x.Id == input.CoverMediaId
                && x.Kind == "Library"
                && x.ContentType.StartsWith("image/")
            )
        )
            throw new CatalogException("La portada debe ser una imagen de la biblioteca.");
        await using var tx = await db.Database.BeginTransactionAsync();
        await LockAsync();
        var p = id.HasValue ? await FindProduct(id.Value) : new Product { Id = Guid.NewGuid() };
        if (id.HasValue)
        {
            Version(p.RowVersion, input.RowVersion);
            db.Entry(p).Property(x => x.Title).IsModified = true;
        }
        else
            db.Add(p);
        // A published product's composition cannot be edited under the same version.
        // Its draft can change; public catalog always reads the last immutable snapshot.
        p.Title = input.Title.Trim();
        p.Slug = input.Slug;
        p.Summary = input.Summary;
        p.Description = input.Description;
        p.Type = input.Type;
        p.CategoryId = input.CategoryId;
        p.Price = input.Price;
        p.Currency = input.Currency;
        p.CoverMediaId = input.CoverMediaId;
        if (id.HasValue)
        {
            db.ProductCourses.RemoveRange(p.Courses);
            await db.SaveChangesAsync();
            p.Courses.Clear();
        }
        p.Courses = input
            .Courses.Select(x => new ProductCourse
            {
                ProductId = p.Id,
                CourseId = x.CourseId,
                Position = x.Position,
                IsRequired = x.IsRequired,
            })
            .ToList();
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        return View(p);
    }

    public async Task<ProductView> PublishProductAsync(Guid id)
    {
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        await LockAsync();
        var p = await FindProduct(id);
        var draft = Read(p);
        CatalogRules.ValidateProduct(draft);
        if (
            p.Courses.Count == 0
            || (p.Type == ProductType.IndividualCourse && p.Courses.Count != 1)
        )
            throw new CatalogException("Revisa la composición del producto.");
        var ids = p.Courses.Select(x => x.CourseId).ToArray();
        // Check immutable published compositions, never another product's mutable draft.
        var other = await db
            .Products.Where(x => x.Id != id && x.Status == PublicationStatus.Published)
            .Include(x => x.Versions)
            .ToArrayAsync();
        foreach (var o in other)
        {
            var snapshot = JsonSerializer.Deserialize<PublishedProduct>(
                o.Versions.OrderByDescending(v => v.Number).First().SnapshotJson,
                Json
            )!;
            if (snapshot.Slug == p.Slug)
                throw new CatalogException("Ese slug pertenece a otra formación publicada.", 409);
            if (
                (
                    (
                        p.Type == ProductType.Workshop
                        && snapshot.Type == ProductType.IndividualCourse
                    )
                    || (
                        p.Type == ProductType.IndividualCourse
                        && snapshot.Type == ProductType.Workshop
                    )
                ) && snapshot.Courses.Any(x => ids.Contains(x.CourseId))
            )
                throw new CatalogException(
                    "Un curso de taller no puede venderse individualmente. Revisa los productos publicados.",
                    409
                );
        }
        var courses = await db
            .Courses.Where(x => ids.Contains(x.Id))
            .Include(x => x.Versions)
            .ToArrayAsync();
        var published = new List<PublishedCourse>();
        foreach (var membership in p.Courses.OrderBy(x => x.Position))
        {
            var course = courses.Single(x => x.Id == membership.CourseId);
            var version = course.Versions.OrderByDescending(x => x.Number).FirstOrDefault();
            if (course.Status != PublicationStatus.Published || version is null)
                throw new CatalogException("Todos los cursos deben tener una versión publicada.");
            var content = JsonSerializer.Deserialize<CourseDraft>(version.SnapshotJson, Json)!;
            CatalogRules.ValidateCourse(content, true, p.Type == ProductType.Workshop);
            var outline = content.Topics.Select(t => new
            {
                t.Id,
                t.Title,
                Modules = t.Modules.Select(m => new
                {
                    m.Id,
                    m.Title,
                    Lessons = m.Lessons.Select(l => new
                    {
                        l.Id,
                        l.Title,
                        l.Type,
                        l.IsRequired,
                    }),
                }),
            });
            published.Add(
                new(
                    course.Id,
                    version.Id,
                    version.Number,
                    content.Title,
                    content.Description,
                    membership.Position,
                    membership.IsRequired,
                    outline
                )
            );
        }
        var category = await db.Categories.SingleAsync(x => x.Id == p.CategoryId);
        if (!category.IsActive)
            throw new CatalogException("La categoría no está activa.");
        var pv = new ProductVersion
        {
            Id = Guid.NewGuid(),
            ProductId = p.Id,
            Number = p.Versions.Count + 1,
            PublishedAtUtc = DateTime.UtcNow,
            Title = p.Title,
            Slug = p.Slug,
            Summary = p.Summary,
            Type = p.Type,
            CategoryId = p.CategoryId,
            Price = p.Price,
            CoverMediaId = p.CoverMediaId,
        };
        var result = new PublishedProduct(
            p.Id,
            pv.Id,
            pv.Number,
            p.Title,
            p.Slug,
            p.Summary,
            p.Description,
            p.Type,
            p.CategoryId,
            category.Name,
            p.Price,
            p.Currency,
            p.CoverMediaId,
            [.. published]
        );
        pv.SnapshotJson = JsonSerializer.Serialize(result, Json);
        pv.Courses = published
            .Select(x => new ProductVersionCourse
            {
                ProductVersionId = pv.Id,
                CourseVersionId = x.CourseVersionId,
                Position = x.Position,
                IsRequired = x.IsRequired,
            })
            .ToList();
        p.Versions.Add(pv);
        db.Add(pv);
        p.Status = PublicationStatus.Published;
        db.Entry(p).Property(x => x.Status).IsModified = true;
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        return View(p);
    }

    public async Task<ProductView> UnpublishProductAsync(Guid id)
    {
        await using var tx = await db.Database.BeginTransactionAsync();
        await LockAsync();
        var p = await FindProduct(id);
        p.Status = PublicationStatus.Draft;
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        return View(p);
    }

    public async Task<ProductView> DuplicateProductAsync(Guid id)
    {
        var p = await FindProduct(id);
        var draft = Read(p) with
        {
            Title = p.Title[..Math.Min(p.Title.Length, 192)] + " (copia)",
            Slug = p.Slug[..Math.Min(p.Slug.Length, 190)] + "-" + Guid.NewGuid().ToString("N")[..8],
            RowVersion = null,
        };
        return await SaveProductAsync(null, draft);
    }

    private IQueryable<ProductVersion> Published() =>
        db
            .ProductVersions.AsNoTracking()
            .Where(v =>
                db.Products.Any(p => p.Id == v.ProductId && p.Status == PublicationStatus.Published)
                && v.Number
                    == db.ProductVersions.Where(x => x.ProductId == v.ProductId).Max(x => x.Number)
            );

    public async Task<Page<PublishedProduct>> CatalogAsync(
        string? search,
        ProductType? type,
        Guid? category,
        string? sort,
        int page,
        int pageSize
    )
    {
        if (page < 1 || pageSize < 1 || pageSize > 50)
            throw new CatalogException("Paginación inválida.");
        var query = Published();
        if (type is not null)
            query = query.Where(x => x.Type == type);
        if (category is not null)
            query = query.Where(x => x.CategoryId == category);
        if (!string.IsNullOrWhiteSpace(search))
        {
            if (search.Length > 200)
                throw new CatalogException("Búsqueda demasiado larga.");
            query = query.Where(x => x.Title.Contains(search) || x.Summary.Contains(search));
        }
        var count = await query.CountAsync();
        var ordered = sort switch
        {
            "price-asc" => query.OrderBy(x => x.Price),
            "price-desc" => query.OrderByDescending(x => x.Price),
            _ => query.OrderBy(x => x.Title),
        };
        var snapshots = await ordered
            .ThenBy(x => x.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => x.SnapshotJson)
            .ToArrayAsync();
        return new(
            snapshots.Select(x => JsonSerializer.Deserialize<PublishedProduct>(x, Json)!).ToArray(),
            count,
            page,
            pageSize
        );
    }

    public async Task<PublishedProduct> DetailAsync(string slug)
    {
        var snapshot = await Published()
            .Where(x => x.Slug == slug)
            .Select(x => x.SnapshotJson)
            .SingleOrDefaultAsync()
            ?? throw new CatalogException("Formación no encontrada.", 404);
        return JsonSerializer.Deserialize<PublishedProduct>(snapshot, Json)!;
    }

    public async Task<MediaFile[]> MediaAsync() =>
        await db
            .MediaFiles.Where(x => x.Kind == "Library")
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToArrayAsync();

    public async Task<MediaFile> AddMediaAsync(MediaFile file)
    {
        db.Add(file);
        await db.SaveChangesAsync();
        return file;
    }
}
