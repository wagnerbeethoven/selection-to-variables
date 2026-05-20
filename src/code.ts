import {
  buildVariableLookupKey,
  ensureUniqueVariableName,
  inferRole,
  inferState,
  normalizeNumber,
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
    const key = `color:${value.r}:${value.g}:${value.b}:${value.a}:${category}`;
    upsertItem(items, key, {
      id: key,
      group: "colors",
      category,
      type: "COLOR",
      name: buildColorTokenName(category, trail),
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
    const key = `font-size:${node.fontSize}`;
    upsertItem(items, key, {
      id: key,
      group: "sizes",
      category: "typography/font-size",
      type: "FLOAT",
      name: buildSizeTokenName("typography/font-size", node.fontSize),
      value: round(node.fontSize),
      description: `${round(node.fontSize)}px`,
      occurrences: 1,
      sources: [trail.join(" > ")]
    });
  }

  if (node.lineHeight !== figma.mixed && node.lineHeight.unit === "PIXELS") {
    const value = round(node.lineHeight.value);
    const key = `line-height:${value}`;
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

  if ("width" in node) {
    const width = round(node.width);
    const widthKey = `width:${width}`;
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

  if ("height" in node) {
    const height = round(node.height);
    const heightKey = `height:${height}`;
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
    const radiusKey = `radius:${radius}`;
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
    const category = "layout/gap";
    const key = `gap:${gap}`;
    upsertItem(items, key, {
      id: key,
      group: "sizes",
      category,
      type: "FLOAT",
      name: buildSizeTokenName(category, gap),
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

  for (const [side, rawValue] of paddings) {
    if (typeof rawValue !== "number" || rawValue <= 0) {
      continue;
    }

    const value = round(rawValue);
    const category = `layout/padding/${side}`;
    const key = `padding-${side}:${value}`;
    upsertItem(items, key, {
      id: key,
      group: "sizes",
      category,
      type: "FLOAT",
      name: buildSizeTokenName(category, value),
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
    item.name = `${item.name}-${i}`;
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

function buildColorTokenName(category: string, trail: string[]): string {
  const state = inferState(trail.join(" ").toLowerCase());
  return `color/${category}/${state}`;
}

function buildTextTokenName(category: string, text: string, fallbackName: string): string {
  const content = slugify(text).slice(0, 24) || slugify(fallbackName).slice(0, 24) || "content";
  return `content/${category}/${content}`;
}

function buildSizeTokenName(category: string, value: number): string {
  return `${dtcgSizePath(category)}/${normalizeNumber(round(value))}`;
}

function dtcgSizePath(category: string): string {
  const map: Record<string, string> = {
    "typography/font-size": "typography/font-size",
    "typography/line-height": "typography/line-height",
    "layout/gap": "spacing/gap",
    "layout/padding/top": "spacing/padding/top",
    "layout/padding/right": "spacing/padding/right",
    "layout/padding/bottom": "spacing/padding/bottom",
    "layout/padding/left": "spacing/padding/left",
    "shape/radius": "border-radius",
    "dimension/width": "dimension/width",
    "dimension/height": "dimension/height",
    "icon/width": "dimension/icon/width",
    "icon/height": "dimension/icon/height",
    "component/width": "dimension/component/width",
    "component/height": "dimension/component/height",
    "media/width": "dimension/media/width",
    "media/height": "dimension/media/height",
    "layout/width": "dimension/layout/width",
    "layout/height": "dimension/layout/height",
  };
  return map[category] ?? category;
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
  const existingVariables = await getVariablesByCollection(collection);
  const usedKeys = new Set<string>(existingVariables.keys());
  const createdVariables = new Map<string, Variable>();

  let created = 0;
  let reused = 0;
  for (const item of includedItems) {
    const safeName = ensureUniqueVariableName(item.name, item.type, item.id, usedKeys);
    if (!safeName) {
      continue;
    }

    const variableKey = buildVariableLookupKey(item.type, safeName);
    let variable = existingVariables.get(variableKey);
    if (!variable) {
      variable = figma.variables.createVariable(safeName, collection, item.type);
      existingVariables.set(variableKey, variable);
      created += 1;
    } else {
      reused += 1;
    }

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

async function generateDesignSystem(payload: GenerateDesignSystemPayload) {
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  await figma.loadFontAsync({ family: "Inter", style: "Bold" });
  await figma.loadFontAsync({ family: "Inter", style: "Medium" });

  const root = dsFrame("Design System", "VERTICAL", 48, 48);
  root.fills = [{ type: "SOLID", color: { r: 0.976, g: 0.976, b: 0.976 } }];
  root.x = Math.round(figma.viewport.center.x - 480);
  root.y = Math.round(figma.viewport.center.y - 300);

  const hasColors = payload.colorItems.length > 0 || payload.colorStyles.length > 0;
  const hasType   = payload.textStyles.length > 0;
  const hasSizes  = payload.sizeItems.length > 0;
  const hasFx     = payload.effectStyles.length > 0;

  if (hasColors)  root.appendChild(await buildDsColorsSection(payload));
  if (hasType)    root.appendChild(await buildDsTypographySection(payload));
  if (hasSizes)   root.appendChild(buildDsSizesSection(payload));
  if (hasFx)      root.appendChild(buildDsEffectsSection(payload));

  figma.currentPage.appendChild(root);
  figma.viewport.scrollAndZoomIntoView([root]);
  figma.notify(t("backend_design_system_generated", currentLocale));
  postFeedback("success", t("backend_design_system_generated", currentLocale));
}

// ── Section builders ──────────────────────────────────────────────────────────

async function buildDsColorsSection(payload: GenerateDesignSystemPayload): Promise<FrameNode> {
  const section = dsSection("Colors");
  const grid = dsFrame("swatches", "HORIZONTAL", 16, 0);
  grid.layoutWrap = "WRAP";
  grid.counterAxisSpacing = 16;
  grid.fills = [];

  const all = [
    ...payload.colorItems.map((c) => ({ name: c.name, value: c.value, source: "token" })),
    ...payload.colorStyles.map((c) => ({ name: c.name, value: c.value, source: "style" }))
  ];

  for (const item of all) {
    grid.appendChild(buildDsColorSwatch(item.name, item.value));
  }

  section.appendChild(grid);
  return section;
}

function buildDsColorSwatch(name: string, value: RgbaValue): FrameNode {
  const card = dsFrame(name, "VERTICAL", 6, 0);

  const rect = figma.createRectangle();
  rect.name = "swatch";
  rect.resize(80, 80);
  rect.cornerRadius = 8;
  rect.fills = [{ type: "SOLID", color: { r: value.r, g: value.g, b: value.b }, opacity: value.a }];
  rect.strokes = [{ type: "SOLID", color: { r: 0, g: 0, b: 0 }, opacity: 0.08 }];
  rect.strokeWeight = 1;

  const shortName = name.split("/").pop() || name;
  const labelNode = dsText(shortName, 10, "Medium", { r: 0.1, g: 0.1, b: 0.1 });
  labelNode.textAutoResize = "WIDTH_AND_HEIGHT";
  labelNode.resize(80, labelNode.height);

  const hex = dsRgbaToHex(value);
  const hexNode = dsText(hex, 9, "Regular", { r: 0.55, g: 0.55, b: 0.55 });
  hexNode.textAutoResize = "WIDTH_AND_HEIGHT";
  hexNode.resize(80, hexNode.height);

  card.appendChild(rect);
  card.appendChild(labelNode);
  card.appendChild(hexNode);
  return card;
}

async function buildDsTypographySection(payload: GenerateDesignSystemPayload): Promise<FrameNode> {
  const section = dsSection("Typography");

  for (const style of payload.textStyles) {
    try {
      await figma.loadFontAsync(style.signature.fontName as FontName);
    } catch {
      // Font unavailable — skip this style
      continue;
    }

    const row = dsFrame(style.name, "HORIZONTAL", 24, 0);
    row.counterAxisAlignItems = "CENTER";
    row.fills = [];

    const sample = figma.createText();
    sample.name = "sample";
    sample.fontName = style.signature.fontName as FontName;
    sample.fontSize = Math.min(style.signature.fontSize, 48);
    sample.characters = "Aa";
    sample.fills = [{ type: "SOLID", color: { r: 0.08, g: 0.08, b: 0.08 } }];
    sample.resize(100, sample.height);

    const lineHeightStr = style.signature.lineHeight.unit === "AUTO"
      ? "auto"
      : `${style.signature.lineHeight.value ?? 0}${style.signature.lineHeight.unit === "PIXELS" ? "px" : "%"}`;

    const meta = dsFrame("meta", "VERTICAL", 2, 0);
    meta.fills = [];
    meta.appendChild(dsText(style.name.split("/").pop() || style.name, 11, "Medium", { r: 0.08, g: 0.08, b: 0.08 }));
    meta.appendChild(dsText(
      `${style.signature.fontName.family} ${style.signature.fontName.style} · ${style.signature.fontSize}px / ${lineHeightStr}`,
      9, "Regular", { r: 0.55, g: 0.55, b: 0.55 }
    ));

    row.appendChild(sample);
    row.appendChild(meta);
    section.appendChild(row);
  }

  return section;
}

function buildDsSizesSection(payload: GenerateDesignSystemPayload): FrameNode {
  const section = dsSection("Sizes");
  const MAX_BAR = 320;

  const values = payload.sizeItems
    .filter((s) => typeof s.value === "number" && s.value > 0)
    .sort((a, b) => a.value - b.value);

  const maxVal = Math.max(...values.map((s) => s.value), 1);

  for (const item of values) {
    const row = dsFrame(item.name, "HORIZONTAL", 12, 0);
    row.counterAxisAlignItems = "CENTER";
    row.fills = [];

    const barW = Math.max(4, Math.round((item.value / maxVal) * MAX_BAR));
    const bar = figma.createRectangle();
    bar.name = "bar";
    bar.resize(barW, 16);
    bar.cornerRadius = 3;
    bar.fills = [{ type: "SOLID", color: { r: 0.22, g: 0.55, b: 0.55 } }];

    const shortName = item.name.split("/").pop() || item.name;
    const lbl = dsText(`${shortName}  ${item.value}px`, 9, "Regular", { r: 0.4, g: 0.4, b: 0.4 });

    row.appendChild(bar);
    row.appendChild(lbl);
    section.appendChild(row);
  }

  return section;
}

function buildDsEffectsSection(payload: GenerateDesignSystemPayload): FrameNode {
  const section = dsSection("Effects");
  const row = dsFrame("effect-cards", "HORIZONTAL", 16, 0);
  row.fills = [];

  for (const item of payload.effectStyles) {
    const card = dsFrame(item.name, "VERTICAL", 8, 0);

    const rect = figma.createRectangle();
    rect.name = "effect-preview";
    rect.resize(80, 80);
    rect.cornerRadius = 8;
    rect.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
    const builtEffects = item.effects
      .map((e) => buildEffectFromRecord(e))
      .filter((e): e is Effect => e !== null);
    if (builtEffects.length > 0) rect.effects = builtEffects;

    const shortName = item.name.split("/").pop() || item.name;
    const lbl = dsText(shortName, 10, "Medium", { r: 0.1, g: 0.1, b: 0.1 });
    lbl.textAutoResize = "WIDTH_AND_HEIGHT";

    card.appendChild(rect);
    card.appendChild(lbl);
    row.appendChild(card);
  }

  section.appendChild(row);
  return section;
}

// ── DS frame/text helpers ─────────────────────────────────────────────────────

function dsSection(title: string): FrameNode {
  const frame = dsFrame(title, "VERTICAL", 20, 0);
  const header = dsText(title, 16, "Bold", { r: 0.08, g: 0.08, b: 0.08 });
  frame.appendChild(header);

  const divider = figma.createRectangle();
  divider.name = "divider";
  divider.resize(480, 1);
  divider.fills = [{ type: "SOLID", color: { r: 0.85, g: 0.85, b: 0.85 } }];
  frame.appendChild(divider);

  return frame;
}

function dsFrame(name: string, mode: "HORIZONTAL" | "VERTICAL", gap: number, padding: number): FrameNode {
  const frame = figma.createFrame();
  frame.name = name;
  frame.layoutMode = mode;
  frame.primaryAxisSizingMode = "AUTO";
  frame.counterAxisSizingMode = "AUTO";
  frame.itemSpacing = gap;
  if (padding > 0) {
    frame.paddingTop = frame.paddingBottom = frame.paddingLeft = frame.paddingRight = padding;
  }
  frame.fills = [];
  return frame;
}

function dsText(content: string, size: number, weight: "Regular" | "Medium" | "Bold", color: RGB): TextNode {
  const text = figma.createText();
  text.fontName = { family: "Inter", style: weight };
  text.fontSize = size;
  text.characters = content;
  text.fills = [{ type: "SOLID", color }];
  return text;
}

function dsRgbaToHex(v: RgbaValue): string {
  const hex = (n: number) => Math.round(n * 255).toString(16).padStart(2, "0");
  return v.a < 1
    ? `rgba(${Math.round(v.r * 255)}, ${Math.round(v.g * 255)}, ${Math.round(v.b * 255)}, ${Math.round(v.a * 100) / 100})`
    : `#${hex(v.r)}${hex(v.g)}${hex(v.b)}`;
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
