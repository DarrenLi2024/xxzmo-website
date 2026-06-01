export function validateString(val: unknown, fieldName: string, min = 1): string {
  if (typeof val !== "string" || val.trim().length < min) {
    throw new Error(`${fieldName} 不能为空`);
  }
  return val.trim();
}

export function validateOptionalString(val: unknown): string | undefined {
  if (val == null || val === "") return undefined;
  if (typeof val !== "string") return undefined;
  return val.trim();
}

export function validateEnum<T extends string>(
  val: unknown,
  allowed: readonly T[],
  fieldName: string
): T {
  if (typeof val !== "string" || !allowed.includes(val as T)) {
    throw new Error(`${fieldName} 值无效`);
  }
  return val as T;
}

export function validateTags(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.trim())
    .filter(Boolean);
}
