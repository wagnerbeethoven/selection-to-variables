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
  const root: TokenTree = {};

  items.forEach((item) => {
    const path = item.name.split("/").filter(Boolean);
    if (path.length === 0) {
      return;
    }

    let current: TokenTree = root;
    path.forEach((segment, index) => {
      const key = segment.trim();
      if (!key) {
        return;
      }

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
  if (item.type !== "COLOR") {
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
  if (type === "COLOR") {
    return "color";
  }
  if (type === "FLOAT") {
    return "number";
  }
  return "string";
}

export function buildExportFilename(collectionName: string): string {
  return `${slugify(collectionName || "raw-variables")}.tokens.json`;
}

function toHex(value: number): string {
  return value.toString(16).padStart(2, "0");
}

function isTokenLeaf(value: TokenTree[string]): value is TokenLeaf {
  return Boolean(value) && typeof value === "object" && "value" in value && "type" in value;
}
