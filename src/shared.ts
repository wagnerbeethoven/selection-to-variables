export type VariableKind = "COLOR" | "STRING" | "FLOAT";

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeNumber(value: number): string {
  return String(value).replace(".", "-");
}

export function sanitizeVariableName(input: string): string {
  return input
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/|\/$/g, "");
}

export function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function hasSome(input: string, terms: string[]): boolean {
  return terms.some((term) => input.includes(term));
}

export function inferRole(context: string): string {
  if (hasSome(context, ["primary", "brand", "main", "accent", "key"])) return "primary";
  if (hasSome(context, ["secondary", "support", "alt", "auxiliary", "sub"])) return "secondary";
  if (hasSome(context, ["success", "positive", "approved", "done", "confirm", "complete", "valid"])) return "success";
  if (hasSome(context, ["warning", "alert", "caution", "attention", "moderate"])) return "warning";
  if (hasSome(context, ["danger", "error", "destructive", "negative", "critical", "fail", "invalid", "remove", "delete"])) return "danger";
  if (hasSome(context, ["info", "informational", "notice", "hint", "help", "tip"])) return "info";
  return "neutral";
}

export function inferState(context: string): string {
  if (hasSome(context, ["hover", "hovered", "mouseover"])) return "hover";
  if (hasSome(context, ["active", "pressed", "clicked", "down"])) return "active";
  if (hasSome(context, ["disabled", "inactive", "unavailable", "muted"])) return "disabled";
  if (hasSome(context, ["focus", "focused"])) return "focus";
  if (hasSome(context, ["selected", "checked"])) return "selected";
  if (hasSome(context, ["visited"])) return "visited";
  return "default";
}

export function buildVariableLookupKey(type: VariableKind, name: string): string {
  return `${type}:${sanitizeVariableName(name)}`;
}

export function ensureUniqueVariableName(
  inputName: string,
  type: VariableKind,
  itemId: string,
  usedKeys: Set<string>,
): string {
  const baseName = sanitizeVariableName(inputName);
  if (!baseName) {
    return "";
  }

  const baseKey = buildVariableLookupKey(type, baseName);
  if (!usedKeys.has(baseKey)) {
    usedKeys.add(baseKey);
    return baseName;
  }

  const suffix = slugify(itemId).slice(0, 24) || "token";
  let candidate = `${baseName}/${suffix}`;
  let counter = 2;

  while (usedKeys.has(buildVariableLookupKey(type, candidate))) {
    candidate = `${baseName}/${suffix}-${counter}`;
    counter += 1;
  }

  usedKeys.add(buildVariableLookupKey(type, candidate));
  return candidate;
}
