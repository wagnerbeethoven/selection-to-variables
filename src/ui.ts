import { buildExportFilename, buildTokenTree } from "./export-tokens";

type UiItem = {
  id: string;
  include: boolean;
  group: "colors" | "texts" | "sizes";
  category: string;
  name: string;
  type: "COLOR" | "STRING" | "FLOAT";
  value: { r: number; g: number; b: number; a: number } | string | number;
  description: string;
  occurrences: number;
  sources: string[];
};

type UiTextStyle = {
  key: string;
  name: string;
  occurrences: number;
  signature: {
    fontName: { family: string; style: string };
    fontSize: number;
    lineHeight: { unit: string; value?: number };
    letterSpacing: { unit: string; value: number };
    paragraphSpacing: number;
    textCase: string;
    textDecoration: string;
  };
};

type UiColorStyle = {
  key: string;
  name: string;
  category: string;
  value: { r: number; g: number; b: number; a: number };
  occurrences: number;
};

type UiEffectStyle = {
  key: string;
  name: string;
  category: string;
  effects: Array<Record<string, unknown>>;
  occurrences: number;
};

type UiPrefs = {
  collectionName: string;
  modeName: string;
  repeatedOnly: boolean;
  autoScanSelection: boolean;
};

type UiCollectionOption = {
  name: string;
  modes: string[];
};

type ToastLevel = "info" | "success" | "warning" | "error";
type ActionTarget = "variables" | "text-styles" | "color-styles" | "effect-styles";
type ActiveTab = "variables" | "text-styles" | "color-styles" | "effect-styles";
type UiTextStyleDiagnostics = {
  textNodesFound: number;
  styledSegmentsRead: number;
  styleCandidatesGenerated: number;
};

// ── DOM refs ──────────────────────────────────────────────────────────────────
const itemsEl = document.getElementById("items") as HTMLDivElement;
const colorStylesEl = document.getElementById("colorStyles") as HTMLDivElement;
const effectStylesEl = document.getElementById("effectStyles") as HTMLDivElement;
const textStylesEl = document.getElementById("textStyles") as HTMLDivElement;
const textStylesDiagnosticsEl = document.getElementById("textStylesDiagnostics") as HTMLDivElement;
const summaryEl = document.getElementById("summary") as HTMLParagraphElement;
const collectionSelectEl = document.getElementById("collectionSelect") as HTMLSelectElement;
const newCollectionNameEl = document.getElementById("newCollectionName") as HTMLInputElement;
const modeSelectEl = document.getElementById("modeSelect") as HTMLSelectElement;
const newModeNameEl = document.getElementById("newModeName") as HTMLInputElement;
const repeatedOnlyEl = document.getElementById("repeatedOnly") as HTMLInputElement;
const autoScanSelectionEl = document.getElementById("autoScanSelection") as HTMLInputElement;
const exportButtonEl = document.getElementById("exportButton") as HTMLButtonElement;
const scanButtonEl = document.getElementById("scanButton") as HTMLButtonElement;
const createButtonEl = document.getElementById("createButton") as HTMLButtonElement;
const createApplyButtonEl = document.getElementById("createApplyButton") as HTMLButtonElement;
const windowToggleButtonEl = document.getElementById("windowToggleButton") as HTMLButtonElement;
const toastEl = document.getElementById("toast") as HTMLDivElement;
const statusDotEl = document.getElementById("statusDot") as HTMLSpanElement;
const statusTextEl = document.getElementById("statusText") as HTMLSpanElement;
const actionTargetEls = Array.from(document.querySelectorAll('input[name="actionTarget"]')) as HTMLInputElement[];

// Wizard
const backButtonEl = document.getElementById("backButton") as HTMLButtonElement;
const nextButtonEl = document.getElementById("nextButton") as HTMLButtonElement;
const step1IndicatorEl = document.getElementById("step1Indicator") as HTMLDivElement;
const step2IndicatorEl = document.getElementById("step2Indicator") as HTMLDivElement;
const step3IndicatorEl = document.getElementById("step3Indicator") as HTMLDivElement;
const stepPanel1El = document.getElementById("stepPanel1") as HTMLDivElement;
const stepPanel2El = document.getElementById("stepPanel2") as HTMLDivElement;
const stepPanel3El = document.getElementById("stepPanel3") as HTMLDivElement;
const tabButtonEls = Array.from(document.querySelectorAll(".tab")) as HTMLButtonElement[];
const tabPanelEls = Array.from(document.querySelectorAll(".tab-panel")) as HTMLDivElement[];

