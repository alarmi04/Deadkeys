/** Textos de aviso del panel. La URL solo lleva el código; el texto se elige aquí. */
export const ADMIN_OK = {
  blocked: "Bloqueado",
  unblocked: "Desbloqueado.",
} as const;

export const ADMIN_ERRORS = {
  throttled: "Demasiados intentos. Espera 15 minutos.",
  password: "Contraseña incorrecta.",
  session: "Sesión caducada.",
  id: "ID no válido.",
  save: "No se pudo guardar. Revisa la configuración del almacenamiento.",
} as const;

export type AdminOk = keyof typeof ADMIN_OK;
export type AdminError = keyof typeof ADMIN_ERRORS;

export const okText = (code: unknown): string | null =>
  typeof code === "string" && Object.hasOwn(ADMIN_OK, code) ? ADMIN_OK[code as AdminOk] : null;

export const errorText = (code: unknown): string | null =>
  typeof code === "string" && Object.hasOwn(ADMIN_ERRORS, code) ? ADMIN_ERRORS[code as AdminError] : null;
