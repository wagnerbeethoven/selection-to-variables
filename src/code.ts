import {
  buildVariableLookupKey,
  ensureUniqueVariableName,
  inferRole,
  inferState,
  normalizeNumber,
  rgbaToPaletteName,
  round,
  slugify,
  type VariableKind,
} from "./shared";
import { type Locale, t } from "./i18n";

type ItemGroup = "colors" | "texts" | "sizes";

type RgbaValue = {
  r: number;
  g: number;
  b: number;
  a: number;
};

type RawItem = {
  id: string;
  group: ItemGroup;
  category: string;
  name: string;
  type: VariableKind;
  value: RgbaValue | string | number;
  description: string;
  occurrences: number;
  sources: string[];
};

type TextStyleSignature = {
  fontName: FontName;
  fontSize: number;
  lineHeight: LineHeight;
  letterSpacing: LetterSpacing;
  paragraphSpacing: number;
  textCase: TextCase;
  textDecoration: TextDecoration;
};

type TextStyleCandidate = {
  key: string;
  name: string;
  signature: TextStyleSignature;
  occurrences: number;
  ranges: Array<{
    nodeId: string;
    start: number;
    end: number;
  }>;
};

type ColorStyleCandidate = {
  key: string;
  name: string;
  category: string;
  value: RgbaValue;
  occurrences: number;
  nodeIds: string[];
};

type EffectStyleCandidate = {
  key: string;
  name: string;
  category: string;
  effects: Effect[];
  occurrences: number;
  nodeIds: string[];
};

type VariableDraft = {
  id: string;
  include: boolean;
  group: ItemGroup;
  name: string;
  type: VariableKind;
  value: RgbaValue | string | number;
};

type ScanPayload = {
  type: "scan-result";
  items: RawItem[];
  colorStyles: Array<{
    key: string;
    name: string;
    category: string;
    value: RgbaValue;
    occurrences: number;
  }>;
  effectStyles: Array<{
    key: string;
    name: string;
    category: string;
    effects: Array<Record<string, unknown>>;
    occurrences: number;
  }>;
  textStyles: Array<{
    key: string;
    name: string;
    occurrences: number;
    signature: {
      fontName: {
        family: string;
        style: string;
      };
      fontSize: number;
      lineHeight: {
        unit: string;
        value?: number;
      };
      letterSpacing: {
        unit: string;
        value: number;
      };
      paragraphSpacing: number;
      textCase: string;
      textDecoration: string;
    };
  }>;
  selectionCount: number;
  repeatedCount: number;
  textStyleDiagnostics: TextStyleDiagnostics;
  selectedNodeTypes: string[];
  acceptedNodeTypes: string[];
};

type FeedbackPayload = {
  type: "action-feedback";
  level: "info" | "success" | "warning" | "error";
  message: string;
};

type BackendReadyPayload = {
  type: "backend-ready";
};

type CollectionsLoadedPayload = {
  type: "collections-loaded";
  collections: Array<{
    name: string;
    modes: string[];
  }>;
};

type TextStylesResultPayload = {
  type: "text-styles-result";
  textStyles: ScanPayload["textStyles"];
  textStyleDiagnostics: {
    textNodesFound: number;
    styledSegmentsRead: number;
    styleCandidatesGenerated: number;
  };
};

type ColorStylesResultPayload = {
  type: "color-styles-result";
  colorStyles: ScanPayload["colorStyles"];
};

type EffectStylesResultPayload = {
  type: "effect-styles-result";
  effectStyles: ScanPayload["effectStyles"];
};

type TextStyleDiagnostics = {
  textNodesFound: number;
  styledSegmentsRead: number;
  styleCandidatesGenerated: number;
};

type CreatePayload = {
  type: "create-variables";
  collectionName: string;
  modeName: string;
  bindToSelection: boolean;
  items: VariableDraft[];
};

type CreateTextStylesPayload = {
  type: "create-text-styles";
  applyToSelection: boolean;
  styles?: Array<{
    key: string;
    name: string;
  }>;
};

type CreateColorStylesPayload = {
  type: "create-color-styles";
  applyToSelection: boolean;
  styles?: Array<{
    key: string;
    name: string;
  }>;
};

type CreateEffectStylesPayload = {
  type: "create-effect-styles";
  applyToSelection: boolean;
  styles?: Array<{
    key: string;
    name: string;
  }>;
};

type GenerateDesignSystemPayload = {
  type: "generate-design-system";
  colorItems: Array<{ name: string; value: RgbaValue }>;
  colorStyles: Array<{ name: string; value: RgbaValue }>;
  textStyles: Array<{
    name: string;
    signature: {
      fontName: { family: string; style: string };
      fontSize: number;
      lineHeight: { unit: string; value?: number };
    };
  }>;
  sizeItems: Array<{ name: string; value: number; category: string }>;
  effectStyles: Array<{ name: string; effects: Array<Record<string, unknown>> }>;
};

type ScanRequest = {
  type: "scan-selection";
  locale?: Locale;
};

type LoadPrefsRequest = {
  type: "load-prefs";
};

type SavePrefsRequest = {
  type: "save-prefs";
  prefs: {
    collectionName: string;
    modeName: string;
    repeatedOnly: boolean;
    autoScanSelection: boolean;
    locale?: Locale;
  };
};

type ResizeWindowRequest = {
  type: "resize-window";
  mode: "default" | "maximized";
};

type OpenUrlRequest = {
  type: "open-url";
  url: string;
};

let autoScanSelection = false;
let currentLocale: Locale = "en";
let selectionScanTimer: number | undefined;
const AUTO_SCAN_DEBOUNCE_MS = 180;
const DEFAULT_UI_SIZE = { width: 560, height: 720 };
const MAXIMIZED_UI_SIZE = { width: 920, height: 900 };

figma.showUI(__html__, {
  width: DEFAULT_UI_SIZE.width,
  height: DEFAULT_UI_SIZE.height,
  themeColors: true
});

figma.ui.postMessage({ type: "backend-ready" } as BackendReadyPayload);

figma.ui.onmessage = async (
  message:
    | ScanRequest
    | CreatePayload
    | CreateTextStylesPayload
    | CreateColorStylesPayload
    | CreateEffectStylesPayload
    | GenerateDesignSystemPayload
    | LoadPrefsRequest
    | SavePrefsRequest
    | ResizeWindowRequest
    | OpenUrlRequest
) => {
  try {
    if (message.type === "scan-selection") {
      if (message.locale) currentLocale = message.locale;
      postFeedback("info", t("backend_scanning", currentLocale));
      postScanResult();
      return;
    }

    if (message.type === "create-variables") {
      postFeedback("info", t("backend_creating_variables", currentLocale));
      await createVariables(message as CreatePayload);
      return;
    }

    if (message.type === "create-text-styles") {
      postFeedback("info", t("backend_creating_text_styles", currentLocale));
      await createTextStyles(message);
      return;
    }

    if (message.type === "create-color-styles") {
      postFeedback("info", t("backend_creating_color_styles", currentLocale));
      await createColorStyles(message);
      return;
    }

    if (message.type === "create-effect-styles") {
      postFeedback("info", t("backend_creating_effect_styles", currentLocale));
      await createEffectStyles(message);
      return;
    }

    if (message.type === "load-prefs") {
      const prefs = await figma.clientStorage.getAsync("ui-prefs");
      autoScanSelection = Boolean(prefs && prefs.autoScanSelection);
      if (prefs?.locale) currentLocale = prefs.locale as Locale;
      figma.ui.postMessage({
        type: "prefs-loaded",
        prefs: prefs ?? {}
      });
      await postCollectionsData();
      return;
    }

    if (message.type === "save-prefs") {
      autoScanSelection = message.prefs.autoScanSelection;
      if (message.prefs.locale) currentLocale = message.prefs.locale;
      await figma.clientStorage.setAsync("ui-prefs", message.prefs);
      return;
    }

    if (message.type === "resize-window") {
      const size = message.mode === "maximized" ? MAXIMIZED_UI_SIZE : DEFAULT_UI_SIZE;
      figma.ui.resize(size.width, size.height);
      return;
    }

    if (message.type === "generate-design-system") {
      postFeedback("info", t("backend_generating_design_system", currentLocale));
      await generateDesignSystem(message as GenerateDesignSystemPayload);
      return;
    }

    if (message.type === "open-url") {
      if (typeof message.url === "string" && message.url.startsWith("https://")) {
        figma.openExternal(message.url);
      }
      return;
    }
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Unknown plugin error.";
    figma.notify(messageText);
    postFeedback("error", messageText);
  }
};

figma.on("selectionchange", () => {
  figma.ui.postMessage({
    type: "selection-updated",
    selectionCount: figma.currentPage.selection.length
  });

  if (autoScanSelection) {
    scheduleAutoScan();
  }
});

function scheduleAutoScan() {
  if (selectionScanTimer !== undefined) {
    clearTimeout(selectionScanTimer);
  }

  selectionScanTimer = setTimeout(() => {
    selectionScanTimer = undefined;
    postScanResult(true);
  }, AUTO_SCAN_DEBOUNCE_MS) as unknown as number;
}

function postScanResult(silent = false) {
  if (figma.currentPage.selection.length === 0) {
    postFeedback("warning", t("backend_select_layer", currentLocale));
    return;
  }

  const { items, colorStyles, effectStyles, textStyles, textStyleDiagnostics, selectedNodeTypes, acceptedNodeTypes } = scanSelection(silent);
  const response: ScanPayload = {
    type: "scan-result",
    items,
    colorStyles: serializeColorStyles(colorStyles),
    effectStyles: serializeEffectStyles(effectStyles),
    textStyles: serializeTextStyles(textStyles),
    selectionCount: figma.currentPage.selection.length,
    repeatedCount: items.filter((item) => item.occurrences > 1).length,
    textStyleDiagnostics,
    selectedNodeTypes,
    acceptedNodeTypes
  };
  figma.ui.postMessage(response);
  postColorStylesResult(colorStyles);
  postEffectStylesResult(effectStyles);
  postTextStylesResult(textStyles, textStyleDiagnostics);

  postFeedback(
    "success",
    t("backend_scan_complete", currentLocale, {
      items: items.length,
      colorStyles: colorStyles.length,
      effectStyles: effectStyles.length,
      textStyles: textStyles.length,
      layers: acceptedNodeTypes.length
    })
  );
}

