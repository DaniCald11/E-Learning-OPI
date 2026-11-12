using System.Data;
using EduLearning.Domain.Identity;
using EduLearning.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
namespace EduLearning.Infrastructure.Identity;

public sealed class DatabaseInitializer(ApplicationDbContext db, UserManager<ApplicationUser> users,
    RoleManager<IdentityRole<Guid>> roles, IConfiguration configuration)
{
    private static void Ensure(IdentityResult result)
    {
        if (!result.Succeeded) throw new InvalidOperationException("No se pudo aprovisionar la identidad: " + string.Join(",", result.Errors.Select(e => e.Code)));
    }
    public async Task InitializeAsync()
    {
        // Serialize bootstrap across processes on this database, including role creation.
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        await db.Database.ExecuteSqlRawAsync("DECLARE @result int; EXEC @result = sp_getapplock @Resource = 'EduLearning.IdentityBootstrap', @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 30000; IF @result < 0 THROW 51000, 'Identity bootstrap lock failed', 1;");
        foreach (var role in new[] { UserRoles.Admin, UserRoles.Student })
            if (!await roles.RoleExistsAsync(role)) Ensure(await roles.CreateAsync(new IdentityRole<Guid>(role)));
        var administrator = await db.Users.SingleOrDefaultAsync(x => x.AdminSlot == 1);
        var adminRole = await roles.FindByNameAsync(UserRoles.Admin);
        var unauthorizedAdmin = await db.UserRoles.AnyAsync(x => x.RoleId == adminRole!.Id && (administrator == null || x.UserId != administrator.Id));
        if (unauthorizedAdmin) throw new InvalidOperationException("Existe una asignación administrativa fuera del administrador autorizado.");
        if (administrator is null)
        {
            var address = configuration["BootstrapAdmin:Email"];
            var password = configuration["BootstrapAdmin:Password"];
            if (string.IsNullOrWhiteSpace(address) || string.IsNullOrWhiteSpace(password))
                throw new InvalidOperationException("Se necesita BootstrapAdmin:Email y BootstrapAdmin:Password para el primer arranque.");
            if (await users.FindByEmailAsync(address) is not null)
                throw new InvalidOperationException("El administrador inicial requiere una identidad nueva; no se eleva una cuenta de alumno.");
            administrator = new ApplicationUser
            {
                Id = Guid.NewGuid(),
                UserName = address,
                Email = address,
                FullName = configuration["BootstrapAdmin:FullName"] ?? "Administrador",
                EmailConfirmed = true,
                AdminSlot = 1
            };
            Ensure(await users.CreateAsync(administrator, password));
            Ensure(await users.AddToRoleAsync(administrator, UserRoles.Admin));
        }
        if (!administrator.IsActive || !await users.IsInRoleAsync(administrator, UserRoles.Admin))
            throw new InvalidOperationException("El administrador único no está operativo. Se requiere recuperación administrativa.");
        await transaction.CommitAsync();
    }
}