// ── State ─────────────────────────────────────────────────────────────────────
const state: {
  items: UiItem[];
  colorStyles: UiColorStyle[];
  effectStyles: UiEffectStyle[];
  textStyles: UiTextStyle[];
  textStyleDiagnostics: UiTextStyleDiagnostics;
  selectionCount: number;
  repeatedCount: number;
  collections: UiCollectionOption[];
  selectedNodeTypes: string[];
  acceptedNodeTypes: string[];
  busy: boolean;
  pendingCreateActions: number;
  toastTimer: number | null;
  forcedShowAll: boolean;
  isMaximized: boolean;
  currentStep: 1 | 2 | 3;
  activeTab: ActiveTab;
} = {
  items: [],
  colorStyles: [],
  effectStyles: [],
  textStyles: [],
  textStyleDiagnostics: {
    textNodesFound: 0,
    styledSegmentsRead: 0,
    styleCandidatesGenerated: 0
  },
  selectionCount: 0,
  repeatedCount: 0,
  collections: [],
  selectedNodeTypes: [],
  acceptedNodeTypes: [],
  busy: false,
  pendingCreateActions: 0,
  toastTimer: null,
  forcedShowAll: false,
  isMaximized: false,
  currentStep: 1,
  activeTab: "variables"
};

// ── Wizard navigation ─────────────────────────────────────────────────────────
function stepTo(n: 1 | 2 | 3) {
  state.currentStep = n;
  syncStepUI();
}

function hasResults(): boolean {
  return (
    state.items.length > 0 ||
    state.textStyles.length > 0 ||
    state.colorStyles.length > 0 ||
    state.effectStyles.length > 0
  );
}

function syncStepUI() {
  const { currentStep } = state;

  // Panels
  stepPanel1El.dataset.active = currentStep === 1 ? "true" : "false";
  stepPanel2El.dataset.active = currentStep === 2 ? "true" : "false";
  stepPanel3El.dataset.active = currentStep === 3 ? "true" : "false";

  // Indicator dots
  const indicators = [step1IndicatorEl, step2IndicatorEl, step3IndicatorEl];
  indicators.forEach((el, i) => {
    const step = (i + 1) as 1 | 2 | 3;
    const dot = el.querySelector(".step-dot") as HTMLElement;
    if (step < currentStep) {
      el.dataset.state = "done";
      dot.textContent = "✓";
    } else if (step === currentStep) {
      el.dataset.state = "active";
      dot.textContent = String(step);
    } else {
      el.dataset.state = "pending";
      dot.textContent = String(step);
    }
  });

  // Step indicator click affordance
  step1IndicatorEl.style.opacity = "1";
  step2IndicatorEl.style.opacity = hasResults() ? "1" : "0.4";
  step3IndicatorEl.style.opacity = hasResults() ? "1" : "0.4";

  // Footer buttons
  backButtonEl.style.display = currentStep > 1 ? "" : "none";
  nextButtonEl.style.display = currentStep < 3 ? "" : "none";
  createButtonEl.style.display = currentStep === 3 ? "" : "none";
  createApplyButtonEl.style.display = currentStep === 3 ? "" : "none";

  // Next disabled until scan done
  if (currentStep === 1) {
    nextButtonEl.disabled = state.busy || !hasResults();
  } else {
    nextButtonEl.disabled = state.busy;
  }

  // Update tab counts
  updateTabCounts();
}

function updateTabCounts() {
  const visibleItems = repeatedOnlyEl.checked
    ? state.items.filter((item) => item.occurrences > 1)
    : state.items;

  const tabVariablesEl = document.getElementById("tabVariables");
  const tabTextStylesEl = document.getElementById("tabTextStyles");
  const tabColorStylesEl = document.getElementById("tabColorStyles");
  const tabEffectStylesEl = document.getElementById("tabEffectStyles");

  if (tabVariablesEl) tabVariablesEl.textContent = `Variables${visibleItems.length > 0 ? ` (${visibleItems.length})` : ""}`;
  if (tabTextStylesEl) tabTextStylesEl.textContent = `Text styles${state.textStyles.length > 0 ? ` (${state.textStyles.length})` : ""}`;
  if (tabColorStylesEl) tabColorStylesEl.textContent = `Color styles${state.colorStyles.length > 0 ? ` (${state.colorStyles.length})` : ""}`;
  if (tabEffectStylesEl) tabEffectStylesEl.textContent = `Effect styles${state.effectStyles.length > 0 ? ` (${state.effectStyles.length})` : ""}`;
}