function scanSelection(silent = false): {
  items: RawItem[];
  colorStyles: ColorStyleCandidate[];
  effectStyles: EffectStyleCandidate[];
  textStyles: TextStyleCandidate[];
  textStyleDiagnostics: TextStyleDiagnostics;
  selectedNodeTypes: string[];
  acceptedNodeTypes: string[];
} {
  const selection = figma.currentPage.selection;
  const selectedNodeTypes = selection.map((node) => node.type);
  if (selection.length === 0) {
    if (!silent) {
      figma.notify(t("backend_select_node", currentLocale));
    }
    return {
      items: [],
      colorStyles: [],
      effectStyles: [],
      textStyles: [],
      textStyleDiagnostics: emptyTextStyleDiagnostics(),
      selectedNodeTypes,
      acceptedNodeTypes: []
    };
  }

  const validSelection = selection.filter(isAllowedSelectionNode);
  if (validSelection.length === 0) {
    const warning = t("backend_select_frame", currentLocale);
    if (!silent) {
      figma.notify(warning);
    }
    postFeedback("warning", warning);
    return {
      items: [],
      colorStyles: [],
      effectStyles: [],
      textStyles: [],
      textStyleDiagnostics: emptyTextStyleDiagnostics(),
      selectedNodeTypes,
      acceptedNodeTypes: []
    };
  }

  if (validSelection.length !== selection.length) {
    postFeedback("warning", t("backend_ignored_layers", currentLocale));
  }

  const items = new Map<string, RawItem>();
  for (const node of validSelection) {
    visitNode(node, items, [node.name]);
  }
  const colorStyles = collectColorStyleCandidatesFromNodes(validSelection);
  const effectStyles = collectEffectStyleCandidatesFromNodes(validSelection);
  const textStyleResult = collectTextStyleCandidatesFromNodes(validSelection);
  return {
    items: disambiguateNames([...items.values()].sort((a, b) => {
      if (b.occurrences !== a.occurrences) {
        return b.occurrences - a.occurrences;
      }
      return a.name.localeCompare(b.name);
    })),
    colorStyles,
    effectStyles,
    textStyles: textStyleResult.candidates,
    textStyleDiagnostics: textStyleResult.diagnostics,
    selectedNodeTypes,
    acceptedNodeTypes: validSelection.map((node) => node.type)
  };
}

function visitNode(node: SceneNode, items: Map<string, RawItem>, trail: string[]) {
  collectColorItems(node, items, trail);
  collectSizeItems(node, items, trail);

  if (node.type === "TEXT") {
    collectTextItems(node, items, trail);
  }

  if ("children" in node) {
    for (const child of node.children) {
      visitNode(child, items, [...trail, child.name]);
    }
  }
}

function collectColorItems(node: SceneNode, items: Map<string, RawItem>, trail: string[]) {
  if (!("fills" in node) || !Array.isArray(node.fills)) {
    return;
  }

  const category = inferColorCategory(node, trail);
  node.fills.forEach((paint) => {
    if (paint.type !== "SOLID" || paint.visible === false) {
      return;
    }

    const value = rgbaFromPaint(paint);
    const key = `color:${value.r}:${value.g}:${value.b}:${value.a}`;
    upsertItem(items, key, {
      id: key,
      group: "colors",
      category,
      type: "COLOR",
      name: buildColorTokenName(value),
      value,
      description: rgbaLabel(value),
      occurrences: 1,
      sources: [trail.join(" > ")]
    });
  });
}

function collectTextItems(node: TextNode, items: Map<string, RawItem>, trail: string[]) {
  const trimmedText = node.characters.trim();
  const textCategory = inferTextContentCategory(node, trimmedText, trail);
  if (trimmedText) {
    const key = `text:${trimmedText}`;
    upsertItem(items, key, {
      id: key,
      group: "texts",
      category: textCategory,
      type: "STRING",
      name: buildTextTokenName(textCategory, trimmedText, node.name),
      value: trimmedText,
      description: trimmedText,
      occurrences: 1,
      sources: [trail.join(" > ")]
    });
  }

  if (typeof node.fontSize === "number") {
    const sz = round(node.fontSize);
    const key = `scale:${sz}`;
    upsertItem(items, key, {
      id: key,
      group: "sizes",
      category: "typography/font-size",
      type: "FLOAT",
      name: buildSizeTokenName("typography/font-size", sz),
      value: sz,
      description: `${sz}px`,
      occurrences: 1,
      sources: [trail.join(" > ")]
    });
  }

  if (node.lineHeight !== figma.mixed && node.lineHeight.unit === "PIXELS") {
    const value = round(node.lineHeight.value);
    const key = `scale:${value}`;
    upsertItem(items, key, {
      id: key,
      group: "sizes",
      category: "typography/line-height",
      type: "FLOAT",
      name: buildSizeTokenName("typography/line-height", value),
      value,
      description: `${value}px`,
      occurrences: 1,
      sources: [trail.join(" > ")]
    });
  }
}

function collectSizeItems(node: SceneNode, items: Map<string, RawItem>, trail: string[]) {
  collectAutoLayoutSpacing(node, items, trail);

  // Only collect width/height from semantically meaningful contexts — not generic wrappers
  const context = getSemanticContext(node, trail);
  const hasMeaningfulSizeContext =
    context.includes("icon") ||
    context.includes("button") ||
    context.includes("avatar") ||
    context.includes("image") ||
    context.includes("card") ||
    context.includes("badge") ||
    context.includes("chip") ||
    context.includes("tag") ||
    context.includes("thumbnail");

  if (hasMeaningfulSizeContext && "width" in node) {
    const width = round(node.width);
    const widthKey = `scale:${width}`;
    const category = inferSizeCategory("width", node, trail);
    upsertItem(items, widthKey, {
      id: widthKey,
      group: "sizes",
      category,
      type: "FLOAT",
      name: buildSizeTokenName(category, width),
      value: width,
      description: `${width}px`,
      occurrences: 1,
      sources: [trail.join(" > ")]
    });
  }

  if (hasMeaningfulSizeContext && "height" in node) {
    const height = round(node.height);
    const heightKey = `scale:${height}`;
    const category = inferSizeCategory("height", node, trail);
    upsertItem(items, heightKey, {
      id: heightKey,
      group: "sizes",
      category,
      type: "FLOAT",
      name: buildSizeTokenName(category, height),
      value: height,
      description: `${height}px`,
      occurrences: 1,
      sources: [trail.join(" > ")]
    });
  }

  if ("cornerRadius" in node && typeof node.cornerRadius === "number" && node.cornerRadius > 0) {
    const radius = round(node.cornerRadius);
    const radiusKey = `scale:${radius}`;
    upsertItem(items, radiusKey, {
      id: radiusKey,
      group: "sizes",
      category: "shape/radius",
      type: "FLOAT",
      name: buildSizeTokenName("shape/radius", radius),
      value: radius,
      description: `${radius}px`,
      occurrences: 1,
      sources: [trail.join(" > ")]
    });
  }
}

function collectAutoLayoutSpacing(node: SceneNode, items: Map<string, RawItem>, trail: string[]) {
  if (!("layoutMode" in node) || node.layoutMode === "NONE") {
    return;
  }

  if ("itemSpacing" in node && typeof node.itemSpacing === "number") {
    const gap = round(node.itemSpacing);
    const key = `scale:${gap}`;            // unified key — same value = same token
    upsertItem(items, key, {
      id: key,
      group: "sizes",
      category: "layout/gap",
      type: "FLOAT",
      name: buildSizeTokenName("layout/gap", gap),
      value: gap,
      description: `${gap}px`,
      occurrences: 1,
      sources: [trail.join(" > ")]
    });
  }

  const paddings = [
    ["top", node.paddingTop],
    ["right", node.paddingRight],
    ["bottom", node.paddingBottom],
    ["left", node.paddingLeft]
  ] as const;

  for (const [_side, rawValue] of paddings) {
    if (typeof rawValue !== "number" || rawValue <= 0) {
      continue;
    }

    const value = round(rawValue);
    const key = `scale:${value}`;           // unified key — all floats merge by value
    upsertItem(items, key, {
      id: key,
      group: "sizes",
      category: "layout/gap",              // use gap category so name = spacing/N
      type: "FLOAT",
      name: buildSizeTokenName("layout/gap", value),
      value,
      description: `${value}px`,
      occurrences: 1,
      sources: [trail.join(" > ")]
    });
  }
}

function disambiguateNames<T extends { name: string }>(items: T[]): T[] {
  const count = new Map<string, number>();
  for (const item of items) {
    count.set(item.name, (count.get(item.name) ?? 0) + 1);
  }
  const index = new Map<string, number>();
  for (const item of items) {
    if ((count.get(item.name) ?? 1) <= 1) continue;
    const i = (index.get(item.name) ?? 0) + 1;
    index.set(item.name, i);
    if (i > 1) item.name = `${item.name}-${i}`;
  }
  return items;
}

function upsertItem(items: Map<string, RawItem>, key: string, incoming: RawItem) {
  const existing = items.get(key);
  if (!existing) {
    items.set(key, incoming);
    return;
  }

  existing.occurrences += 1;
  const sourceSet = new Set([...existing.sources, ...incoming.sources]);
  existing.sources = [...sourceSet].slice(0, 8);
}

function inferColorCategory(node: SceneNode, trail: string[]): string {
  const context = getSemanticContext(node, trail);
  const role = inferRole(context);

  if (node.type === "TEXT") {
    return role === "neutral" ? "text/neutral" : `text/${role}`;
  }
  if (context.includes("stroke") || context.includes("border") || context.includes("outline")) {
    return role === "neutral" ? "border/neutral" : `border/${role}`;
  }
  if (context.includes("icon")) {
    return role === "neutral" ? "icon/neutral" : `icon/${role}`;
  }
  if (context.includes("card") || context.includes("surface") || context.includes("panel") || context.includes("modal")) {
    return role === "neutral" ? "surface/neutral" : `surface/${role}`;
  }
  if (context.includes("button") || context.includes("cta") || context.includes("tag") || context.includes("badge")) {
    return role === "neutral" ? "action/neutral" : `action/${role}`;
  }
  return role === "neutral" ? "background/neutral" : `background/${role}`;
}

function inferTextContentCategory(node: TextNode, value: string, trail: string[]): string {
  const context = getSemanticContext(node, trail);
  const text = `${context} ${value}`.toLowerCase();
  const role = inferRole(text);

  if (text.includes("title") || text.includes("heading") || text.includes("hero")) {
    return role === "neutral" ? "heading" : `heading/${role}`;
  }
  if (text.includes("label") || text.includes("field")) {
    return role === "neutral" ? "label" : `label/${role}`;
  }
  if (text.includes("button") || text.includes("cta")) {
    return role === "neutral" ? "action" : `action/${role}`;
  }
  if (value.length > 80 || text.includes("paragraph") || text.includes("description")) {
    return role === "neutral" ? "body" : `body/${role}`;
  }
  return role === "neutral" ? "content" : `content/${role}`;
}

function inferSizeCategory(axis: "width" | "height", node: SceneNode, trail: string[]): string {
  const context = getSemanticContext(node, trail);

  if (context.includes("icon")) {
    return `icon/${axis}`;
  }
  if (context.includes("button")) {
    return `component/${axis}`;
  }
  if (context.includes("avatar") || context.includes("image")) {
    return `media/${axis}`;
  }
  if (context.includes("card") || context.includes("container") || context.includes("frame")) {
    return `layout/${axis}`;
  }
  return `dimension/${axis}`;
}

function getSemanticContext(node: SceneNode, trail: string[]): string {
  return `${node.type} ${trail.join(" ")}`.toLowerCase();
}

// Variables use flat, category-only names.
// Styles (buildColorStyleName) use full semantic paths — kept separate.

// 4 top-level groups, no sub-groups, locale-aware names.
// Same numeric value = same token regardless of category (spacing, radius, etc.)

