import * as yup from "yup";
const email = yup
  .string()
  .trim()
  .email("Escribe un correo válido.")
  .required("El correo es obligatorio.")
  .max(256);
const password = yup
  .string()
  .required("La contraseña es obligatoria.")
  .min(12, "Usa al menos 12 caracteres.")
  .max(128);
export const registerSchema = yup.object({
  fullName: yup
    .string()
    .trim()
    .required("El nombre es obligatorio.")
    .min(2)
    .max(200),
  email,
  password: password
    .matches(/[A-Z]/, "Incluye una mayúscula.")
    .matches(/[a-z]/, "Incluye una minúscula.")
    .matches(/[0-9]/, "Incluye un número.")
    .matches(/[^a-zA-Z0-9]/, "Incluye un símbolo."),
});
export const loginSchema = yup.object({
  email,
  password: yup.string().required("La contraseña es obligatoria."),
});
export const emailSchema = yup.object({ email });
export const resetSchema = yup.object({
  password: registerSchema.fields.password,
});
export const profileSchema = yup.object({
  fullName: yup.string().trim().required().min(2).max(200),
});