function setActiveTab(tab: ActiveTab) {
  state.activeTab = tab;
  tabButtonEls.forEach((btn) => {
    btn.dataset.active = btn.dataset.tab === tab ? "true" : "false";
  });
  tabPanelEls.forEach((panel) => {
    panel.dataset.active = panel.dataset.tab === tab ? "true" : "false";
  });
}

// ── Event listeners ───────────────────────────────────────────────────────────
nextButtonEl.addEventListener("click", () => {
  if (state.currentStep < 3) {
    stepTo((state.currentStep + 1) as 2 | 3);
  }
});

backButtonEl.addEventListener("click", () => {
  if (state.currentStep > 1) {
    stepTo((state.currentStep - 1) as 1 | 2);
  }
});

// Step indicator navigation
[step1IndicatorEl, step2IndicatorEl, step3IndicatorEl].forEach((el) => {
  el.addEventListener("click", () => {
    const step = Number(el.dataset.step) as 1 | 2 | 3;
    if (step === 1 || hasResults()) {
      stepTo(step);
    }
  });
});

// Tabs
tabButtonEls.forEach((btn) => {
  btn.addEventListener("click", () => {
    setActiveTab(btn.dataset.tab as ActiveTab);
  });
});

scanButtonEl.addEventListener("click", () => {
  setBusy(true, "scan", "Reading selection...");
  summaryEl.textContent = "";
  sendPluginMessage({ type: "scan-selection" });
});

createButtonEl.addEventListener("click", () => {
  requestSelectedCreation(false);
});

createApplyButtonEl.addEventListener("click", () => {
  requestSelectedCreation(true);
});