function varGroup(type: "color" | "scale" | "content"): string {
  const map: Record<string, Record<string, string>> = {
    "en":    { color: "palette",  scale: "scale",  content: "content"   },
    "pt-BR": { color: "cores",    scale: "escala", content: "conteudo"  },
    "es":    { color: "paleta",   scale: "escala", content: "contenido" },
  };
  return (map[currentLocale] ?? map["en"])[type];
}

function buildColorTokenName(value: RgbaValue): string {
  return `${varGroup("color")}/${rgbaToPaletteName(value.r, value.g, value.b, value.a)}`;
}

function buildTextTokenName(_category: string, text: string, fallbackName: string): string {
  const slug = slugify(text).slice(0, 32) || slugify(fallbackName).slice(0, 32) || "text";
  return `${varGroup("content")}/${slug}`;
}

function buildSizeTokenName(_category: string, value: number): string {
  return `${varGroup("scale")}/${normalizeNumber(round(value))}`;
}

async function createVariables(payload: CreatePayload) {
  const includedItems = payload.items.filter((item) => item.include);
  if (includedItems.length === 0) {
    figma.notify(t("backend_no_items", currentLocale));
    postFeedback("warning", t("backend_no_checked", currentLocale));
    return;
  }

  const collectionName = payload.collectionName.trim() || "Selection Variables";
  const modeName = payload.modeName.trim() || "Base";
  const collection = await findOrCreateCollection(collectionName);
  const modeId = ensureMode(collection, modeName);

  // All variables in the file (all collections) keyed by type:name
  // Prevents cross-collection duplicates and avoids name mangling suffixes
  const allLocalVars = (await figma.variables.getLocalVariablesAsync())
    .filter((v) => isSupportedVariableKind(v.resolvedType));

  const fileVarsByKey = new Map<string, Variable>();
  for (const v of allLocalVars) {
    const key = buildVariableLookupKey(v.resolvedType, v.name);
    if (!fileVarsByKey.has(key)) fileVarsByKey.set(key, v);
  }

  // usedKeys covers entire file — avoids creating names that already exist anywhere
  const usedKeys = new Set<string>(fileVarsByKey.keys());
  const createdVariables = new Map<string, Variable>();

  let created = 0;
  let reused = 0;
  for (const item of includedItems) {
    const originalKey = buildVariableLookupKey(item.type, item.name);
    const fileExisting = fileVarsByKey.get(originalKey);

    if (fileExisting) {
      // Variable exists anywhere in file → reuse it
      createdVariables.set(item.id, fileExisting);
      // Only update value if it belongs to the target collection (don't mutate foreign collections)
      if (fileExisting.variableCollectionId === collection.id) {
        if (item.type === "COLOR") fileExisting.setValueForMode(modeId, item.value as RGBA);
        else if (item.type === "STRING") fileExisting.setValueForMode(modeId, item.value as string);
        else fileExisting.setValueForMode(modeId, Number(item.value));
      }
      reused += 1;
      continue;
    }

    // Truly new — generate unique name and create in target collection
    const safeName = ensureUniqueVariableName(item.name, item.type, item.id, usedKeys);
    if (!safeName) continue;

    const variable = figma.variables.createVariable(safeName, collection, item.type);
    const variableKey = buildVariableLookupKey(item.type, safeName);
    fileVarsByKey.set(variableKey, variable);
    usedKeys.add(variableKey);
    created += 1;

    createdVariables.set(item.id, variable);

    if (item.type === "COLOR") {
      variable.setValueForMode(modeId, item.value as RGBA);
    } else if (item.type === "STRING") {
      variable.setValueForMode(modeId, item.value as string);
    } else {
      variable.setValueForMode(modeId, Number(item.value));
    }
  }

  let bound = 0;
  if (payload.bindToSelection) {
    bound = bindVariablesToSelection(includedItems, createdVariables);
  }

  const bindMessage = payload.bindToSelection
    ? t("backend_variables_bindings", currentLocale, { bound })
    : "";
  figma.notify(t("backend_variables_created", currentLocale, { created, reused, collection: collectionName }) + bindMessage);
  postFeedback(
    "success",
    t("backend_variables_created", currentLocale, { created, reused, collection: collectionName }) + bindMessage
  );
  await postCollectionsData();
}

type StyleVariableLookup = {
  colorByValue: Map<string, Variable>;
  floatByValue: Map<string, Variable>;
  stringByValue: Map<string, Variable>;
};

type LocalStyle = TextStyle | PaintStyle | EffectStyle;

async function getStyleVariableLookup(): Promise<StyleVariableLookup> {
  const prefs = await figma.clientStorage.getAsync("ui-prefs");
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const collectionById = new Map(collections.map((collection) => [collection.id, collection]));
  const preferredCollection =
    prefs && typeof prefs.collectionName === "string"
      ? collections.find((collection) => collection.name === prefs.collectionName)
      : undefined;
  const preferredModeId = preferredCollection
    ? preferredCollection.modes.find((mode) => mode.name === (prefs && prefs.modeName))?.modeId ?? preferredCollection.modes[0]?.modeId
    : undefined;

  const variables = (await figma.variables.getLocalVariablesAsync())
    .filter((variable) => isSupportedVariableKind(variable.resolvedType))
    .sort((a, b) => {
      const aPreferred = a.variableCollectionId === preferredCollection?.id ? 1 : 0;
      const bPreferred = b.variableCollectionId === preferredCollection?.id ? 1 : 0;
      return bPreferred - aPreferred;
    });

  const lookup: StyleVariableLookup = {
    colorByValue: new Map(),
    floatByValue: new Map(),
    stringByValue: new Map()
  };

  for (const variable of variables) {
    const collection = collectionById.get(variable.variableCollectionId);
    const modeId =
      variable.variableCollectionId === preferredCollection?.id
        ? preferredModeId
        : collection?.modes[0]?.modeId;

    if (!modeId) {
      continue;
    }

    const value = variable.valuesByMode[modeId];
    if (variable.resolvedType === "COLOR" && isRgbaValue(value)) {
      const key = rgbaKey(value);
      if (!lookup.colorByValue.has(key)) {
        lookup.colorByValue.set(key, variable);
      }
      continue;
    }

    if (variable.resolvedType === "FLOAT" && typeof value === "number") {
      const key = numberKey(value);
      if (!lookup.floatByValue.has(key)) {
        lookup.floatByValue.set(key, variable);
      }
      continue;
    }

    if (variable.resolvedType === "STRING" && typeof value === "string") {
      const key = stringKey(value);
      if (!lookup.stringByValue.has(key)) {
        lookup.stringByValue.set(key, variable);
      }
    }
  }

  return lookup;
}

function getRenamedStyleMap(styles?: Array<{ key: string; name: string }>) {
  return new Map((styles ?? []).map((style) => [style.key, style.name]));
}

function getLocalStylesByName<T extends LocalStyle>(styles: T[]) {
  const map = new Map<string, T>();
  for (const style of styles) {
    map.set(style.name, style);
  }
  return map;
}

function getOrCreateStyleByName<T extends LocalStyle>(
  existingStyles: Map<string, T>,
  styleName: string,
  createStyle: () => T,
) {
  let style = existingStyles.get(styleName);
  const created = !style;

  if (!style) {
    style = createStyle();
    style.name = styleName;
    existingStyles.set(styleName, style);
  }

  return {
    style,
    created
  };
}

function bindVariablesToTextStyle(style: TextStyle, candidate: TextStyleCandidate, lookup: StyleVariableLookup) {
  const fontSizeVariable = lookup.floatByValue.get(numberKey(candidate.signature.fontSize));
  if (fontSizeVariable) {
    safeBindTextStyleVariable(style, "fontSize", fontSizeVariable);
  }

  if (candidate.signature.lineHeight.unit === "PIXELS" && typeof candidate.signature.lineHeight.value === "number") {
    const lineHeightVariable = lookup.floatByValue.get(numberKey(candidate.signature.lineHeight.value));
    if (lineHeightVariable) {
      safeBindTextStyleVariable(style, "lineHeight", lineHeightVariable);
    }
  }

  if (candidate.signature.letterSpacing.unit === "PIXELS" || candidate.signature.letterSpacing.unit === "PERCENT") {
    const letterSpacingVariable = lookup.floatByValue.get(numberKey(candidate.signature.letterSpacing.value));
    if (letterSpacingVariable) {
      safeBindTextStyleVariable(style, "letterSpacing", letterSpacingVariable);
    }
  }

  if (candidate.signature.paragraphSpacing > 0) {
    const paragraphSpacingVariable = lookup.floatByValue.get(numberKey(candidate.signature.paragraphSpacing));
    if (paragraphSpacingVariable) {
      safeBindTextStyleVariable(style, "paragraphSpacing", paragraphSpacingVariable);
    }
  }

  const fontFamilyVariable = lookup.stringByValue.get(stringKey(candidate.signature.fontName.family));
  if (fontFamilyVariable) {
    safeBindTextStyleVariable(style, "fontFamily", fontFamilyVariable);
  }

  const fontStyleVariable = lookup.stringByValue.get(stringKey(candidate.signature.fontName.style));
  if (fontStyleVariable) {
    safeBindTextStyleVariable(style, "fontStyle", fontStyleVariable);
  }
}

function buildPaintStylePaints(candidate: ColorStyleCandidate, lookup: StyleVariableLookup): Paint[] {
  const basePaint = solidPaintFromRgba(candidate.value);
  const colorVariable = lookup.colorByValue.get(rgbaKey(candidate.value));
  if (!colorVariable) {
    return [basePaint];
  }

  return [figma.variables.setBoundVariableForPaint(basePaint, "color", colorVariable)];
}

function buildEffectStyleEffects(candidate: EffectStyleCandidate, lookup: StyleVariableLookup): Effect[] {
  return cloneEffects(candidate.effects).map((effect) => bindVariablesToEffect(effect, lookup));
}

function bindVariablesToEffect(effect: Effect, lookup: StyleVariableLookup): Effect {
  let currentEffect = effect;

  if ("color" in currentEffect && isRgbaValue(currentEffect.color)) {
    const colorVariable = lookup.colorByValue.get(rgbaKey(currentEffect.color));
    if (colorVariable) {
      currentEffect = safeBindEffectVariable(currentEffect, "color", colorVariable);
    }
  }

  if ("radius" in currentEffect && typeof currentEffect.radius === "number") {
    const radiusVariable = lookup.floatByValue.get(numberKey(currentEffect.radius));
    if (radiusVariable) {
      currentEffect = safeBindEffectVariable(currentEffect, "radius", radiusVariable);
    }
  }

  if ("spread" in currentEffect && typeof currentEffect.spread === "number") {
    const spreadVariable = lookup.floatByValue.get(numberKey(currentEffect.spread));
    if (spreadVariable) {
      currentEffect = safeBindEffectVariable(currentEffect, "spread", spreadVariable);
    }
  }

  if (hasEffectOffset(currentEffect)) {
    const offset = currentEffect.offset;

    if (typeof offset.x === "number") {
      const offsetXVariable = lookup.floatByValue.get(numberKey(offset.x));
      if (offsetXVariable) {
        currentEffect = safeBindEffectVariable(currentEffect, "offsetX", offsetXVariable);
      }
    }

    if (typeof offset.y === "number") {
      const offsetYVariable = lookup.floatByValue.get(numberKey(offset.y));
      if (offsetYVariable) {
        currentEffect = safeBindEffectVariable(currentEffect, "offsetY", offsetYVariable);
      }
    }
  }

  return currentEffect;
}

