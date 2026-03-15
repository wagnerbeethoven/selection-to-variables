import test from "node:test";
import assert from "node:assert/strict";

import {
  type VariableKind,
  buildVariableLookupKey,
  ensureUniqueVariableName,
  inferRole,
  normalizeNumber,
  round,
  sanitizeVariableName,
  slugify,
} from "../src/shared";
import {
  buildExportFilename,
  buildTokenTree,
  mapTokenType,
  serializeValue,
} from "../src/export-tokens";

test("slugify removes accents and punctuation", () => {
  assert.equal(slugify("Botão Primário / CTA"), "botao-primario-cta");
});

test("sanitizeVariableName normalizes slashes", () => {
  assert.equal(sanitizeVariableName("\\color//action///primary/"), "color/action/primary");
});

test("normalizeNumber preserves decimal separator as token-safe", () => {
  assert.equal(normalizeNumber(12.5), "12-5");
});

test("round limits float precision", () => {
  assert.equal(round(1.23456), 1.235);
});

test("inferRole maps semantic keywords", () => {
  assert.equal(inferRole("button primary brand"), "primary");
  assert.equal(inferRole("state error destructive"), "danger");
  assert.equal(inferRole("plain container"), "neutral");
});

test("buildVariableLookupKey uses sanitized name", () => {
  assert.equal(buildVariableLookupKey("FLOAT", "/size//layout/gap/16/"), "FLOAT:size/layout/gap/16");
});

test("ensureUniqueVariableName keeps first free name", () => {
  const used = new Set<string>();
  assert.equal(ensureUniqueVariableName("color/action/primary", "COLOR", "color:1", used), "color/action/primary");
});

test("ensureUniqueVariableName disambiguates collisions deterministically", () => {
  const used = new Set<string>();
  const first = ensureUniqueVariableName("color/action/primary", "COLOR", "color:1", used);
  const second = ensureUniqueVariableName("color/action/primary", "COLOR", "color:2", used);

  assert.equal(first, "color/action/primary");
  assert.match(second, /^color\/action\/primary\/color-2/);
  assert.notEqual(buildVariableLookupKey("COLOR", first), buildVariableLookupKey("COLOR", second));
});

test("serializeValue exports color as hex when alpha is 1", () => {
  const value = serializeValue({
    name: "color/action/primary",
    type: "COLOR",
    category: "action/primary",
    description: "green",
    occurrences: 2,
    sources: ["Button"],
    value: { r: 0, g: 1, b: 0, a: 1 }
  });

  assert.equal(value, "#00ff00");
});

test("serializeValue exports color as rgba when alpha is partial", () => {
  const value = serializeValue({
    name: "color/overlay",
    type: "COLOR",
    category: "background/neutral",
    description: "overlay",
    occurrences: 2,
    sources: ["Modal"],
    value: { r: 1, g: 0, b: 0, a: 0.5 }
  });

  assert.equal(value, "rgba(255, 0, 0, 0.5)");
});

test("buildTokenTree nests tokens by variable path", () => {
  const tree = buildTokenTree([
    {
      name: "color/action/primary/base",
      type: "COLOR" as VariableKind,
      category: "action/primary",
      description: "base",
      occurrences: 3,
      sources: ["Button"],
      value: { r: 0, g: 1, b: 0, a: 1 }
    },
    {
      name: "size/layout/gap/16",
      type: "FLOAT" as VariableKind,
      category: "layout/gap",
      description: "16px",
      occurrences: 4,
      sources: ["Card"],
      value: 16
    }
  ]);

  assert.deepEqual(tree, {
    color: {
      action: {
        primary: {
          base: {
            value: "#00ff00",
            type: "color",
            category: "action/primary",
            occurrences: 3,
            description: "base",
            sources: ["Button"]
          }
        }
      }
    },
    size: {
      layout: {
        gap: {
          "16": {
            value: 16,
            type: "number",
            category: "layout/gap",
            occurrences: 4,
            description: "16px",
            sources: ["Card"]
          }
        }
      }
    }
  });
});

test("mapTokenType returns export token types", () => {
  assert.equal(mapTokenType("COLOR"), "color");
  assert.equal(mapTokenType("FLOAT"), "number");
  assert.equal(mapTokenType("STRING"), "string");
});

test("buildExportFilename normalizes collection name", () => {
  assert.equal(buildExportFilename("Design Tokens Base"), "design-tokens-base.tokens.json");
});
