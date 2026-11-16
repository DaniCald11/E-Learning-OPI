using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduLearning.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ProfileAndMediaFolders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Kind",
                table: "MediaFiles",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "Library");

            migrationBuilder.AddColumn<Guid>(
                name: "OwnerUserId",
                table: "MediaFiles",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "AvatarMediaId",
                table: "AspNetUsers",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Bio",
                table: "AspNetUsers",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "MediaFolders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MediaFolders", x => x.Id);
                });

            migrationBuilder.Sql("""
                INSERT INTO MediaFolders (Id, Name, CreatedAtUtc)
                SELECT NEWID(), existing.Name, SYSUTCDATETIME()
                FROM (SELECT DISTINCT LTRIM(RTRIM(Folder)) AS Name FROM MediaFiles WHERE LEN(LTRIM(RTRIM(Folder))) > 0) existing;
                UPDATE MediaFiles SET Folder = LTRIM(RTRIM(Folder));
                """);
            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_AvatarMediaId",
                table: "AspNetUsers",
                column: "AvatarMediaId");

            migrationBuilder.CreateIndex(
                name: "IX_MediaFolders_Name",
                table: "MediaFolders",
                column: "Name",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_AspNetUsers_MediaFiles_AvatarMediaId",
                table: "AspNetUsers",
                column: "AvatarMediaId",
                principalTable: "MediaFiles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AspNetUsers_MediaFiles_AvatarMediaId",
                table: "AspNetUsers");

            migrationBuilder.DropTable(
                name: "MediaFolders");

            migrationBuilder.DropIndex(
                name: "IX_AspNetUsers_AvatarMediaId",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "Kind",
                table: "MediaFiles");

            migrationBuilder.DropColumn(
                name: "OwnerUserId",
                table: "MediaFiles");

            migrationBuilder.DropColumn(
                name: "AvatarMediaId",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "Bio",
                table: "AspNetUsers");
        }
    }
}