function safeBind(node: SceneNode, field: VariableBindableNodeField, variable: Variable): boolean {
  try {
    node.setBoundVariable(field, variable);
    return true;
  } catch {
    return false;
  }
}

function safeBindTextStyleVariable(style: TextStyle, field: VariableBindableTextField, variable: Variable) {
  try {
    style.setBoundVariable(field, variable);
  } catch {}
}

function safeBindEffectVariable(effect: Effect, field: VariableBindableEffectField, variable: Variable): Effect {
  try {
    return figma.variables.setBoundVariableForEffect(effect, field, variable);
  } catch {
    return effect;
  }
}

function warnNoStyleCandidates(labelKey: string) {
  const label = t(labelKey, currentLocale);
  const message = t("backend_no_style_candidates", currentLocale, { label });
  figma.notify(message);
  postFeedback("warning", message);
}

function finalizeStyleCreation(
  labelKey: "label_text_styles" | "label_color_styles" | "label_effect_styles",
  created: number,
  reused: number,
  applied: number,
  applyToSelection: boolean,
) {
  const label = t(labelKey, currentLocale);
  let message: string;
  if (!applyToSelection) {
    message = t("backend_style_created", currentLocale, { created, label, reused });
  } else if (labelKey === "label_text_styles") {
    message = t("backend_style_created_text_applied", currentLocale, { created, label, reused, applied });
  } else {
    message = t("backend_style_created_layers_applied", currentLocale, { created, label, reused, applied });
  }
  figma.notify(message);
  postFeedback("success", message);
}

async function createTextStyles(payload: CreateTextStylesPayload) {
  const candidates = collectTextStyleCandidates();
  const renamedStyles = getRenamedStyleMap(payload.styles);
  if (candidates.length === 0) {
    warnNoStyleCandidates("label_typography_styles");
    return;
  }

  const existingStyles = getLocalStylesByName(await figma.getLocalTextStylesAsync());
  const createdStyles = new Map<string, TextStyle>();
  const variableLookup = await getStyleVariableLookup();
  let created = 0;
  let reused = 0;

  for (const candidate of candidates) {
    await figma.loadFontAsync(candidate.signature.fontName);
    const styleName = renamedStyles.get(candidate.key)?.trim() || candidate.name;
    const result = getOrCreateStyleByName(existingStyles, styleName, () => figma.createTextStyle());
    const style = result.style;

    if (result.created) {
      created += 1;
    } else {
      reused += 1;
    }

    applyTextStyleSignature(style, candidate.signature);
    bindVariablesToTextStyle(style, candidate, variableLookup);
    createdStyles.set(candidate.key, style);
  }

  let applied = 0;
  if (payload.applyToSelection) {
    applied = await applyTextStylesToSelection(candidates, createdStyles);
  }

  finalizeStyleCreation("label_text_styles", created, reused, applied, payload.applyToSelection);
  postTextStylesResult(candidates, {
    textNodesFound: candidates.reduce((acc, candidate) => acc + new Set(candidate.ranges.map((range) => range.nodeId)).size, 0),
    styledSegmentsRead: candidates.reduce((acc, candidate) => acc + candidate.ranges.length, 0),
    styleCandidatesGenerated: candidates.length
  });
  postScanResult(true);
}

async function createColorStyles(payload: CreateColorStylesPayload) {
  const candidates = collectColorStyleCandidatesFromNodes(figma.currentPage.selection.filter(isAllowedSelectionNode));
  const renamedStyles = getRenamedStyleMap(payload.styles);
  if (candidates.length === 0) {
    warnNoStyleCandidates("label_color_styles");
    return;
  }

  const existingStyles = getLocalStylesByName(await figma.getLocalPaintStylesAsync());
  const createdStyles = new Map<string, PaintStyle>();
  const variableLookup = await getStyleVariableLookup();
  let created = 0;
  let reused = 0;

  for (const candidate of candidates) {
    const styleName = renamedStyles.get(candidate.key)?.trim() || candidate.name;
    const result = getOrCreateStyleByName(existingStyles, styleName, () => figma.createPaintStyle());
    const style = result.style;

    if (result.created) {
      created += 1;
    } else {
      reused += 1;
    }

    style.paints = buildPaintStylePaints(candidate, variableLookup);
    createdStyles.set(candidate.key, style);
  }

  let applied = 0;
  if (payload.applyToSelection) {
    applied = await applyColorStylesToSelection(candidates, createdStyles);
  }

  finalizeStyleCreation("label_color_styles", created, reused, applied, payload.applyToSelection);
  postColorStylesResult(candidates);
  postScanResult(true);
}

async function createEffectStyles(payload: CreateEffectStylesPayload) {
  const candidates = collectEffectStyleCandidatesFromNodes(figma.currentPage.selection.filter(isAllowedSelectionNode));
  const renamedStyles = getRenamedStyleMap(payload.styles);
  if (candidates.length === 0) {
    warnNoStyleCandidates("label_effect_styles");
    return;
  }

  const existingStyles = getLocalStylesByName(await figma.getLocalEffectStylesAsync());
  const createdStyles = new Map<string, EffectStyle>();
  const variableLookup = await getStyleVariableLookup();
  let created = 0;
  let reused = 0;

  for (const candidate of candidates) {
    const styleName = renamedStyles.get(candidate.key)?.trim() || candidate.name;
    const result = getOrCreateStyleByName(existingStyles, styleName, () => figma.createEffectStyle());
    const style = result.style;

    if (result.created) {
      created += 1;
    } else {
      reused += 1;
    }

    style.effects = buildEffectStyleEffects(candidate, variableLookup);
    createdStyles.set(candidate.key, style);
  }

  let applied = 0;
  if (payload.applyToSelection) {
    applied = await applyEffectStylesToSelection(candidates, createdStyles);
  }

  finalizeStyleCreation("label_effect_styles", created, reused, applied, payload.applyToSelection);
  postEffectStylesResult(candidates);
  postScanResult(true);
}

function bindVariablesToSelection(items: VariableDraft[], variableMap: Map<string, Variable>): number {
  const itemById = new Map(items.map((item) => [item.id, item]));
  const colorByRgbaKey = new Map(
    items
      .filter((item) => item.type === "COLOR")
      .map((item) => {
        const v = item.value as RgbaValue;
        return [rgbaKey(v), item] as const;
      })
  );

  let boundCount = 0;
  for (const node of figma.currentPage.selection) {
    boundCount += bindVariablesInNode(node, itemById, colorByRgbaKey, variableMap);
  }
  return boundCount;
}

function collectTextStyleCandidates(): TextStyleCandidate[] {
  const validSelection = figma.currentPage.selection.filter(isAllowedSelectionNode);
  return collectTextStyleCandidatesFromNodes(validSelection).candidates;
}

function collectColorStyleCandidatesFromNodes(validSelection: Array<GroupNode | FrameNode | SectionNode>): ColorStyleCandidate[] {
  const candidates = new Map<string, ColorStyleCandidate>();

  for (const node of validSelection) {
    visitColorNodes(node, [node.name], (currentNode, trail) => {
      if (!("fills" in currentNode) || !Array.isArray(currentNode.fills)) {
        return;
      }

      const category = inferColorCategory(currentNode, trail);
      for (const paint of currentNode.fills) {
        if (paint.type !== "SOLID" || paint.visible === false) {
          continue;
        }

        const value = rgbaFromPaint(paint);
        const key = `color-style:${value.r}:${value.g}:${value.b}:${value.a}`;
        const existing = candidates.get(key);
        if (existing) {
          existing.occurrences += 1;
          existing.nodeIds.push(currentNode.id);
          continue;
        }

        candidates.set(key, {
          key,
          name: buildColorStyleName(category, trail),
          category,
          value,
          occurrences: 1,
          nodeIds: [currentNode.id]
        });
      }
    });
  }

  return disambiguateNames([...candidates.values()].sort((a, b) => {
    if (b.occurrences !== a.occurrences) {
      return b.occurrences - a.occurrences;
    }
    return a.name.localeCompare(b.name);
  }));
}

function collectEffectStyleCandidatesFromNodes(validSelection: Array<GroupNode | FrameNode | SectionNode>): EffectStyleCandidate[] {
  const candidates = new Map<string, EffectStyleCandidate>();

  for (const node of validSelection) {
    visitColorNodes(node, [node.name], (currentNode, trail) => {
      if (!("effects" in currentNode) || !Array.isArray(currentNode.effects) || currentNode.effects.length === 0) {
        return;
      }

      const visibleEffects = currentNode.effects.filter((effect) => effect.visible !== false);
      if (visibleEffects.length === 0) {
        return;
      }

      const key = buildEffectStyleKey(visibleEffects);
      const category = inferEffectCategory(currentNode, trail);
      const existing = candidates.get(key);
      if (existing) {
        existing.occurrences += 1;
        existing.nodeIds.push(currentNode.id);
        return;
      }

      candidates.set(key, {
        key,
        name: buildEffectStyleName(category, visibleEffects),
        category,
        effects: cloneEffects(visibleEffects),
        occurrences: 1,
        nodeIds: [currentNode.id]
      });
    });
  }

  return disambiguateNames([...candidates.values()].sort((a, b) => {
    if (b.occurrences !== a.occurrences) {
      return b.occurrences - a.occurrences;
    }
    return a.name.localeCompare(b.name);
  }));
}

function visitColorNodes(node: SceneNode, trail: string[], callback: (node: SceneNode, trail: string[]) => void) {
  callback(node, trail);

  if ("children" in node) {
    for (const child of node.children) {
      visitColorNodes(child, [...trail, child.name], callback);
    }
  }
}

function collectTextStyleCandidatesFromNodes(validSelection: Array<GroupNode | FrameNode | SectionNode>): {
  candidates: TextStyleCandidate[];
  diagnostics: TextStyleDiagnostics;
} {
  const candidates = new Map<string, TextStyleCandidate>();
  const diagnostics = emptyTextStyleDiagnostics();

  for (const node of validSelection) {
    visitTextNodes(node, [node.name], (textNode, trail) => {
      diagnostics.textNodesFound += 1;
      const segments = getTextStyleSegments(textNode);
      diagnostics.styledSegmentsRead += segments.length;
      for (const segment of segments) {
        const key = buildTextStyleSignatureKey(segment.signature);
        const existing = candidates.get(key);
        if (existing) {
          existing.occurrences += 1;
          existing.ranges.push({
            nodeId: textNode.id,
            start: segment.start,
            end: segment.end
          });
          continue;
        }

        candidates.set(key, {
          key,
          name: buildTextStyleName(textNode, trail, segment.signature),
          signature: segment.signature,
          occurrences: 1,
          ranges: [
            {
              nodeId: textNode.id,
              start: segment.start,
              end: segment.end
            }
          ]
        });
      }
    });
  }

  const sortedCandidates = disambiguateNames([...candidates.values()]
    .sort((a, b) => {
      if (b.occurrences !== a.occurrences) {
        return b.occurrences - a.occurrences;
      }
      return a.name.localeCompare(b.name);
    }));
  diagnostics.styleCandidatesGenerated = sortedCandidates.length;
  return {
    candidates: sortedCandidates,
    diagnostics
  };
}

