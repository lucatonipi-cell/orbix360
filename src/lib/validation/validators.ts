export class ValidationError extends Error {
  constructor(public field: string, message: string) {
    super(message);
  }
}

export function requireString(value: unknown, field: string, opts: { min?: number; max?: number } = {}): string {
  if (typeof value !== "string") throw new ValidationError(field, `${field} é obrigatório.`);
  const trimmed = value.trim();
  if (opts.min && trimmed.length < opts.min) {
    throw new ValidationError(field, `${field} deve ter pelo menos ${opts.min} caracteres.`);
  }
  if (opts.max && trimmed.length > opts.max) {
    throw new ValidationError(field, `${field} deve ter no máximo ${opts.max} caracteres.`);
  }
  return trimmed;
}

export function requireEmail(value: unknown): string {
  const email = requireString(value, "email", { min: 3, max: 254 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError("email", "Email inválido.");
  }
  return email.toLowerCase();
}

export function requirePassword(value: unknown): string {
  return requireString(value, "password", { min: 8, max: 200 });
}

export function optionalString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

export function oneOf<T extends string>(value: unknown, options: readonly T[], field: string): T {
  if (typeof value === "string" && (options as readonly string[]).includes(value)) {
    return value as T;
  }
  throw new ValidationError(field, `${field} deve ser um de: ${options.join(", ")}.`);
}
