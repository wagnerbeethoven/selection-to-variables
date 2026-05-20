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

/** r, g, b: 0-1 (Figma format). a: 0-1. Returns palette name like "teal-500" or "red-300-a50". */
export function rgbaToPaletteName(r: number, g: number, b: number, a: number): string {
  const r255 = Math.round(r * 255);
  const g255 = Math.round(g * 255);
  const b255 = Math.round(b * 255);
  const rn = r255 / 255, gn = g255 / 255, bn = b255 / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const alphaSuffix = a < 1 ? `-a${Math.round(a * 100)}` : "";

  if (max === min) {
    if (l <= 0.05) return `black${alphaSuffix}`;
    if (l >= 0.95) return `white${alphaSuffix}`;
    const shade = Math.max(100, Math.min(900, Math.round(l * 8) * 100 + 100));
    return `gray-${shade}${alphaSuffix}`;
  }

  const d = max - min;
  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;

  const hDeg = Math.round(h * 360);
  const family =
    hDeg < 15  ? "red"    : hDeg < 45  ? "orange" : hDeg < 65  ? "yellow" :
    hDeg < 155 ? "green"  : hDeg < 195 ? "teal"   : hDeg < 255 ? "blue"   :
    hDeg < 285 ? "indigo" : hDeg < 330 ? "purple" : hDeg < 350 ? "pink"   : "red";

  const shade = Math.max(100, Math.min(900, Math.round((1 - l) * 8) * 100 + 100));
  return `${family}-${shade}${alphaSuffix}`;
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