function visitTextNodes(node: SceneNode, trail: string[], callback: (node: TextNode, trail: string[]) => void) {
  if (node.type === "TEXT") {
    callback(node, trail);
  }

  if ("children" in node) {
    for (const child of node.children) {
      visitTextNodes(child, [...trail, child.name], callback);
    }
  }
}

function getTextStyleSegments(node: TextNode): Array<{ signature: TextStyleSignature; start: number; end: number }> {
  const nodeLevelSignature = getTextStyleSignature(node);
  if (nodeLevelSignature) {
    return [
      {
        signature: nodeLevelSignature,
        start: 0,
        end: node.characters.length
      }
    ];
  }

  const segments = node.getStyledTextSegments([
    "fontName",
    "fontSize",
    "lineHeight",
    "letterSpacing",
    "textCase",
    "textDecoration"
  ]);

  const results: Array<{ signature: TextStyleSignature; start: number; end: number }> = [];
  for (const segment of segments) {
    if (typeof segment.fontSize !== "number") {
      continue;
    }

    results.push({
      signature: {
        fontName: segment.fontName,
        fontSize: round(segment.fontSize),
        lineHeight: cloneLineHeight(segment.lineHeight),
        letterSpacing: cloneLetterSpacing(segment.letterSpacing),
        paragraphSpacing: round(node.paragraphSpacing),
        textCase: segment.textCase,
        textDecoration: segment.textDecoration
      },
      start: segment.start,
      end: segment.end
    });
  }

  if (results.length === 0 && node.characters.length > 0) {
    const rangeSignature = getTextStyleSignatureFromRange(node, 0, Math.min(1, node.characters.length));
    if (rangeSignature) {
      results.push({
        signature: rangeSignature,
        start: 0,
        end: node.characters.length
      });
    }
  }

  return results;
}

function getTextStyleSignatureFromRange(node: TextNode, start: number, end: number): TextStyleSignature | null {
  const fontName = node.getRangeFontName(start, end);
  const fontSize = node.getRangeFontSize(start, end);
  const lineHeight = node.getRangeLineHeight(start, end);
  const letterSpacing = node.getRangeLetterSpacing(start, end);
  const textCase = node.getRangeTextCase(start, end);
  const textDecoration = node.getRangeTextDecoration(start, end);

  if (fontName === figma.mixed || fontSize === figma.mixed || typeof fontSize !== "number") {
    return null;
  }

  return {
    fontName,
    fontSize: round(fontSize),
    lineHeight: cloneLineHeight(lineHeight === figma.mixed ? { unit: "AUTO" } : lineHeight),
    letterSpacing: cloneLetterSpacing(letterSpacing === figma.mixed ? { unit: "PIXELS", value: 0 } : letterSpacing),
    paragraphSpacing: round(node.paragraphSpacing),
    textCase: textCase === figma.mixed ? "ORIGINAL" : textCase,
    textDecoration: textDecoration === figma.mixed ? "NONE" : textDecoration
  };
}

function getTextStyleSignature(node: TextNode): TextStyleSignature | null {
  if (node.fontName === figma.mixed || node.fontSize === figma.mixed) {
    return null;
  }

  if (typeof node.fontSize !== "number") {
    return null;
  }

  return {
    fontName: node.fontName,
    fontSize: round(node.fontSize),
    lineHeight: cloneLineHeight(node.lineHeight === figma.mixed ? { unit: "AUTO" } : node.lineHeight),
    letterSpacing: cloneLetterSpacing(node.letterSpacing === figma.mixed ? { unit: "PIXELS", value: 0 } : node.letterSpacing),
    paragraphSpacing: round(node.paragraphSpacing),
    textCase: node.textCase === figma.mixed ? "ORIGINAL" : node.textCase,
    textDecoration: node.textDecoration === figma.mixed ? "NONE" : node.textDecoration
  };
}

function buildTextStyleSignatureKey(signature: TextStyleSignature) {
  return JSON.stringify({
    family: signature.fontName.family,
    style: signature.fontName.style,
    size: signature.fontSize,
    lineHeight: signature.lineHeight,
    letterSpacing: signature.letterSpacing,
    paragraphSpacing: signature.paragraphSpacing,
    textCase: signature.textCase,
    textDecoration: signature.textDecoration
  });
}

function buildTextStyleName(node: TextNode, trail: string[], signature: TextStyleSignature) {
  const category = inferTextStyleCategory(node, trail);
  const scale = inferTextStyleScale(signature.fontSize);
  const weight = slugify(signature.fontName.style).replace(/-/g, "") || "regular";
  return `typography/${category}/${scale}/${weight}`;
}

function buildColorStyleName(category: string, trail: string[]): string {
  const state = inferState(trail.join(" ").toLowerCase());
  return `color/${category}/${state}`;
}

function buildEffectStyleName(category: string, effects: Effect[]) {
  const primaryType = effects[0]?.type.toLowerCase().replace(/_/g, "-") || "effect";
  return `effect/${slugify(category)}/${primaryType}`;
}

function buildEffectStyleKey(effects: Effect[]) {
  return JSON.stringify(serializeEffects(effects));
}

function inferEffectCategory(node: SceneNode, trail: string[]) {
  const context = getSemanticContext(node, trail);
  if (context.includes("button") || context.includes("cta")) {
    return "action";
  }
  if (context.includes("card") || context.includes("modal") || context.includes("panel")) {
    return "surface";
  }
  if (context.includes("image") || context.includes("media")) {
    return "media";
  }
  return "layer";
}

function inferTextStyleCategory(node: TextNode, trail: string[]) {
  const context = getSemanticContext(node, trail);
  const text = `${context} ${node.characters}`.toLowerCase();
  if (text.includes("hero") || text.includes("heading") || text.includes("title")) {
    return "heading";
  }
  if (text.includes("label") || text.includes("field")) {
    return "label";
  }
  if (text.includes("button") || text.includes("cta")) {
    return "action";
  }
  if (node.characters.trim().length > 80 || text.includes("description") || text.includes("paragraph")) {
    return "body";
  }
  return "content";
}

function inferTextStyleScale(fontSize: number) {
  if (fontSize >= 40) {
    return "2xl";
  }
  if (fontSize >= 32) {
    return "xl";
  }
  if (fontSize >= 24) {
    return "lg";
  }
  if (fontSize >= 18) {
    return "md";
  }
  if (fontSize >= 14) {
    return "sm";
  }
  return "xs";
}

function cloneLineHeight(lineHeight: LineHeight): LineHeight {
  if (lineHeight.unit === "AUTO") {
    return { unit: "AUTO" };
  }
  return {
    unit: lineHeight.unit,
    value: round(lineHeight.value)
  };
}

function cloneLetterSpacing(letterSpacing: LetterSpacing): LetterSpacing {
  return {
    unit: letterSpacing.unit,
    value: round(letterSpacing.value)
  };
}

function applyTextStyleSignature(style: TextStyle, signature: TextStyleSignature) {
  style.fontName = signature.fontName;
  style.fontSize = signature.fontSize;
  style.lineHeight = cloneLineHeight(signature.lineHeight);
  style.letterSpacing = cloneLetterSpacing(signature.letterSpacing);
  style.paragraphSpacing = signature.paragraphSpacing;
  style.textCase = signature.textCase;
  style.textDecoration = signature.textDecoration;
}

async function applyTextStylesToSelection(candidates: TextStyleCandidate[], styleMap: Map<string, TextStyle>) {
  let applied = 0;
  const candidateRanges = new Map<string, Array<{ candidate: TextStyleCandidate; start: number; end: number }>>();

  for (const candidate of candidates) {
    for (const range of candidate.ranges) {
      const current = candidateRanges.get(range.nodeId) ?? [];
      current.push({
        candidate,
        start: range.start,
        end: range.end
      });
      candidateRanges.set(range.nodeId, current);
    }
  }

  for (const node of figma.currentPage.selection.filter(isAllowedSelectionNode)) {
    applied += await applyTextStylesInNode(node, candidateRanges, styleMap);
  }

  return applied;
}

async function applyEffectStylesToSelection(candidates: EffectStyleCandidate[], styleMap: Map<string, EffectStyle>) {
  const candidateByNodeId = new Map<string, EffectStyleCandidate>();
  for (const candidate of candidates) {
    for (const nodeId of candidate.nodeIds) {
      if (!candidateByNodeId.has(nodeId)) {
        candidateByNodeId.set(nodeId, candidate);
      }
    }
  }

  let applied = 0;
  for (const node of figma.currentPage.selection.filter(isAllowedSelectionNode)) {
    applied += await applyEffectStylesInNode(node, candidateByNodeId, styleMap);
  }
  return applied;
}

async function applyEffectStylesInNode(
  node: SceneNode,
  candidateByNodeId: Map<string, EffectStyleCandidate>,
  styleMap: Map<string, EffectStyle>
): Promise<number> {
  let applied = 0;
  const candidate = candidateByNodeId.get(node.id);
  const style = candidate ? styleMap.get(candidate.key) : null;
  if (style && "effectStyleId" in node && "effects" in node && Array.isArray(node.effects) && node.effects.length > 0) {
    await (node as SceneNode & { setEffectStyleIdAsync(id: string): Promise<void> }).setEffectStyleIdAsync(style.id);
    applied += 1;
  }

  if ("children" in node) {
    for (const child of node.children) {
      applied += await applyEffectStylesInNode(child, candidateByNodeId, styleMap);
    }
  }

  return applied;
}

async function applyColorStylesToSelection(candidates: ColorStyleCandidate[], styleMap: Map<string, PaintStyle>) {
  const candidateByNodeId = new Map<string, ColorStyleCandidate>();
  for (const candidate of candidates) {
    for (const nodeId of candidate.nodeIds) {
      if (!candidateByNodeId.has(nodeId)) {
        candidateByNodeId.set(nodeId, candidate);
      }
    }
  }

  let applied = 0;
  for (const node of figma.currentPage.selection.filter(isAllowedSelectionNode)) {
    applied += await applyColorStylesInNode(node, candidateByNodeId, styleMap);
  }
  return applied;
}

async function applyColorStylesInNode(
  node: SceneNode,
  candidateByNodeId: Map<string, ColorStyleCandidate>,
  styleMap: Map<string, PaintStyle>
): Promise<number> {
  let applied = 0;

  const candidate = candidateByNodeId.get(node.id);
  const style = candidate ? styleMap.get(candidate.key) : null;
  if (style && "fillStyleId" in node && "fills" in node && Array.isArray(node.fills) && node.fills.length > 0) {
    await (node as SceneNode & { setFillStyleIdAsync(id: string): Promise<void> }).setFillStyleIdAsync(style.id);
    applied += 1;
  }

  if ("children" in node) {
    for (const child of node.children) {
      applied += await applyColorStylesInNode(child, candidateByNodeId, styleMap);
    }
  }

  return applied;
}

