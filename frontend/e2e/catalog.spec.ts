import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
test("admin crea curso con video y cuestionario, publica taller y visitante consulta catálogo", async ({
  page,
  browser,
}) => {
  const settings = JSON.parse(
    await readFile(
      resolve(import.meta.dirname, "../../.data/development.json"),
      "utf8",
    ),
  );
  const suffix = randomBytes(5).toString("hex"),
    filename = `video-${suffix}.mp4`,
    course = `Curso de prueba ${suffix}`,
    workshop = `Taller de prueba ${suffix}`;
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
  await page.goto("/admin/biblioteca");
  const bytes = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 180;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#173e31";
    context.fillRect(0, 0, 320, 180);
    const stream = canvas.captureStream(10),
      recorder = new MediaRecorder(stream, { mimeType: "video/mp4" }),
      chunks: Blob[] = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    const done = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: "video/mp4" }));
    });
    recorder.start();
    setTimeout(() => recorder.stop(), 300);
    const blob = await done;
    stream.getTracks().forEach((t) => t.stop());
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
  await page.locator("input[type=file]").setInputFiles({
    name: filename,
    mimeType: "video/mp4",
    buffer: Buffer.from(bytes),
  });
  await expect(
    page.getByRole("heading", { name: filename, exact: true }),
  ).toBeVisible();
  await page.goto("/admin/cursos/nuevo");
  await page.getByLabel("Título del curso", { exact: true }).fill(course);
  await page
    .getByLabel("Descripción del curso")
    .fill("Contenido ficticio para comprobar la publicación.");
  await page.getByRole("tab", { name: "Temas y contenido" }).click();
  await page
    .getByRole("button", { name: "+ Agregar tema", exact: true })
    .click();
  await page
    .getByRole("button", { name: "+ Agregar módulo", exact: true })
    .click();
  await page
    .getByRole("button", { name: "+ Agregar lección", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Buscar material por nombre" })
    .fill(filename);
  await page.getByRole("option", { name: filename, exact: false }).click();
  await page.getByRole("button", { name: "Añadir", exact: true }).click();
  await page.getByRole("tab", { name: "Cuestionario", exact: true }).click();
  await page
    .getByRole("button", { name: "Crear cuestionario", exact: true })
    .click();
  await page
    .getByRole("button", { name: "+ Agregar pregunta", exact: true })
    .click();
  await page
    .getByLabel("Pregunta 1", { exact: true })
    .fill("¿Cuál es la opción correcta?");
  await page.getByLabel("Opción 1", { exact: true }).fill("Primera opción");
  await page.getByLabel("Opción 2", { exact: true }).fill("Segunda opción");
  await page
    .getByRole("button", { name: "Guardar curso", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin\/cursos$/);
  await expect(
    page.getByText("Borrador guardado: " + course + ".", { exact: true }),
  ).toBeInViewport();
  await page
    .getByRole("link")
    .filter({ has: page.getByRole("heading", { name: course, exact: true }) })
    .click();
  await page
    .getByRole("button", { name: "Publicar versión", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Versión publicada");
  await page.goto("/admin/formaciones/nueva");
  await page.getByLabel("Título de formación", { exact: true }).fill(workshop);
  await page.getByLabel("Tipo de formación", { exact: true }).click();
  await page.getByRole("option", { name: "Taller", exact: true }).click();
  await page
    .getByRole("button", { name: "+ Nueva categoría", exact: true })
    .click();
  await page.getByLabel("Nombre de categoría").fill("Categoría " + suffix);
  await page
    .getByRole("button", { name: "Crear categoría", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("tab", { name: "Detalles", exact: true }).click();
  await page
    .getByLabel("Resumen de venta")
    .fill("Una formación ficticia para validar el recorrido.");
  await page
    .getByLabel("Descripción de formación")
    .fill("Prueba de publicación y catálogo público.");
  await page.getByRole("tab", { name: "Temas/Cursos", exact: true }).click();
  await page.getByRole("checkbox", { name: new RegExp(course) }).check();
  await page.getByRole("tab", { name: "Precio", exact: true }).click();
  await page.getByLabel("Precio MXN").fill("1200");
  await page
    .getByRole("button", { name: "Guardar borrador", exact: true })
    .click();
  await expect(page).toHaveURL(/admin\/formaciones\/.+\/editar/);
  await page.getByRole("tab", { name: "Publicar", exact: true }).click();
  await page
    .getByRole("button", { name: "Publicar formación", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Formación publicada");
  const visitor = await browser.newPage();
  await visitor.goto("/catalogo");
  await visitor.getByLabel("Buscar formación").fill(workshop);
  await visitor.getByRole("heading", { name: workshop, exact: true }).click();
  await expect(
    visitor.getByRole("heading", { name: workshop, exact: true }),
  ).toBeVisible();
  await expect(visitor.getByText(course, { exact: false })).toBeVisible();
  await expect(
    visitor.getByText("La compra en línea aún no está habilitada."),
  ).toBeVisible();
  await visitor.close();
});