exportButtonEl.addEventListener("click", () => {
  persistPrefs();
  const exportItems = state.items.filter((item) => item.include);

  if (exportItems.length === 0) {
    showToast("warning", "No checked items available to export.");
    return;
  }

  const payload = {
    meta: {
      collection: getCollectionName(),
      mode: getModeName() || "Base",
      exportedAt: new Date().toISOString(),
      total: exportItems.length
    },
    tokens: buildTokenTree(exportItems)
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const filename = buildExportFilename(getCollectionName());

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast("success", `${exportItems.length} items exported to ${filename}.`);
});

windowToggleButtonEl.addEventListener("click", () => {
  state.isMaximized = !state.isMaximized;
  syncWindowToggleLabel();
  sendPluginMessage({
    type: "resize-window",
    mode: state.isMaximized ? "maximized" : "default"
  });
});

// ── Plugin message handler ────────────────────────────────────────────────────
window.onmessage = (event: MessageEvent) => {
  const message = event.data.pluginMessage;
  if (!message) {
    return;
  }

  console.log("[ui] message received:", message.type, message);

  if (message.type === "scan-result") {
    setBusy(false);
    const hasRepeatedItems = message.repeatedCount > 0;
    state.forcedShowAll = !hasRepeatedItems;
    state.items = message.items.map((item: UiItem) => ({
      ...item,
      include: hasRepeatedItems ? item.occurrences > 1 : true
    }));
    state.colorStyles = Array.isArray(message.colorStyles) ? message.colorStyles : [];
    state.effectStyles = Array.isArray(message.effectStyles) ? message.effectStyles : [];
    state.textStyles = Array.isArray(message.textStyles) ? message.textStyles : [];
    state.textStyleDiagnostics = message.textStyleDiagnostics ?? state.textStyleDiagnostics;
    state.selectionCount = message.selectionCount;
    state.repeatedCount = message.repeatedCount;
    state.selectedNodeTypes = Array.isArray(message.selectedNodeTypes) ? message.selectedNodeTypes : [];
    state.acceptedNodeTypes = Array.isArray(message.acceptedNodeTypes) ? message.acceptedNodeTypes : [];

    if (!hasRepeatedItems && repeatedOnlyEl.checked) {
      repeatedOnlyEl.checked = false;
      showToast("info", "No repeated tokens found. Showing all scanned tokens.");
    }

    render();

    // Auto-advance to review step after successful scan
    if (hasResults() && state.currentStep === 1) {
      stepTo(2);
    }
    return;
  }

  if (message.type === "text-styles-result") {
    state.textStyles = Array.isArray(message.textStyles) ? message.textStyles : [];
    state.textStyleDiagnostics = message.textStyleDiagnostics ?? state.textStyleDiagnostics;
    render();
    return;
  }

  if (message.type === "color-styles-result") {
    state.colorStyles = Array.isArray(message.colorStyles) ? message.colorStyles : [];
    render();
    return;
  }

  if (message.type === "effect-styles-result") {
    state.effectStyles = Array.isArray(message.effectStyles) ? message.effectStyles : [];
    render();
    return;
  }

  if (message.type === "prefs-loaded") {
    applyPrefs(message.prefs as Partial<UiPrefs>);
    return;
  }

  if (message.type === "collections-loaded") {
    state.collections = Array.isArray(message.collections) ? message.collections : [];
    renderCollectionOptions();
    return;
  }

  if (message.type === "backend-ready") {
    showToast("info", "Plugin ready.");
    return;
  }

  if (message.type === "selection-updated") {
    if (message.selectionCount === 0 && state.items.length === 0) {
      statusTextEl.textContent = "Nothing selected.";
    }
    return;
  }

  if (message.type === "action-feedback") {
    console.log("[ui] feedback:", message.level, message.message);
    if (message.level !== "info") {
      state.pendingCreateActions = Math.max(0, state.pendingCreateActions - 1);
      if (state.pendingCreateActions === 0) {
        setBusy(false);
      }
    } else if (state.busy) {
      statusTextEl.textContent = message.message as string;
    }
    showToast(message.level as ToastLevel, message.message as string);
    if (message.level === "error") {
      statusTextEl.textContent = "Something went wrong.";
    }
  }
};

// ── Pref listeners ────────────────────────────────────────────────────────────
repeatedOnlyEl.addEventListener("change", () => {
  persistPrefs();
  render();
});

autoScanSelectionEl.addEventListener("change", persistPrefs);

collectionSelectEl.addEventListener("change", () => {
  updateCollectionVisibility();
  renderModeOptions();
  persistPrefs();
});

newCollectionNameEl.addEventListener("change", persistPrefs);

modeSelectEl.addEventListener("change", () => {
  updateModeVisibility();
  persistPrefs();
});

newModeNameEl.addEventListener("change", persistPrefs);

actionTargetEls.forEach((input) => {
  input.addEventListener("change", syncCreateActions);
});

// ── Init ──────────────────────────────────────────────────────────────────────
sendPluginMessage({ type: "load-prefs" });
syncWindowToggleLabel();
syncCreateActions();
syncStepUI();

// ── Render ────────────────────────────────────────────────────────────────────
function render() {
  renderTextStyleDiagnostics();
  updateTabCounts();

  if (!hasResults()) {
    itemsEl.innerHTML = '<p class="empty">No tokens found. Select Groups, Frames, or Sections then scan.</p>';
    colorStylesEl.innerHTML = '<p class="empty">No color styles detected yet.</p>';
    effectStylesEl.innerHTML = '<p class="empty">No effect styles detected yet.</p>';
    textStylesEl.innerHTML = '<p class="empty">No text styles detected yet.</p>';
    summaryEl.textContent = state.selectionCount > 0
      ? `${state.selectionCount} node(s) scanned — no token candidates found.`
      : "";
    syncStepUI();
    return;
  }

  const visibleItems = repeatedOnlyEl.checked
    ? state.items.filter((item) => item.occurrences > 1)
    : state.items;

  const counts = visibleItems.reduce<Record<string, number>>((acc, item) => {
    acc[item.group] = (acc[item.group] || 0) + 1;
    return acc;
  }, {});

  const modeLabel = state.forcedShowAll
    ? "No repeated tokens — showing all."
    : repeatedOnlyEl.checked
      ? "Repeated tokens only."
      : "All tokens.";

  summaryEl.textContent = `${state.selectionCount} node(s) · ${visibleItems.length} token(s): ${counts.colors || 0} colors, ${counts.texts || 0} texts, ${counts.sizes || 0} sizes. ${modeLabel}`;

  if (visibleItems.length === 0) {
    itemsEl.innerHTML = '<p class="empty">No repeated tokens found.</p>';
  } else {
    itemsEl.innerHTML = "";
    const grouped = groupItemsByType(visibleItems);
    renderGroup("Colors", "colors", grouped.colors);
    renderGroup("Texts", "texts", grouped.texts);
    renderGroup("Sizes", "sizes", grouped.sizes);
  }

  colorStylesEl.innerHTML = "";
  if (state.colorStyles.length === 0) {
    colorStylesEl.innerHTML = '<p class="empty">No color styles detected.</p>';
  } else {
    state.colorStyles.forEach((item) => colorStylesEl.appendChild(buildColorStyleCard(item)));
  }

  effectStylesEl.innerHTML = "";
  if (state.effectStyles.length === 0) {
    effectStylesEl.innerHTML = '<p class="empty">No effect styles detected.</p>';
  } else {
    state.effectStyles.forEach((item) => effectStylesEl.appendChild(buildEffectStyleCard(item)));
  }

  textStylesEl.innerHTML = "";
  if (state.textStyles.length === 0) {
    textStylesEl.innerHTML = '<p class="empty">No text styles detected.</p>';
  } else {
    state.textStyles.forEach((item) => textStylesEl.appendChild(buildTextStyleCard(item)));
  }

  syncStepUI();
}

// ── Group render ──────────────────────────────────────────────────────────────
function renderGroup(title: string, groupKey: "colors" | "texts" | "sizes", items: UiItem[]) {
  if (items.length === 0) return;

  const section = document.createElement("div");
  section.className = "group-section";

  const header = document.createElement("div");
  header.className = "group-header";
  header.innerHTML = `<span>${title}</span><span style="font-weight:400;font-size:10px;">${items.length}</span>`;

  const body = document.createElement("div");
  body.className = "group-body";

  header.addEventListener("click", () => {
    body.classList.toggle("collapsed");
  });

  items.forEach((item) => body.appendChild(buildItemCard(item)));

  section.appendChild(header);
  section.appendChild(body);
  itemsEl.appendChild(section);
}

// ── Card builders ─────────────────────────────────────────────────────────────
function buildItemCard(item: UiItem) {
  const wrapper = document.createElement("article");
  wrapper.className = "item";
  const valueLabel = getValueLabel(item);
  const sourceSummary = getSourceSummary(item.sources);
  wrapper.title = [item.description, ...item.sources].filter(Boolean).join("\n");

  const colorPreview =
    item.type === "COLOR"
      ? (() => {
          const c = item.value as { r: number; g: number; b: number; a: number };
          return `<div class="color-chip" style="background:rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${c.a})"></div>`;
        })()
      : "";

  const badgeClass = `badge-${item.group}`;

  const nameInput = document.createElement("input");
  nameInput.className = "item-name-input";
  nameInput.value = item.name;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = item.include;
  checkbox.style.cssText = "width:14px;height:14px;padding:0;cursor:pointer;";

  nameInput.addEventListener("input", (e: Event) => {
    const current = state.items.find((entry) => entry.id === item.id);
    if (current) current.name = (e.target as HTMLInputElement).value;
  });

  checkbox.addEventListener("change", (e: Event) => {
    const current = state.items.find((entry) => entry.id === item.id);
    if (current) current.include = (e.target as HTMLInputElement).checked;
  });

  wrapper.innerHTML = `
    <div class="item-line">
      ${colorPreview}
      <div class="item-main" id="item-main-${escapeHtml(item.id)}">
        <div class="item-value">${escapeHtml(valueLabel)}</div>
        <div class="item-occurrences">${item.occurrences}×</div>
      </div>
    </div>
    <div class="item-meta">
      <span class="badge ${badgeClass}">${item.group}</span>
      <span class="badge">${escapeHtml(item.category)}</span>
      <span style="font-size:11px;color:var(--figma-color-text-secondary);">${escapeHtml(sourceSummary)}</span>
    </div>
  `;

  const mainEl = wrapper.querySelector(".item-main") as HTMLDivElement;
  mainEl.insertBefore(nameInput, mainEl.firstChild);
  mainEl.appendChild(checkbox);

  return wrapper;
}

function buildTextStyleCard(item: UiTextStyle) {
  const wrapper = document.createElement("article");
  wrapper.className = "item";
  const family = item.signature?.fontName?.family ?? "Unknown";
  const style = item.signature?.fontName?.style ?? "Unknown";
  wrapper.title = `${family} ${style}`;

  wrapper.innerHTML = `
    <div class="item-line">
      <div class="item-main style-main">
        <input class="item-name-input" value="${escapeHtml(item.name)}" />
        <div class="item-value">${escapeHtml(formatTextStyleValue(item))}</div>
        <div class="item-occurrences">${item.occurrences}×</div>
      </div>
    </div>
    <div class="item-meta">
      <span class="badge badge-style">TEXT STYLE</span>
      <span class="badge">${escapeHtml(family)}</span>
      <span style="font-size:11px;color:var(--figma-color-text-secondary);">${escapeHtml(style)}</span>
    </div>
  `;

  const input = wrapper.querySelector(".item-name-input") as HTMLInputElement;
  input.addEventListener("input", (e: Event) => {
    const current = state.textStyles.find((entry) => entry.key === item.key);
    if (current) current.name = (e.target as HTMLInputElement).value;
  });

  return wrapper;
}

function buildColorStyleCard(item: UiColorStyle) {
  const wrapper = document.createElement("article");
  wrapper.className = "item";
  wrapper.title = rgbaLabel(item.value);

  wrapper.innerHTML = `
    <div class="item-line">
      <div class="color-chip" style="background:rgba(${Math.round(item.value.r * 255)},${Math.round(item.value.g * 255)},${Math.round(item.value.b * 255)},${item.value.a})"></div>
      <div class="item-main style-main">
        <input class="item-name-input" value="${escapeHtml(item.name)}" />
        <div class="item-value">${escapeHtml(rgbaLabel(item.value))}</div>
        <div class="item-occurrences">${item.occurrences}×</div>
      </div>
    </div>
    <div class="item-meta">
      <span class="badge badge-style">COLOR STYLE</span>
      <span class="badge">${escapeHtml(item.category)}</span>
    </div>
  `;

  const input = wrapper.querySelector(".item-name-input") as HTMLInputElement;
  input.addEventListener("input", (e: Event) => {
    const current = state.colorStyles.find((entry) => entry.key === item.key);
    if (current) current.name = (e.target as HTMLInputElement).value;
  });

  return wrapper;
}

function buildEffectStyleCard(item: UiEffectStyle) {
  const wrapper = document.createElement("article");
  wrapper.className = "item";
  wrapper.title = summarizeEffects(item.effects);

  wrapper.innerHTML = `
    <div class="item-line">
      <div class="item-main style-main">
        <input class="item-name-input" value="${escapeHtml(item.name)}" />
        <div class="item-value">${escapeHtml(summarizeEffects(item.effects))}</div>
        <div class="item-occurrences">${item.occurrences}×</div>
      </div>
    </div>
    <div class="item-meta">
      <span class="badge badge-style">EFFECT STYLE</span>
      <span class="badge">${escapeHtml(item.category)}</span>
    </div>
  `;

  const input = wrapper.querySelector(".item-name-input") as HTMLInputElement;
  input.addEventListener("input", (e: Event) => {
    const current = state.effectStyles.find((entry) => entry.key === item.key);
    if (current) current.name = (e.target as HTMLInputElement).value;
  });

  return wrapper;
}

// ── Utility ───────────────────────────────────────────────────────────────────
function groupItemsByType(items: UiItem[]) {
  return items.reduce(
    (acc, item) => {
      acc[item.group].push(item);
      return acc;
    },
    { colors: [] as UiItem[], texts: [] as UiItem[], sizes: [] as UiItem[] }
  );
}

function persistPrefs() {
  sendPluginMessage({
    type: "save-prefs",
    prefs: {
      collectionName: getCollectionName(),
      modeName: getModeName(),
      repeatedOnly: repeatedOnlyEl.checked,
      autoScanSelection: autoScanSelectionEl.checked
    } as UiPrefs
  });
}

function setBusy(busy: boolean, action: "scan" | "create" | "create-apply" | null = null, label?: string) {
  state.busy = busy;

  scanButtonEl.disabled = busy;
  createButtonEl.disabled = busy;
  createApplyButtonEl.disabled = busy;
  exportButtonEl.disabled = busy;
  actionTargetEls.forEach((input) => { input.disabled = busy; });

  scanButtonEl.dataset.loading = busy && action === "scan" ? "true" : "false";
  createButtonEl.dataset.loading = busy && action === "create" ? "true" : "false";
  createApplyButtonEl.dataset.loading = busy && action === "create-apply" ? "true" : "false";

  scanButtonEl.textContent = busy && action === "scan" ? "Scanning..." : "Scan selection";
  createButtonEl.textContent = busy && action === "create" ? "Creating..." : "Create";
  createApplyButtonEl.textContent = busy && action === "create-apply" ? "Creating..." : "Create and apply";

  if (busy) {
    statusDotEl.dataset.state = "busy";
    statusTextEl.textContent = label || "Working...";
    nextButtonEl.disabled = true;
    return;
  }

  statusDotEl.dataset.state = "idle";
  statusTextEl.textContent = "Ready";
  state.pendingCreateActions = 0;
  syncCreateActions();
  syncStepUI();
}

function showToast(level: ToastLevel, message: string) {
  toastEl.textContent = message;
  toastEl.dataset.level = level;
  toastEl.dataset.visible = "true";

  statusDotEl.dataset.state = level === "error" ? "error" : level === "warning" ? "warning" : "idle";
  statusTextEl.textContent = message;

  if (state.toastTimer !== null) {
    window.clearTimeout(state.toastTimer);
  }

  state.toastTimer = window.setTimeout(() => {
    toastEl.dataset.visible = "false";
    if (!state.busy) {
      statusDotEl.dataset.state = "idle";
      statusTextEl.textContent = "Ready";
    }
    state.toastTimer = null;
  }, 3200);
}

function applyPrefs(prefs: Partial<UiPrefs>) {
  if (typeof prefs.collectionName === "string") applyCollectionPref(prefs.collectionName);
  if (typeof prefs.modeName === "string") applyModePref(prefs.modeName);
  if (typeof prefs.repeatedOnly === "boolean") repeatedOnlyEl.checked = prefs.repeatedOnly;
  if (typeof prefs.autoScanSelection === "boolean") autoScanSelectionEl.checked = prefs.autoScanSelection;
}

function requestVariableCreation(bindToSelection: boolean) {
  sendPluginMessage({
    type: "create-variables",
    collectionName: getCollectionName(),
    modeName: getModeName(),
    bindToSelection,
    items: state.items
  });
}

function requestTextStyleCreation(applyToSelection: boolean) {
  sendPluginMessage({
    type: "create-text-styles",
    applyToSelection,
    styles: state.textStyles.map((s) => ({ key: s.key, name: s.name }))
  });
}

function requestColorStyleCreation(applyToSelection: boolean) {
  sendPluginMessage({
    type: "create-color-styles",
    applyToSelection,
    styles: state.colorStyles.map((s) => ({ key: s.key, name: s.name }))
  });
}

function requestEffectStyleCreation(applyToSelection: boolean) {
  sendPluginMessage({
    type: "create-effect-styles",
    applyToSelection,
    styles: state.effectStyles.map((s) => ({ key: s.key, name: s.name }))
  });
}

function requestSelectedCreation(applyToSelection: boolean) {
  const targets = getSelectedActionTargets();
  if (targets.length === 0) {
    showToast("warning", "Select at least one output type first.");
    return;
  }

  persistPrefs();
  state.pendingCreateActions = targets.length;
  setBusy(true, applyToSelection ? "create-apply" : "create", "Creating...");

  targets.forEach((target) => {
    if (target === "variables") { requestVariableCreation(applyToSelection); return; }
    if (target === "text-styles") { requestTextStyleCreation(applyToSelection); return; }
    if (target === "color-styles") { requestColorStyleCreation(applyToSelection); return; }
    requestEffectStyleCreation(applyToSelection);
  });
}

function syncCreateActions() {
  const hasSelection = getSelectedActionTargets().length > 0;
  if (!state.busy) {
    createButtonEl.disabled = !hasSelection;
    createApplyButtonEl.disabled = !hasSelection;
  }
}

function renderCollectionOptions() {
  const currentCollection = getCollectionName();
  collectionSelectEl.innerHTML = "";

  for (const collection of state.collections) {
    const option = document.createElement("option");
    option.value = collection.name;
    option.textContent = collection.name;
    collectionSelectEl.appendChild(option);
  }

  const newOption = document.createElement("option");
  newOption.value = "__new__";
  newOption.textContent = "Create new collection...";
  collectionSelectEl.appendChild(newOption);

  applyCollectionPref(currentCollection || newCollectionNameEl.value || "Selection Variables");
  renderModeOptions();
}

function renderModeOptions() {
  const currentMode = getModeName();
  const selectedCollection = state.collections.find((entry) => entry.name === collectionSelectEl.value);
  modeSelectEl.innerHTML = "";

  for (const mode of selectedCollection?.modes ?? []) {
    const option = document.createElement("option");
    option.value = mode;
    option.textContent = mode;
    modeSelectEl.appendChild(option);
  }

  const newOption = document.createElement("option");
  newOption.value = "__new__";
  newOption.textContent = "Create new mode...";
  modeSelectEl.appendChild(newOption);

  applyModePref(currentMode || newModeNameEl.value || "Base");
}

function applyCollectionPref(value: string) {
  const existing = state.collections.some((entry) => entry.name === value);
  if (existing) {
    collectionSelectEl.value = value;
  } else {
    collectionSelectEl.value = "__new__";
    newCollectionNameEl.value = value || "Selection Variables";
  }
  updateCollectionVisibility();
}

function applyModePref(value: string) {
  const selectedCollection = state.collections.find((entry) => entry.name === collectionSelectEl.value);
  const existing = selectedCollection?.modes.includes(value);
  if (existing) {
    modeSelectEl.value = value;
  } else {
    modeSelectEl.value = "__new__";
    newModeNameEl.value = value || "Base";
  }
  updateModeVisibility();
}

function updateCollectionVisibility() {
  newCollectionNameEl.classList.toggle("hidden", collectionSelectEl.value !== "__new__");
}

function updateModeVisibility() {
  newModeNameEl.classList.toggle("hidden", modeSelectEl.value !== "__new__");
}

function getCollectionName() {
  return collectionSelectEl.value === "__new__"
    ? newCollectionNameEl.value.trim() || "Selection Variables"
    : collectionSelectEl.value;
}

function getModeName() {
  return modeSelectEl.value === "__new__"
    ? newModeNameEl.value.trim() || "Base"
    : modeSelectEl.value;
}

function getSelectedActionTargets(): ActionTarget[] {
  return actionTargetEls
    .filter((input) => input.checked)
    .map((input) => input.value)
    .filter((value): value is ActionTarget =>
      value === "variables" || value === "text-styles" || value === "color-styles" || value === "effect-styles"
    );
}

function renderTextStyleDiagnostics() {
  textStylesDiagnosticsEl.innerHTML = `
    <span><strong>${state.textStyleDiagnostics.textNodesFound}</strong> text nodes</span>
    <span><strong>${state.textStyleDiagnostics.styledSegmentsRead}</strong> segments</span>
    <span><strong>${state.textStyleDiagnostics.styleCandidatesGenerated}</strong> candidates</span>
  `;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sendPluginMessage(message: Record<string, unknown>) {
  window.parent.postMessage({ pluginMessage: message }, "*");
}

function syncWindowToggleLabel() {
  windowToggleButtonEl.textContent = state.isMaximized ? "Restore" : "Maximize";
}

function getValueLabel(item: UiItem) {
  if (item.type === "COLOR") {
    const c = item.value as { r: number; g: number; b: number; a: number };
    return `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, ${roundAlpha(c.a)})`;
  }
  return String(item.value);
}

function getSourceSummary(sources: string[]) {
  if (sources.length === 0) return "No sources";
  if (sources.length === 1) return sources[0];
  return `${sources[0]} +${sources.length - 1} more`;
}

function formatTextStyleValue(item: UiTextStyle) {
  const lineHeightUnit = item.signature?.lineHeight?.unit ?? "AUTO";
  const lineHeightValue = item.signature?.lineHeight?.value ?? 0;
  const fontSize = item.signature?.fontSize ?? 0;
  const lineHeight = lineHeightUnit === "AUTO" ? "auto" : `${lineHeightValue}${lineHeightUnit === "PIXELS" ? "px" : "%"}`;
  return `${fontSize}px / ${lineHeight}`;
}

function rgbaLabel(value: { r: number; g: number; b: number; a: number }) {
  return `rgba(${Math.round(value.r * 255)}, ${Math.round(value.g * 255)}, ${Math.round(value.b * 255)}, ${roundAlpha(value.a)})`;
}

function summarizeEffects(effects: Array<Record<string, unknown>>) {
  return effects
    .map((effect) => {
      const type = String(effect.type ?? "EFFECT").toLowerCase().replace(/_/g, " ");
      const radius = typeof effect.radius === "number" ? `${effect.radius}px` : "";
      return [type, radius].filter(Boolean).join(" ");
    })
    .join(" | ");
}

function roundAlpha(value: number) {
  return Number(value.toFixed(3));
}

function formatTypes(values: string[]) {
  return values.length > 0 ? values.join(", ") : "none";
}

// suppress unused warning — used in render()
void formatTypes;