async function applyTextStylesInNode(
  node: SceneNode,
  candidateRanges: Map<string, Array<{ candidate: TextStyleCandidate; start: number; end: number }>>,
  styleMap: Map<string, TextStyle>
): Promise<number> {
  let applied = 0;

  if (node.type === "TEXT") {
    const ranges = candidateRanges.get(node.id) ?? [];
    for (const range of ranges) {
      const style = styleMap.get(range.candidate.key);
      if (!style) {
        continue;
      }

      await figma.loadFontAsync(style.fontName);
      await node.setRangeTextStyleIdAsync(range.start, range.end, style.id);
      applied += 1;
    }
  }

  if ("children" in node) {
    for (const child of node.children) {
      applied += await applyTextStylesInNode(child, candidateRanges, styleMap);
    }
  }

  return applied;
}

function bindVariablesInNode(
  node: SceneNode,
  itemById: Map<string, VariableDraft>,
  colorByRgbaKey: Map<string, VariableDraft>,
  variableMap: Map<string, Variable>
): number {
  let applied = 0;

  if ("fills" in node && Array.isArray(node.fills)) {
    const updatedFills = [...node.fills];
    let fillsChanged = false;

    updatedFills.forEach((paint, index) => {
      if (paint.type !== "SOLID" || paint.visible === false) {
        return;
      }

      const match = colorByRgbaKey.get(rgbaKey(rgbaFromPaint(paint)));
      const variable = match ? variableMap.get(match.id) : null;
      if (!variable) {
        return;
      }

      updatedFills[index] = figma.variables.setBoundVariableForPaint(paint, "color", variable);
      fillsChanged = true;
      applied += 1;
    });

    if (fillsChanged) {
      node.fills = updatedFills;
    }
  }

  if ("width" in node) {
    const match = itemById.get(`width:${round(node.width)}`);
    const variable = match ? variableMap.get(match.id) : null;
    if (variable && safeBind(node, "width", variable)) applied += 1;
  }

  if ("height" in node) {
    const match = itemById.get(`height:${round(node.height)}`);
    const variable = match ? variableMap.get(match.id) : null;
    if (variable && safeBind(node, "height", variable)) applied += 1;
  }

  if ("layoutMode" in node && node.layoutMode !== "NONE") {
    applied += bindAutoLayoutVariables(node, itemById, variableMap);
  }

  if ("cornerRadius" in node && typeof node.cornerRadius === "number" && node.cornerRadius > 0) {
    const radius = round(node.cornerRadius);
    const match = itemById.get(`radius:${radius}`);
    const variable = match ? variableMap.get(match.id) : null;
    if (variable && hasUniformCornerRadius(node)) {
      if (safeBind(node, "topLeftRadius", variable)) applied += 1;
      if (safeBind(node, "topRightRadius", variable)) applied += 1;
      if (safeBind(node, "bottomLeftRadius", variable)) applied += 1;
      if (safeBind(node, "bottomRightRadius", variable)) applied += 1;
    }
  }

  if (node.type === "TEXT") {
    applied += bindTextVariables(node, itemById, variableMap);
  }

  if ("children" in node) {
    for (const child of node.children) {
      applied += bindVariablesInNode(child, itemById, colorByRgbaKey, variableMap);
    }
  }

  return applied;
}

function bindTextVariables(node: TextNode, itemById: Map<string, VariableDraft>, variableMap: Map<string, Variable>): number {
  let applied = 0;
  const characters = node.characters.trim();
  if (characters) {
    const match = itemById.get(`text:${characters}`);
    const variable = match ? variableMap.get(match.id) : null;
    if (variable && safeBind(node, "characters", variable)) applied += 1;
  }

  if (typeof node.fontSize === "number") {
    const fontSize = round(node.fontSize);
    const match = itemById.get(`font-size:${fontSize}`);
    const variable = match ? variableMap.get(match.id) : null;
    if (variable && safeBind(node, "fontSize", variable)) applied += 1;
  }

  if (node.lineHeight !== figma.mixed && node.lineHeight.unit === "PIXELS") {
    const value = round(node.lineHeight.value);
    const match = itemById.get(`line-height:${value}`);
    const variable = match ? variableMap.get(match.id) : null;
    if (variable && safeBind(node, "lineHeight", variable)) applied += 1;
  }

  return applied;
}

function bindAutoLayoutVariables(
  node: SceneNode & AutoLayoutMixin,
  itemById: Map<string, VariableDraft>,
  variableMap: Map<string, Variable>,
): number {
  let applied = 0;

  if (typeof node.itemSpacing === "number") {
    const spacing = round(node.itemSpacing);
    const match = itemById.get(`gap:${spacing}`);
    const variable = match ? variableMap.get(match.id) : null;
    if (variable && safeBind(node, "itemSpacing", variable)) applied += 1;
  }

  const bindings: Array<[VariableBindableNodeField, number, string]> = [
    ["paddingTop", node.paddingTop, "padding-top"],
    ["paddingRight", node.paddingRight, "padding-right"],
    ["paddingBottom", node.paddingBottom, "padding-bottom"],
    ["paddingLeft", node.paddingLeft, "padding-left"],
  ];

  for (const [field, rawValue, prefix] of bindings) {
    if (typeof rawValue !== "number" || rawValue <= 0) {
      continue;
    }
    const value = round(rawValue);
    const match = itemById.get(`${prefix}:${value}`);
    const variable = match ? variableMap.get(match.id) : null;
    if (variable && safeBind(node, field, variable)) applied += 1;
  }

  return applied;
}

function ensureMode(collection: VariableCollection, modeName: string): string {
  const existingMode = collection.modes.find((mode) => mode.name === modeName);
  if (existingMode) {
    return existingMode.modeId;
  }

  if (collection.modes.length === 1 && collection.modes[0].name === "Mode 1") {
    collection.renameMode(collection.modes[0].modeId, modeName);
    return collection.modes[0].modeId;
  }

  return collection.addMode(modeName);
}

async function findOrCreateCollection(collectionName: string): Promise<VariableCollection> {
  const existing = (await figma.variables.getLocalVariableCollectionsAsync())
    .find((collection) => collection.name === collectionName);

  if (existing) {
    return existing;
  }

  return figma.variables.createVariableCollection(collectionName);
}

function postFeedback(level: FeedbackPayload["level"], message: string) {
  const payload: FeedbackPayload = {
    type: "action-feedback",
    level,
    message
  };
  figma.ui.postMessage(payload);
}

async function postCollectionsData() {
  const allCollections = await figma.variables.getLocalVariableCollectionsAsync();
  const payload: CollectionsLoadedPayload = {
    type: "collections-loaded",
    collections: allCollections.map((collection) => ({
      name: collection.name,
      modes: collection.modes.map((mode) => mode.name)
    }))
  };
  figma.ui.postMessage(payload);
}

function postColorStylesResult(candidates: ColorStyleCandidate[]) {
  const payload: ColorStylesResultPayload = {
    type: "color-styles-result",
    colorStyles: serializeColorStyles(candidates)
  };
  figma.ui.postMessage(payload);
}

function postEffectStylesResult(candidates: EffectStyleCandidate[]) {
  const payload: EffectStylesResultPayload = {
    type: "effect-styles-result",
    effectStyles: serializeEffectStyles(candidates)
  };
  figma.ui.postMessage(payload);
}

function postTextStylesResult(candidates: TextStyleCandidate[], textStyleDiagnostics: TextStyleDiagnostics) {
  const payload: TextStylesResultPayload = {
    type: "text-styles-result",
    textStyles: serializeTextStyles(candidates),
    textStyleDiagnostics
  };
  figma.ui.postMessage(payload);
}

function emptyTextStyleDiagnostics(): TextStyleDiagnostics {
  return {
    textNodesFound: 0,
    styledSegmentsRead: 0,
    styleCandidatesGenerated: 0
  };
}

function serializeTextStyles(candidates: TextStyleCandidate[]) {
  return candidates.map((candidate) => ({
    key: candidate.key,
    name: candidate.name,
    occurrences: candidate.occurrences,
    signature: {
      fontName: {
        family: candidate.signature.fontName.family,
        style: candidate.signature.fontName.style
      },
      fontSize: candidate.signature.fontSize,
      lineHeight:
        candidate.signature.lineHeight.unit === "AUTO"
          ? { unit: "AUTO" }
          : {
              unit: candidate.signature.lineHeight.unit,
              value: candidate.signature.lineHeight.value
            },
      letterSpacing: {
        unit: candidate.signature.letterSpacing.unit,
        value: candidate.signature.letterSpacing.value
      },
      paragraphSpacing: candidate.signature.paragraphSpacing,
      textCase: candidate.signature.textCase,
      textDecoration: candidate.signature.textDecoration
    }
  }));
}

function serializeColorStyles(candidates: ColorStyleCandidate[]) {
  return candidates.map((candidate) => ({
    key: candidate.key,
    name: candidate.name,
    category: candidate.category,
    value: candidate.value,
    occurrences: candidate.occurrences
  }));
}

function serializeEffectStyles(candidates: EffectStyleCandidate[]) {
  return candidates.map((candidate) => ({
    key: candidate.key,
    name: candidate.name,
    category: candidate.category,
    effects: serializeEffects(candidate.effects),
    occurrences: candidate.occurrences
  }));
}

function serializeEffects(effects: Effect[]) {
  return JSON.parse(JSON.stringify(effects)) as Array<Record<string, unknown>>;
}

function cloneEffects(effects: Effect[]) {
  return serializeEffects(effects) as unknown as Effect[];
}

function isAllowedSelectionNode(node: SceneNode): node is GroupNode | FrameNode | SectionNode {
  return node.type === "GROUP" || node.type === "FRAME" || node.type === "SECTION";
}

async function getVariablesByCollection(collection: VariableCollection): Promise<Map<string, Variable>> {
  const map = new Map<string, Variable>();
  const variables = await figma.variables.getLocalVariablesAsync();

  for (const variable of variables) {
    if (variable.variableCollectionId !== collection.id) {
      continue;
    }
    if (!isSupportedVariableKind(variable.resolvedType)) {
      continue;
    }
    map.set(buildVariableLookupKey(variable.resolvedType, variable.name), variable);
  }

  return map;
}

function rgbaFromPaint(paint: SolidPaint): RgbaValue {
  return {
    r: round(paint.color.r),
    g: round(paint.color.g),
    b: round(paint.color.b),
    a: round(paint.opacity ?? 1)
  };
}

function solidPaintFromRgba(value: RgbaValue): SolidPaint {
  return {
    type: "SOLID",
    color: {
      r: value.r,
      g: value.g,
      b: value.b
    },
    opacity: value.a
  };
}

function rgbaLabel(value: RgbaValue) {
  return `rgba(${Math.round(value.r * 255)}, ${Math.round(value.g * 255)}, ${Math.round(value.b * 255)}, ${value.a})`;
}

function rgbaKey(value: RgbaValue) {
  return `${round(value.r)}:${round(value.g)}:${round(value.b)}:${round(value.a)}`;
}

function numberKey(value: number) {
  return normalizeNumber(round(value));
}

function stringKey(value: string) {
  return value.trim().toLowerCase();
}


function isRgbaValue(value: VariableValue): value is RgbaValue {
  return (
    typeof value === "object" &&
    value !== null &&
    "r" in value &&
    "g" in value &&
    "b" in value &&
    "a" in value &&
    typeof value.r === "number" &&
    typeof value.g === "number" &&
    typeof value.b === "number" &&
    typeof value.a === "number"
  );
}

