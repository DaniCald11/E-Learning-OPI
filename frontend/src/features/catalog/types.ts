export type ProductType =
  | "IndividualCourse"
  | "Workshop"
  | "CertificationProgram";
export type Status = "Draft" | "Published" | "Archived";
export interface Category {
  id: string;
  name: string;
  slug: string;
}
export interface Media {
  id: string;
  originalFileName: string;
  contentType: string;
  sizeBytes: number;
  folder: string;
  processingStatus: string;
  provider: string;
}
export interface Lesson {
  id: string;
  title: string;
  type: string;
  isRequired: boolean;
  mediaIds: string[];
}
export interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}
export interface Topic {
  id: string;
  title: string;
  modules: Module[];
}
export interface Quiz {
  id: string;
  title: string;
  questions: {
    id: string;
    prompt: string;
    points: number;
    options: { id: string; text: string; isCorrect: boolean }[];
  }[];
}
export interface CourseDraft {
  title: string;
  slug: string;
  description: string;
  topics: Topic[];
  quiz: Quiz | null;
  rowVersion: string | null;
}
export interface Course {
  id: string;
  draft: CourseDraft;
  status: Status;
  publishedVersion: number;
}
export interface ProductDraft {
  title: string;
  slug: string;
  summary: string;
  description: string;
  type: ProductType;
  categoryId: string;
  price: number;
  currency: string;
  coverMediaId: string | null;
  courses: { courseId: string; position: number; isRequired: boolean }[];
  rowVersion: string | null;
}
export interface Product {
  id: string;
  draft: ProductDraft;
  status: Status;
  publishedVersion: number;
}
export interface PublishedProduct {
  id: string;
  productVersionId: string;
  version: number;
  title: string;
  slug: string;
  summary: string;
  description: string;
  type: ProductType;
  categoryId: string;
  category: string;
  price: number;
  currency: string;
  coverMediaId: string | null;
  courses: {
    courseId: string;
    title: string;
    description: string;
    outline: Topic[];
  }[];
}
export const typeNames: Record<ProductType, string> = {
  IndividualCourse: "Curso individual",
  Workshop: "Taller",
  CertificationProgram: "Certificación",
};
export const statusNames: Record<Status, string> = {
  Draft: "Borrador",
  Published: "Publicado",
  Archived: "Archivado",
};
export const money = (value: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
    value,
  );
export const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
