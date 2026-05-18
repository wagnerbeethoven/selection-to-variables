import { slugify, type VariableKind } from "./shared";

export type ExportableValue =
  | {
      r: number;
      g: number;
      b: number;
      a: number;
    }
  | string
  | number;

export type ExportableItem = {
  name: string;
  type: VariableKind;
  category: string;
  description: string;
  occurrences: number;
  sources: string[];
  value: ExportableValue;
};

export type TokenLeaf = {
  value: string | number;
  type: "color" | "number" | "string";
  category: string;
  occurrences: number;
  description: string;
  sources: string[];
};

export type TokenTree = {
  [key: string]: TokenTree | TokenLeaf;
};

export function buildTokenTree(items: ExportableItem[]): TokenTree {
  const colorItems = items.filter((item) => item.type === "COLOR");
  const otherItems = items.filter((item) => item.type !== "COLOR");

  if (colorItems.length === 0) {
    return buildRawTree(otherItems);
  }

  // One palette entry per unique RGBA value — O(n), no inner find
  const paletteMap = new Map<string, string>();          // valueKey → paletteName
  const valueToItem = new Map<string, ExportableItem>(); // valueKey → first item with that value
  const usedNames = new Map<string, number>();           // baseName → count (collision guard)

  for (const item of colorItems) {
    const rgba = item.value as Extract<ExportableValue, { r: number; g: number; b: number; a: number }>;
    const valueKey = `${rgba.r}:${rgba.g}:${rgba.b}:${rgba.a}`;
    if (!valueToItem.has(valueKey)) valueToItem.set(valueKey, item);
    if (paletteMap.has(valueKey)) continue;

    const baseName = rgbaToPaletteName(rgba.r, rgba.g, rgba.b, rgba.a);
    const count = usedNames.get(baseName) ?? 0;
    usedNames.set(baseName, count + 1);
    paletteMap.set(valueKey, count === 0 ? baseName : `${baseName}-${count + 1}`);
  }

  // Palette items — raw hex/rgba values
  const paletteItems: ExportableItem[] = [];
  for (const [valueKey, paletteName] of paletteMap) {
    const source = valueToItem.get(valueKey)!;
    paletteItems.push({ ...source, name: `color/palette/${paletteName}`, category: "palette" });
  }

  // Semantic items — references to palette
  const semanticItems: ExportableItem[] = colorItems.map((item) => {
    const rgba = item.value as Extract<ExportableValue, { r: number; g: number; b: number; a: number }>;
    const valueKey = `${rgba.r}:${rgba.g}:${rgba.b}:${rgba.a}`;
    return { ...item, value: `{color.palette.${paletteMap.get(valueKey)!}}` };
  });

  return buildRawTree([...paletteItems, ...semanticItems, ...otherItems]);
}

function buildRawTree(items: ExportableItem[]): TokenTree {
  const root: TokenTree = {};

  items.forEach((item) => {
    const path = item.name.split("/").filter(Boolean);
    if (path.length === 0) return;

    let current: TokenTree = root;
    path.forEach((segment, index) => {
      const key = segment.trim();
      if (!key) return;

      if (index === path.length - 1) {
        current[key] = buildTokenLeaf(item);
        return;
      }

      if (!current[key] || isTokenLeaf(current[key])) {
        current[key] = {};
      }

      current = current[key] as TokenTree;
    });
  });

  return root;
}

export function buildTokenLeaf(item: ExportableItem): TokenLeaf {
  return {
    value: serializeValue(item),
    type: mapTokenType(item.type),
    category: item.category,
    occurrences: item.occurrences,
    description: item.description,
    sources: item.sources
  };
}

export function serializeValue(item: ExportableItem): string | number {
  if (item.type !== "COLOR" || typeof item.value === "string") {
    return item.value as string | number;
  }

  const rgba = item.value as Extract<ExportableValue, { r: number; g: number; b: number; a: number }>;
  const r = Math.round(rgba.r * 255);
  const g = Math.round(rgba.g * 255);
  const b = Math.round(rgba.b * 255);
  const a = Math.round(rgba.a * 1000) / 1000;
  return a === 1 ? `#${toHex(r)}${toHex(g)}${toHex(b)}` : `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function mapTokenType(type: VariableKind): TokenLeaf["type"] {
  if (type === "COLOR") return "color";
  if (type === "FLOAT") return "number";
  return "string";
}

export function buildExportFilename(collectionName: string): string {
  return `${slugify(collectionName || "raw-variables")}.tokens.json`;
}

function rgbaToPaletteName(r: number, g: number, b: number, a: number): string {
  const r255 = Math.round(r * 255);
  const g255 = Math.round(g * 255);
  const b255 = Math.round(b * 255);

  const rn = r255 / 255;
  const gn = g255 / 255;
  const bn = b255 / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
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
    hDeg < 15  ? "red"    :
    hDeg < 45  ? "orange" :
    hDeg < 65  ? "yellow" :
    hDeg < 155 ? "green"  :
    hDeg < 195 ? "teal"   :
    hDeg < 255 ? "blue"   :
    hDeg < 285 ? "indigo" :
    hDeg < 330 ? "purple" :
    hDeg < 350 ? "pink"   : "red";

  const shade = Math.max(100, Math.min(900, Math.round((1 - l) * 8) * 100 + 100));
  return `${family}-${shade}${alphaSuffix}`;
}

function toHex(value: number): string {
  return value.toString(16).padStart(2, "0");
}

function isTokenLeaf(value: TokenTree[string]): value is TokenLeaf {
  return Boolean(value) && typeof value === "object" && "value" in value && "type" in value;
}