function hasEffectOffset(effect: Effect): effect is Effect & { offset: Vector } {
  return typeof effect === "object" && effect !== null && "offset" in effect && !!effect.offset;
}

function isSupportedVariableKind(type: VariableResolvedDataType): type is VariableKind {
  return type === "COLOR" || type === "FLOAT" || type === "STRING";
}

function hasUniformCornerRadius(node: SceneNode): node is SceneNode & CornerMixin {
  return (
    "topLeftRadius" in node &&
    "topRightRadius" in node &&
    "bottomLeftRadius" in node &&
    "bottomRightRadius" in node &&
    typeof node.topLeftRadius === "number" &&
    typeof node.topRightRadius === "number" &&
    typeof node.bottomLeftRadius === "number" &&
    typeof node.bottomRightRadius === "number" &&
    node.topLeftRadius === node.topRightRadius &&
    node.topLeftRadius === node.bottomLeftRadius &&
    node.topLeftRadius === node.bottomRightRadius
  );
}

// ── Design System Frame Generator ─────────────────────────────────────────────


// ── Design System Generator ───────────────────────────────────────────────────

const DS_W  = 1440;
const DS_P  = 48;
const DS_CW = DS_W - DS_P * 2; // 1344

async function generateDesignSystem(payload: GenerateDesignSystemPayload) {
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  await figma.loadFontAsync({ family: "Inter", style: "Medium" });
  await figma.loadFontAsync({ family: "Inter", style: "Bold" });

  const cx = Math.round(figma.viewport.center.x - DS_W / 2);
  let cy = Math.round(figma.viewport.center.y - 300);
  const GAP = 40;
  const frames: FrameNode[] = [];

  const place = (f: FrameNode) => {
    f.x = cx; f.y = cy;
    figma.currentPage.appendChild(f);
    cy += f.height + GAP;
    frames.push(f);
  };

  const hasColors  = payload.colorItems.length > 0 || payload.colorStyles.length > 0;
  const hasType    = payload.textStyles.length > 0;
  const hasRadius  = payload.sizeItems.some(s => s.category === "shape/radius");
  const hasSpacing = payload.sizeItems.some(s => s.category.startsWith("layout/"));
  const hasFx      = payload.effectStyles.length > 0;

  if (hasColors)                    place(await dsBuildColors(payload));
  if (hasType)                      place(await dsBuildTypography(payload));
  if (hasRadius || hasSpacing || hasFx) place(dsBuildScaleAndEffects(payload));

  figma.viewport.scrollAndZoomIntoView(frames);
  figma.notify(t("backend_design_system_generated", currentLocale));
  postFeedback("success", t("backend_design_system_generated", currentLocale));
}

// ── Colors frame ──────────────────────────────────────────────────────────────

async function dsBuildColors(payload: GenerateDesignSystemPayload): Promise<FrameNode> {
  const frame = dsSectionFrame("Colors");
  dsSectionHeader(frame, "PALETA & TOKENS", "Cores");

  const all = [
    ...payload.colorItems.map(c => ({ name: c.name, value: c.value })),
    ...payload.colorStyles.map(c => ({ name: c.name, value: c.value }))
  ];

  if (all.length > 0) {
    frame.appendChild(dsSubLabel("Paleta"));

    // Wrapping swatch grid — FIXED primary width so wrap actually works
    const grid = figma.createFrame();
    grid.name = "swatches";
    grid.layoutMode = "HORIZONTAL";
    grid.primaryAxisSizingMode = "FIXED";
    grid.counterAxisSizingMode = "AUTO";
    grid.resize(DS_CW, 100);
    grid.itemSpacing = 12;
    grid.counterAxisSpacing = 16;
    grid.layoutWrap = "WRAP";
    grid.fills = [];

    for (const item of all) {
      const card = dsVStack(item.name, 6);
      const rect = figma.createRectangle();
      rect.resize(160, 96);
      rect.cornerRadius = 8;
      rect.fills = [{ type: "SOLID", color: { r: item.value.r, g: item.value.g, b: item.value.b }, opacity: item.value.a }];
      rect.strokes = [{ type: "SOLID", color: { r: 0, g: 0, b: 0 }, opacity: 0.07 }];
      rect.strokeWeight = 1;
      const lbl = dsT(item.name.split("/").pop() || item.name, 10, "Medium", DS_DARK);
      lbl.textAutoResize = "WIDTH_AND_HEIGHT";
      const hex = dsHex(item.value);
      const hexLbl = dsT(hex, 9, "Regular", DS_MUTED);
      hexLbl.textAutoResize = "WIDTH_AND_HEIGHT";
      card.appendChild(rect);
      card.appendChild(lbl);
      card.appendChild(hexLbl);
      grid.appendChild(card);
    }
    frame.appendChild(grid);
  }

  if (payload.colorItems.length > 0) {
    frame.appendChild(dsSubLabel("Tokens"));

    // Header
    const header = dsTableRow(true);
    dsAddCell(header, dsT("TOKEN", 9, "Medium", DS_MUTED), 320, true);
    dsAddCell(header, dsT("VALOR", 9, "Medium", DS_MUTED), 180, false);
    dsAddCell(header, dsT("CATEGORIA", 9, "Medium", DS_MUTED), 0, true);
    frame.appendChild(header);

    payload.colorItems.forEach((item, i) => {
      const swatch = figma.createRectangle();
      swatch.resize(12, 12);
      swatch.cornerRadius = 3;
      swatch.fills = [{ type: "SOLID", color: { r: item.value.r, g: item.value.g, b: item.value.b }, opacity: item.value.a }];

      const valRow = dsHStack("val", 8);
      valRow.counterAxisAlignItems = "CENTER";
      valRow.appendChild(swatch);
      valRow.appendChild(dsT(dsHex(item.value), 10, "Regular", DS_DARK));

      const cat = item.name.split("/")[0] || "—";

      const row = dsTableRow(false, i % 2 === 1);
      dsAddCell(row, dsT(item.name, 10, "Regular", DS_DARK), 320, false);
      dsAddCell(row, valRow, 180, false);
      dsAddCell(row, dsT(cat, 10, "Regular", DS_MUTED), 0, true);
      frame.appendChild(row);
    });
  }

  return frame;
}

// ── Typography frame ──────────────────────────────────────────────────────────

async function dsBuildTypography(payload: GenerateDesignSystemPayload): Promise<FrameNode> {
  const frame = dsSectionFrame("Typography");
  dsSectionHeader(frame, "FONTES & ESCALA", "Tipografia");

  // Unique families
  const families = new Map<string, FontName>();
  for (const s of payload.textStyles) {
    if (!families.has(s.signature.fontName.family)) {
      families.set(s.signature.fontName.family, s.signature.fontName as FontName);
    }
  }

  if (families.size > 0) {
    frame.appendChild(dsSubLabel("Famílias tipográficas"));

    // 2-col grid of font cards
    const famGrid = figma.createFrame();
    famGrid.name = "families";
    famGrid.layoutMode = "HORIZONTAL";
    famGrid.primaryAxisSizingMode = "FIXED";
    famGrid.counterAxisSizingMode = "AUTO";
    famGrid.resize(DS_CW, 100);
    famGrid.itemSpacing = 20;
    famGrid.counterAxisSpacing = 20;
    famGrid.layoutWrap = "WRAP";
    famGrid.fills = [];

    const cardW = Math.floor((DS_CW - 20) / 2);

    for (const fn of families.values()) {
      let loaded = true;
      try { await figma.loadFontAsync(fn); } catch { loaded = false; }

      const card = dsVStack(fn.family, 10);
      card.paddingTop = card.paddingBottom = card.paddingLeft = card.paddingRight = 24;
      card.fills = [{ type: "SOLID", color: { r: 0.97, g: 0.98, b: 0.99 } }];
      card.cornerRadius = 8;
      card.strokes = [{ type: "SOLID", color: { r: 0.88, g: 0.92, b: 0.96 } }];
      card.strokeWeight = 1;
      card.counterAxisSizingMode = "FIXED";
      card.resize(cardW, 100);
      card.primaryAxisSizingMode = "AUTO";

      if (loaded) {
        const big = figma.createText();
        big.fontName = fn;
        big.fontSize = 36;
        big.characters = fn.family;
        big.fills = [{ type: "SOLID", color: DS_DARK }];
        big.textAutoResize = "WIDTH_AND_HEIGHT";
        card.appendChild(big);
      } else {
        card.appendChild(dsT(fn.family, 28, "Bold", DS_DARK));
      }
      card.appendChild(dsT(fn.style, 10, "Regular", DS_MUTED));
      famGrid.appendChild(card);
    }
    frame.appendChild(famGrid);
  }

  if (payload.textStyles.length > 0) {
    frame.appendChild(dsSubLabel("Escala tipográfica"));

    const SAMPLE_W = 200;
    const NAME_W   = 160;
    const SIZE_W   = 72;
    const WEIGHT_W = 96;
    const LH_W     = 80;

    const header = dsTableRow(true);
    dsAddCell(header, dsT("AMOSTRA",     9, "Medium", DS_MUTED), SAMPLE_W, false);
    dsAddCell(header, dsT("NOME",        9, "Medium", DS_MUTED), NAME_W,   false);
    dsAddCell(header, dsT("TAMANHO",     9, "Medium", DS_MUTED), SIZE_W,   false);
    dsAddCell(header, dsT("PESO",        9, "Medium", DS_MUTED), WEIGHT_W, false);
    dsAddCell(header, dsT("LINE HEIGHT", 9, "Medium", DS_MUTED), 0,        true);
    frame.appendChild(header);

    for (let i = 0; i < payload.textStyles.length; i++) {
      const style = payload.textStyles[i];
      let loaded = true;
      try { await figma.loadFontAsync(style.signature.fontName as FontName); } catch { loaded = false; }

      const shortName = style.name.split("/").pop() || style.name;
      const clampedSz = Math.min(style.signature.fontSize, 48);
      const lhVal     = style.signature.lineHeight;
      const lhStr     = lhVal.unit === "AUTO" ? "auto"
        : `${lhVal.value ?? 0}${lhVal.unit === "PIXELS" ? "px" : "%"}`;

      let sample: TextNode;
      if (loaded) {
        sample = figma.createText();
        sample.fontName = style.signature.fontName as FontName;
        sample.fontSize = clampedSz;
        sample.characters = shortName;
        sample.fills = [{ type: "SOLID", color: DS_DARK }];
        sample.textAutoResize = "WIDTH_AND_HEIGHT";
      } else {
        sample = dsT(shortName, Math.min(clampedSz, 20), "Regular", DS_DARK);
      }

      const row = dsTableRow(false, i % 2 === 1);
      row.counterAxisAlignItems = "CENTER";
      dsAddCell(row, sample,                                                               SAMPLE_W, false);
      dsAddCell(row, dsT(shortName,                              10, "Regular", DS_DARK),  NAME_W,   false);
      dsAddCell(row, dsT(`${style.signature.fontSize}px`,        10, "Regular", DS_MUTED), SIZE_W,   false);
      dsAddCell(row, dsT(style.signature.fontName.style,         10, "Regular", DS_MUTED), WEIGHT_W, false);
      dsAddCell(row, dsT(lhStr,                                  10, "Regular", DS_MUTED), 0,        true);
      frame.appendChild(row);
    }
  }

  return frame;
}

