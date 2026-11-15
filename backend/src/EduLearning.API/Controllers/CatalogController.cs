using EduLearning.Application.Catalog;
using EduLearning.Domain.Catalog;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EduLearning.API.Controllers;

[ApiController, Route("api/v1")]
public sealed class CatalogController(ICatalogService catalog) : ControllerBase
{
    [HttpGet("categories")]
    public async Task<IActionResult> Categories() => Ok(await catalog.CategoriesAsync());

    [HttpGet("products")]
    public async Task<IActionResult> List(
        string? search,
        ProductType? type,
        Guid? category,
        string? sort,
        int page = 1,
        int pageSize = 12
    ) => Ok(await catalog.CatalogAsync(search, type, category, sort, page, pageSize));

    [HttpGet("products/{slug}")]
    public async Task<IActionResult> Detail(string slug) => Ok(await catalog.DetailAsync(slug));
}

[ApiController, Route("api/v1/admin"), Authorize(Policy = "Admin")]
public sealed class CatalogAdminController(ICatalogService catalog) : ControllerBase
{
    [HttpGet("categories")]
    public async Task<IActionResult> Categories() => Ok(await catalog.CategoriesAsync(true));

    [HttpPost("categories")]
    public async Task<IActionResult> Category(CategoryInput input) =>
        Ok(await catalog.CreateCategoryAsync(input));

    [HttpGet("courses")]
    public async Task<IActionResult> Courses() => Ok(await catalog.CoursesAsync());

    [HttpGet("courses/{id:guid}")]
    public async Task<IActionResult> Course(Guid id) => Ok(await catalog.CourseAsync(id));

    [HttpPost("courses")]
    public async Task<IActionResult> CreateCourse(CourseDraft input) =>
        Ok(await catalog.SaveCourseAsync(null, input));

    [HttpPut("courses/{id:guid}")]
    public async Task<IActionResult> SaveCourse(Guid id, CourseDraft input) =>
        Ok(await catalog.SaveCourseAsync(id, input));

    [HttpPost("courses/{id:guid}/publish")]
    public async Task<IActionResult> PublishCourse(Guid id) =>
        Ok(await catalog.PublishCourseAsync(id));

    [HttpPost("courses/{id:guid}/archive")]
    public async Task<IActionResult> ArchiveCourse(Guid id) =>
        Ok(await catalog.ArchiveCourseAsync(id));

    [HttpGet("products")]
    public async Task<IActionResult> Products() => Ok(await catalog.ProductsAsync());

    [HttpGet("products/{id:guid}")]
    public async Task<IActionResult> Product(Guid id) => Ok(await catalog.ProductAsync(id));

    [HttpPost("products")]
    public async Task<IActionResult> CreateProduct(ProductDraft input) =>
        Ok(await catalog.SaveProductAsync(null, input));

    [HttpPut("products/{id:guid}")]
    public async Task<IActionResult> SaveProduct(Guid id, ProductDraft input) =>
        Ok(await catalog.SaveProductAsync(id, input));

    [HttpPost("products/{id:guid}/publish")]
    public async Task<IActionResult> PublishProduct(Guid id) =>
        Ok(await catalog.PublishProductAsync(id));

    [HttpPost("products/{id:guid}/unpublish")]
    public async Task<IActionResult> Unpublish(Guid id) =>
        Ok(await catalog.UnpublishProductAsync(id));

    [HttpPost("products/{id:guid}/duplicate")]
    public async Task<IActionResult> Duplicate(Guid id) =>
        Ok(await catalog.DuplicateProductAsync(id));
}
