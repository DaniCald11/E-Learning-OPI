import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
async function login(page: Page) {
  const settings = JSON.parse(
    await readFile(
      resolve(import.meta.dirname, "../../.data/development.json"),
      "utf8",
    ),
  );
  await page.goto("/login");
  await page
    .getByLabel("Correo electrónico")
    .fill(settings.BootstrapAdmin__Email);
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill(settings.BootstrapAdmin__Password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Panel administrativo", exact: true }),
  ).toBeVisible();
}
async function materials(page: Page) {
  return await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 180;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#173e31";
    context.fillRect(0, 0, 320, 180);
    const image = canvas.toDataURL("image/png").split(",")[1];
    const stream = canvas.captureStream(10);
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    const done = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks));
    });
    recorder.start();
    setTimeout(() => recorder.stop(), 300);
    const video = Array.from(new Uint8Array(await (await done).arrayBuffer()));
    stream.getTracks().forEach((track) => track.stop());
    return { image, video };
  });
}
test("flujo de revisión: borrador, biblioteca, múltiples materiales, precio, portada y publicación", async ({
  page,
  browser,
}) => {
  test.setTimeout(90000);
  const suffix = randomBytes(4).toString("hex");
  const title = "Curso revisión " + suffix;
  const workshop = "Taller revisión " + suffix;
  const folder = "Materiales " + suffix;
  await login(page);
  const links = await page
    .getByRole("navigation", { name: "Navegación principal" })
    .getByRole("link")
    .allTextContents();
  expect(links.map((s) => s.trim())).toEqual([
    "Inicio",
    "Catálogo",
    "Panel administrativo",
  ]);
  await expect(
    page.getByRole("menuitem", { name: "Cerrar sesión" }),
  ).toHaveCount(0);
  await page.goto("/admin/cursos/nuevo");
  await page.getByLabel("Título del curso", { exact: true }).fill(title);
  await page
    .getByLabel("Descripción del curso")
    .fill("Contenido ficticio para comprobar los ajustes del editor.");
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await page
    .getByRole("button", { name: "+ Agregar tema", exact: true })
    .click();
  await page.getByLabel("Título del tema 1").fill("Tema conservado");
  await page
    .getByRole("button", { name: "+ Agregar módulo", exact: true })
    .click();
  await page
    .getByRole("button", { name: "+ Agregar lección", exact: true })
    .click();
  await page.getByLabel("Tipo de contenido").click();
  await page
    .getByRole("option", { name: "Videos y recursos", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Subir", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("link", {
      name: "Ir a Biblioteca para cargar archivos",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Nueva carpeta", exact: true })
    .click();
  await page.getByLabel("Nombre de carpeta").fill(folder);
  await page
    .getByRole("button", { name: "Crear carpeta", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByText("Esta carpeta está vacía.", { exact: true }),
  ).toBeVisible();
  const bytes = await materials(page);
  const pdf = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF");
  const files = [
    {
      name: "video-a-" + suffix + ".webm",
      mimeType: "video/webm",
      buffer: Buffer.from(bytes.video),
    },
    {
      name: "video-b-" + suffix + ".webm",
      mimeType: "video/webm",
      buffer: Buffer.from(bytes.video),
    },
    {
      name: "recurso-a-" + suffix + ".pdf",
      mimeType: "application/pdf",
      buffer: pdf,
    },
    {
      name: "recurso-b-" + suffix + ".pdf",
      mimeType: "application/pdf",
      buffer: pdf,
    },
    {
      name: "portada-" + suffix + ".png",
      mimeType: "image/png",
      buffer: Buffer.from(bytes.image, "base64"),
    },
  ];
  await page.locator("input[type=file]").setInputFiles(files);
  await expect(
    page.getByText("5 archivo(s) cargado(s).", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", {
      name: "Volver al editor sin perder cambios",
      exact: false,
    })
    .click();
  await expect(
    page.getByRole("tab", { name: "Temas y contenido", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("Título del tema 1")).toHaveValue(
    "Tema conservado",
  );
  await page.reload();
  await expect(page.getByLabel("Título del tema 1")).toHaveValue(
    "Tema conservado",
  );
  for (const file of files) {
    await page
      .getByRole("combobox", { name: "Buscar material por nombre" })
      .fill(file.name);
    await page.getByRole("option", { name: file.name, exact: false }).click();
    await expect(page.getByLabel("Archivos de la lección")).not.toContainText(
      file.name,
    );
    await page.getByRole("button", { name: "Añadir", exact: true }).click();
    await expect(page.getByLabel("Archivos de la lección")).toContainText(
      file.name,
    );
  }
  await expect(page.getByLabel("Archivos de la lección")).toContainText(
    files[0].name,
  );
  await expect(page.getByLabel("Archivos de la lección")).toContainText(
    files[3].name,
  );
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await page
    .getByRole("button", { name: "Crear cuestionario", exact: true })
    .click();
  await page
    .getByRole("button", { name: "+ Agregar pregunta", exact: true })
    .click();
  await page
    .getByLabel("Pregunta 1", { exact: true })
    .fill("¿Qué opción es correcta?");
  await page.getByLabel("Opción 1", { exact: true }).fill("Correcta");
  await page.getByLabel("Opción 2", { exact: true }).fill("Otra");
  await page
    .getByRole("button", { name: "Publicar versión", exact: true })
    .click();
  await expect(page).toHaveURL(/admin\/cursos\/.+\/editar/);
  await expect(page.getByRole("alert")).toContainText("Versión publicada");
  await page
    .getByRole("link", { name: "Formaciones y talleres", exact: true })
    .click();
  await page.getByRole("link", { name: "Nuevo taller", exact: true }).click();
  await expect(
    page.getByLabel("Tipo de formación", { exact: true }),
  ).toHaveText("Taller");
  await page.getByLabel("Título de formación", { exact: true }).fill(workshop);
  await page
    .getByRole("button", { name: "+ Nueva categoría", exact: true })
    .click();
  await page.getByLabel("Nombre de categoría").fill("Categoría " + suffix);
  await page
    .getByRole("button", { name: "Crear categoría", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Siguiente", exact: false }).click();
  await page
    .getByLabel("Resumen de venta")
    .fill("Resumen de la formación de prueba.");
  await page
    .getByLabel("Descripción de formación")
    .fill("Descripción de prueba.");
  await page.getByRole("button", { name: "Siguiente", exact: false }).click();
  await page.getByRole("checkbox", { name: new RegExp(title) }).check();
  await page.getByRole("button", { name: "Siguiente", exact: false }).click();
  await page.getByLabel("Precio MXN").fill("2000");
  await expect(page.getByLabel("Precio MXN")).toHaveAttribute("type", "text");
  await expect(page.getByRole("spinbutton")).toHaveCount(0);
  await page.getByRole("button", { name: "Siguiente", exact: false }).click();
  await page.getByLabel("Portada de formación").click();
  await page.getByRole("option", { name: files[4].name, exact: true }).click();
  const preview = page.getByRole("img", {
    name: "Portada de la formación en el borrador",
  });
  await expect(preview).toBeVisible();
  await expect
    .poll(() =>
      preview.evaluate((image: HTMLImageElement) => image.naturalWidth),
    )
    .toBeGreaterThan(0);
  await page.getByRole("link", { name: "Biblioteca", exact: true }).click();
  await page
    .getByRole("link", {
      name: "Volver al editor sin perder cambios",
      exact: false,
    })
    .click();
  await expect(preview).toBeVisible();
  await page.getByRole("tab", { name: "Precio", exact: true }).click();
  await expect(page.getByLabel("Precio MXN")).toHaveValue("2000");
  await page.getByRole("tab", { name: "Publicar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Publicar formación", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Publicar formación", exact: true })
    .click();
  await expect(page).toHaveURL(/admin\/formaciones\/.+\/editar/);
  await expect(page.getByRole("alert")).toContainText("Formación publicada");
  const visitor = await browser.newPage();
  await visitor.goto("/catalogo");
  await visitor.getByLabel("Buscar formación").fill(workshop);
  await visitor.getByRole("heading", { name: workshop, exact: true }).click();
  await expect(
    visitor.getByRole("heading", { name: workshop, exact: true }),
  ).toBeVisible();
  await visitor.close();
});
test("un intento de publicar incompleto conserva el curso guardado al volver de biblioteca", async ({
  page,
}) => {
  await login(page);
  const title = "Borrador incompleto " + randomBytes(4).toString("hex");
  await page.goto("/admin/cursos/nuevo");
  await page.getByLabel("Título del curso", { exact: true }).fill(title);
  await page
    .getByRole("button", { name: "Publicar versión", exact: true })
    .click();
  await expect(page).toHaveURL(/admin\/cursos\/.+\/editar/);
  await expect(page.getByRole("alert")).toContainText("Publicar requiere");
  await page.getByRole("link", { name: "Biblioteca", exact: true }).click();
  await page
    .getByRole("link", {
      name: "Volver al editor sin perder cambios",
      exact: false,
    })
    .click();
  await expect(
    page.getByLabel("Título del curso", { exact: true }),
  ).toHaveValue(title);
});
test("cerrar sesión limpia borradores locales y deja el perfil fuera del panel", async ({
  page,
}) => {
  await login(page);
  await page.goto("/admin/cursos/nuevo");
  await page
    .getByLabel("Título del curso", { exact: true })
    .fill("Borrador privado sin guardar");
  await page.getByRole("button", { name: "Mi cuenta", exact: true }).click();
  await page.getByRole("menuitem", { name: "Mi perfil", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Mi perfil", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Gestionar formaciones", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Mi cuenta", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Cerrar sesión", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("button", { name: "Mi cuenta", exact: true }),
  ).toHaveCount(0);
  await login(page);
  await page.goto("/admin/cursos/nuevo");
  await expect(
    page.getByLabel("Título del curso", { exact: true }),
  ).toHaveValue("");
});

test("renombrar y eliminar carpetas conserva archivos; guardar curso vuelve al listado y enfoca la confirmación", async ({
  page,
}) => {
  const suffix = randomBytes(4).toString("hex");
  const folder = "Carpeta de prueba " + suffix;
  const renamed = "Carpeta editada " + suffix;
  const title = "Borrador guardado de prueba " + suffix;
  const filename = "imagen-" + suffix + ".png";
  await login(page);
  await page.goto("/admin/biblioteca");
  await page
    .getByRole("button", { name: "Nueva carpeta", exact: true })
    .click();
  await page.getByLabel("Nombre de carpeta").fill(folder);
  await page
    .getByRole("button", { name: "Crear carpeta", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: filename,
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a/csAAAAASUVORK5CYII=",
        "base64",
      ),
    });
  await expect(
    page.getByRole("heading", { name: filename, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Editar carpeta " + folder, exact: true })
    .click();
  await page.getByLabel("Nombre de carpeta").fill(renamed);
  await page
    .getByRole("button", { name: "Guardar nombre", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByLabel("Carpeta de " + filename)).toHaveText(renamed);
  await page
    .getByRole("button", { name: "Eliminar carpeta " + renamed, exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("No se borrarán");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Eliminar carpeta", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByLabel("Carpeta de " + filename)).toHaveText(
    "Sin carpeta",
  );
  await expect(
    page.getByRole("button", { name: renamed, exact: true }),
  ).toHaveCount(0);
  const preview = page
    .getByRole("heading", { name: filename, exact: true })
    .locator("..")
    .locator("img");
  await expect
    .poll(() =>
      preview.evaluate((image: HTMLImageElement) => image.naturalWidth),
    )
    .toBeGreaterThan(0);
  await page.goto("/admin/cursos/nuevo");
  await page.getByLabel("Título del curso", { exact: true }).fill(title);
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  for (let i = 0; i < 7; i++)
    await page
      .getByRole("button", { name: "+ Agregar tema", exact: true })
      .click();
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await page
    .getByRole("button", { name: "Guardar borrador de curso", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin\/cursos$/);
  const notice = page.getByText("Borrador guardado: " + title + ".", {
    exact: true,
  });
  await expect(notice).toBeInViewport();
  await expect(
    page.getByRole("alert").filter({ hasText: "Borrador guardado:" }),
  ).toBeFocused();
  const card = page
    .getByRole("link")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
  await expect(card).toContainText("Borrador");
  await card.click();
  await expect(
    page.getByLabel("Título del curso", { exact: true }),
  ).toHaveValue(title);
  await page
    .getByLabel("Descripción del curso")
    .fill("Descripción actualizada de prueba.");
  await page
    .getByRole("button", { name: "Guardar curso", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin\/cursos$/);
  await expect(notice).toBeInViewport();
  await card.click();
  await expect(page.getByLabel("Descripción del curso")).toHaveValue(
    "Descripción actualizada de prueba.",
  );
});