// ── Scale & Effects frame ─────────────────────────────────────────────────────

function dsBuildScaleAndEffects(payload: GenerateDesignSystemPayload): FrameNode {
  const frame = dsSectionFrame("Scale & Effects");
  dsSectionHeader(frame, "ESCALA & EFEITOS", "Espaçamento");

  // Border radius — compact visual row
  const radii = payload.sizeItems
    .filter(s => s.category === "shape/radius")
    .sort((a, b) => a.value - b.value);

  if (radii.length > 0) {
    frame.appendChild(dsSubLabel("Border Radius"));

    const row = dsHStack("radius-row", 24);
    row.counterAxisAlignItems = "MAX";

    for (const item of radii) {
      const card = dsVStack("r", 6);
      card.counterAxisAlignItems = "CENTER";
      const sz = Math.min(Math.max(item.value * 2 + 20, 24), 80);
      const rect = figma.createRectangle();
      rect.resize(sz, sz);
      rect.cornerRadius = item.value;
      rect.fills = [{ type: "SOLID", color: DS_TEAL, opacity: 0.12 }];
      rect.strokes = [{ type: "SOLID", color: DS_TEAL }];
      rect.strokeWeight = 1.5;
      const lbl = dsT(`${item.value}px`, 9, "Regular", DS_MUTED);
      lbl.textAutoResize = "WIDTH_AND_HEIGHT";
      card.appendChild(rect);
      card.appendChild(lbl);
      row.appendChild(card);
    }
    frame.appendChild(row);
  }

  // Spacing — compact chip grid (WRAP, sorted)
  const spacings = payload.sizeItems
    .filter(s => s.category.startsWith("layout/"))
    .sort((a, b) => a.value - b.value);

  if (spacings.length > 0) {
    frame.appendChild(dsSubLabel("Espaçamento"));

    const chipGrid = figma.createFrame();
    chipGrid.name = "spacing-chips";
    chipGrid.layoutMode = "HORIZONTAL";
    chipGrid.primaryAxisSizingMode = "FIXED";
    chipGrid.counterAxisSizingMode = "AUTO";
    chipGrid.resize(DS_CW, 100);
    chipGrid.itemSpacing = 8;
    chipGrid.counterAxisSpacing = 8;
    chipGrid.layoutWrap = "WRAP";
    chipGrid.fills = [];

    const MAX_BAR = 80;
    const maxVal = Math.max(...spacings.map(s => s.value), 1);

    for (const item of spacings) {
      const chip = dsHStack("chip", 8);
      chip.paddingTop = chip.paddingBottom = 6;
      chip.paddingLeft = chip.paddingRight = 10;
      chip.counterAxisAlignItems = "CENTER";
      chip.fills = [{ type: "SOLID", color: { r: 0.96, g: 0.97, b: 0.98 } }];
      chip.cornerRadius = 6;

      const barW = Math.max(4, Math.round((item.value / maxVal) * MAX_BAR));
      const bar = figma.createRectangle();
      bar.resize(barW, 10);
      bar.cornerRadius = 2;
      bar.fills = [{ type: "SOLID", color: DS_TEAL }];

      chip.appendChild(bar);
      chip.appendChild(dsT(`${item.value}px`, 10, "Medium", DS_DARK));
      chipGrid.appendChild(chip);
    }
    frame.appendChild(chipGrid);
  }

  // Effects — compact card grid (WRAP)
  if (payload.effectStyles.length > 0) {
    frame.appendChild(dsSubLabel("Sombras & Efeitos"));

    const fxGrid = figma.createFrame();
    fxGrid.name = "effects";
    fxGrid.layoutMode = "HORIZONTAL";
    fxGrid.primaryAxisSizingMode = "FIXED";
    fxGrid.counterAxisSizingMode = "AUTO";
    fxGrid.resize(DS_CW, 100);
    fxGrid.itemSpacing = 16;
    fxGrid.counterAxisSpacing = 16;
    fxGrid.layoutWrap = "WRAP";
    fxGrid.fills = [];

    for (const item of payload.effectStyles) {
      const card = dsVStack(item.name, 10);
      card.paddingTop = card.paddingBottom = card.paddingLeft = card.paddingRight = 16;
      card.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
      card.cornerRadius = 8;
      card.strokes = [{ type: "SOLID", color: { r: 0.9, g: 0.9, b: 0.9 } }];
      card.strokeWeight = 1;
      card.counterAxisAlignItems = "CENTER";

      const preview = figma.createRectangle();
      preview.resize(88, 88);
      preview.cornerRadius = 8;
      preview.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
      const fx = item.effects.map(buildEffectFromRecord).filter((e): e is Effect => e !== null);
      if (fx.length > 0) preview.effects = fx;

      const lbl = dsT(item.name.split("/").pop() || item.name, 10, "Medium", DS_DARK);
      lbl.textAutoResize = "WIDTH_AND_HEIGHT";
      card.appendChild(preview);
      card.appendChild(lbl);
      fxGrid.appendChild(card);
    }
    frame.appendChild(fxGrid);
  }

  return frame;
}

// ── DS helpers ────────────────────────────────────────────────────────────────

const DS_DARK:  RGB = { r: 0.05, g: 0.10, b: 0.20 };
const DS_MUTED: RGB = { r: 0.48, g: 0.53, b: 0.60 };
const DS_TEAL:  RGB = { r: 0.22, g: 0.55, b: 0.55 };
const DS_BLUE:  RGB = { r: 0.30, g: 0.55, b: 0.75 };

function dsSectionFrame(name: string): FrameNode {
  const f = figma.createFrame();
  f.name = name;
  f.layoutMode = "VERTICAL";
  f.primaryAxisSizingMode = "AUTO";
  f.counterAxisSizingMode = "FIXED";
  f.resize(DS_W, 100);
  f.paddingTop = f.paddingBottom = f.paddingLeft = f.paddingRight = DS_P;
  f.itemSpacing = 24;
  f.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
  return f;
}

function dsSectionHeader(frame: FrameNode, cat: string, title: string) {
  const div = figma.createRectangle();
  div.resize(DS_CW, 1);
  div.fills = [{ type: "SOLID", color: DS_BLUE, opacity: 0.35 }];
  frame.appendChild(div);

  const catNode = dsT(cat, 9, "Medium", DS_BLUE);
  catNode.letterSpacing = { unit: "PERCENT", value: 12 };
  frame.appendChild(catNode);

  frame.appendChild(dsT(title, 26, "Bold", DS_DARK));
}

function dsSubLabel(text: string): TextNode {
  const n = dsT(text.toUpperCase(), 9, "Medium", DS_TEAL);
  n.letterSpacing = { unit: "PERCENT", value: 8 };
  return n;
}

/** Vertical auto-layout frame */
function dsVStack(name: string, gap: number): FrameNode {
  const f = figma.createFrame();
  f.name = name;
  f.layoutMode = "VERTICAL";
  f.primaryAxisSizingMode = "AUTO";
  f.counterAxisSizingMode = "AUTO";
  f.itemSpacing = gap;
  f.fills = [];
  return f;
}

/** Horizontal auto-layout frame (AUTO width — for inner content only) */
function dsHStack(name: string, gap: number): FrameNode {
  const f = figma.createFrame();
  f.name = name;
  f.layoutMode = "HORIZONTAL";
  f.primaryAxisSizingMode = "AUTO";
  f.counterAxisSizingMode = "AUTO";
  f.itemSpacing = gap;
  f.fills = [];
  return f;
}

/** Table row — FIXED width = DS_CW, height AUTO */
function dsTableRow(isHeader: boolean, zebra = false): FrameNode {
  const row = figma.createFrame();
  row.name = "row";
  row.layoutMode = "HORIZONTAL";
  row.primaryAxisSizingMode = "FIXED";
  row.counterAxisSizingMode = "AUTO";
  row.resize(DS_CW, 100);
  row.paddingTop = row.paddingBottom = isHeader ? 8 : 11;
  row.paddingLeft = row.paddingRight = 12;
  row.itemSpacing = 0;
  row.fills = isHeader
    ? [{ type: "SOLID", color: { r: 0.95, g: 0.97, b: 0.99 } }]
    : zebra
    ? [{ type: "SOLID", color: { r: 0.987, g: 0.987, b: 0.987 } }]
    : [];
  if (isHeader) {
    row.strokes = [{ type: "SOLID", color: { r: 0.85, g: 0.91, b: 0.96 } }];
    row.strokeWeight = 1;
    row.strokeAlign = "OUTSIDE";
  }
  return row;
}

/**
 * Add a cell to a table row.
 * width=0 + grow=true → cell fills remaining space (last column).
 */
function dsAddCell(row: FrameNode, content: SceneNode, width: number, grow: boolean) {
  const cell = figma.createFrame();
  cell.name = "cell";
  cell.layoutMode = "HORIZONTAL";
  cell.counterAxisAlignItems = "CENTER";
  cell.fills = [];
  if (grow) {
    cell.layoutGrow = 1;
    cell.primaryAxisSizingMode = "FIXED";
    cell.counterAxisSizingMode = "AUTO";
    cell.resize(1, 10); // will be overridden by layoutGrow
  } else {
    cell.primaryAxisSizingMode = "FIXED";
    cell.counterAxisSizingMode = "AUTO";
    cell.resize(width, 10);
  }
  cell.itemSpacing = 0;
  cell.appendChild(content);
  row.appendChild(cell);
}

function dsT(content: string, size: number, weight: "Regular" | "Medium" | "Bold", color: RGB): TextNode {
  const t2 = figma.createText();
  t2.fontName = { family: "Inter", style: weight };
  t2.fontSize = size;
  t2.characters = content;
  t2.fills = [{ type: "SOLID", color }];
  return t2;
}

function dsHex(v: RgbaValue): string {
  const h = (n: number) => Math.round(n * 255).toString(16).padStart(2, "0");
  return v.a < 1
    ? `rgba(${Math.round(v.r * 255)},${Math.round(v.g * 255)},${Math.round(v.b * 255)},${Math.round(v.a * 100) / 100})`
    : `#${h(v.r)}${h(v.g)}${h(v.b)}`;
}

function buildEffectFromRecord(e: Record<string, unknown>): Effect | null {
  const type = e.type as string;
  if (type === "DROP_SHADOW" || type === "INNER_SHADOW") {
    return {
      type: type as "DROP_SHADOW" | "INNER_SHADOW",
      color: (e.color as RGBA) ?? { r: 0, g: 0, b: 0, a: 0.25 },
      offset: (e.offset as Vector) ?? { x: 0, y: 4 },
      radius: (e.radius as number) ?? 8,
      spread: (e.spread as number) ?? 0,
      visible: true,
      blendMode: "NORMAL"
    };
  }
  if (type === "LAYER_BLUR" || type === "BACKGROUND_BLUR") {
    return {
      type: type as "LAYER_BLUR" | "BACKGROUND_BLUR",
      radius: (e.radius as number) ?? 4,
      visible: true,
      blurType: "NORMAL" as const
    };
  }
  return null;
}
