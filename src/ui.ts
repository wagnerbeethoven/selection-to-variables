import { buildExportFilename, buildTokenTree } from "./export-tokens";
import { type Locale, SUPPORTED_LOCALES, LOCALE_LABELS, t } from "./i18n";

declare const PLUGIN_VERSION: string;
declare const PLUGIN_BUILD_DATE: string;

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
  locale: Locale;
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
const localeSelectEl = document.getElementById("localeSelect") as HTMLSelectElement;
const aboutButtonEl = document.getElementById("aboutButton") as HTMLButtonElement;
const aboutDialogEl = document.getElementById("aboutDialog") as HTMLDialogElement;
const aboutCloseButtonEl = document.getElementById("aboutCloseButton") as HTMLButtonElement;
const aboutVersionEl = document.getElementById("aboutVersion") as HTMLSpanElement;
const aboutBuildDateEl = document.getElementById("aboutBuildDate") as HTMLSpanElement;
const whatsNewSummaryEl = document.getElementById("whatsNewSummary") as HTMLElement;
const whatsNewListEl = document.getElementById("whatsNewList") as HTMLUListElement;
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
const tabVariablesEl = document.getElementById("tabVariables") as HTMLButtonElement;
const tabTextStylesEl = document.getElementById("tabTextStyles") as HTMLButtonElement;
const tabColorStylesEl = document.getElementById("tabColorStyles") as HTMLButtonElement;
const tabEffectStylesEl = document.getElementById("tabEffectStyles") as HTMLButtonElement;

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
  locale: Locale;
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
  activeTab: "variables",
  locale: "en"
};

// ── i18n ──────────────────────────────────────────────────────────────────────
function detectLocale(): Locale {
  const lang = navigator.language.toLowerCase();
  if (lang === "pt-br" || lang.startsWith("pt")) return "pt-BR";
  if (lang.startsWith("es")) return "es";
  return "en";
}

function applyTranslations(locale: Locale) {
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n!, locale);
  });
  document.querySelectorAll<HTMLInputElement>("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder!, locale);
  });
  document.querySelectorAll<HTMLElement>("[data-i18n-aria-label]").forEach((el) => {
    el.setAttribute("aria-label", t(el.dataset.i18nAriaLabel!, locale));
  });
}

function setLocale(locale: Locale) {
  state.locale = locale;
  localeSelectEl.value = locale;
  document.documentElement.lang = locale === "pt-BR" ? "pt" : locale;
  applyTranslations(locale);
  renderWhatsNew(locale);
  syncWindowToggleLabel();
  if (!state.busy) {
    scanButtonEl.textContent = t("btn_scan", locale);
    createButtonEl.textContent = t("btn_create", locale);
    createApplyButtonEl.textContent = t("btn_create_apply", locale);
  }
  render();
}

// Init locale select options
SUPPORTED_LOCALES.forEach((loc) => {
  const option = document.createElement("option");
  option.value = loc;
  option.textContent = LOCALE_LABELS[loc];
  localeSelectEl.appendChild(option);
});

localeSelectEl.addEventListener("change", () => {
  setLocale(localeSelectEl.value as Locale);
  persistPrefs();
});

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

    if (step === currentStep) {
      el.setAttribute("aria-current", "step");
    } else {
      el.removeAttribute("aria-current");
    }

    const locked = step > 1 && !hasResults();
    if (locked) {
      el.setAttribute("aria-disabled", "true");
    } else {
      el.removeAttribute("aria-disabled");
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

  const loc = state.locale;
  tabVariablesEl.textContent = `${t("tab_variables", loc)}${visibleItems.length > 0 ? ` (${visibleItems.length})` : ""}`;
  tabTextStylesEl.textContent = `${t("tab_text_styles", loc)}${state.textStyles.length > 0 ? ` (${state.textStyles.length})` : ""}`;
  tabColorStylesEl.textContent = `${t("tab_color_styles", loc)}${state.colorStyles.length > 0 ? ` (${state.colorStyles.length})` : ""}`;
  tabEffectStylesEl.textContent = `${t("tab_effect_styles", loc)}${state.effectStyles.length > 0 ? ` (${state.effectStyles.length})` : ""}`;
}

function setActiveTab(tab: ActiveTab) {
  state.activeTab = tab;
  tabButtonEls.forEach((btn) => {
    const isActive = btn.dataset.tab === tab;
    btn.dataset.active = isActive ? "true" : "false";
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
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
  const activate = () => {
    const step = Number(el.dataset.step) as 1 | 2 | 3;
    if (step === 1 || hasResults()) {
      stepTo(step);
    }
  };
  el.addEventListener("click", activate);
  el.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      activate();
    }
  });
});

// Tabs
tabButtonEls.forEach((btn, index) => {
  btn.addEventListener("click", () => {
    setActiveTab(btn.dataset.tab as ActiveTab);
    btn.focus();
  });
  btn.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const next = tabButtonEls[(index + 1) % tabButtonEls.length];
      next.focus();
      setActiveTab(next.dataset.tab as ActiveTab);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prev = tabButtonEls[(index - 1 + tabButtonEls.length) % tabButtonEls.length];
      prev.focus();
      setActiveTab(prev.dataset.tab as ActiveTab);
    } else if (e.key === "Home") {
      e.preventDefault();
      tabButtonEls[0].focus();
      setActiveTab(tabButtonEls[0].dataset.tab as ActiveTab);
    } else if (e.key === "End") {
      e.preventDefault();
      tabButtonEls[tabButtonEls.length - 1].focus();
      setActiveTab(tabButtonEls[tabButtonEls.length - 1].dataset.tab as ActiveTab);
    }
  });
});

scanButtonEl.addEventListener("click", () => {
  setBusy(true, "scan", t("backend_scanning", state.locale));
  summaryEl.textContent = "";
  sendPluginMessage({ type: "scan-selection", locale: state.locale });
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
    showToast("warning", t("toast_no_export", state.locale));
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
  showToast("success", t("toast_exported", state.locale, { count: exportItems.length, filename }));
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
window.addEventListener("message", (event: MessageEvent) => {
  const message = event.data.pluginMessage;
  if (!message) {
    return;
  }

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
      showToast("info", t("toast_no_repeated", state.locale));
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
    showToast("info", t("toast_plugin_ready", state.locale));
    return;
  }

  if (message.type === "selection-updated") {
    if (message.selectionCount === 0 && state.items.length === 0) {
      statusTextEl.textContent = t("status_nothing_selected", state.locale);
    }
    return;
  }

  if (message.type === "action-feedback") {
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
      statusTextEl.textContent = t("status_something_wrong", state.locale);
    }
  }
});

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

// ── About dialog ──────────────────────────────────────────────────────────────
aboutVersionEl.textContent = PLUGIN_VERSION;
aboutBuildDateEl.textContent = PLUGIN_BUILD_DATE;

function renderWhatsNew(locale: Locale) {
  whatsNewSummaryEl.textContent = t("whats_new_title", locale, { version: PLUGIN_VERSION });
  const items = [
    "whats_new_i18n",
    "whats_new_wizard",
    "whats_new_about",
    "whats_new_dark_mode",
    "whats_new_a11y",
    "whats_new_perf",
  ];
  whatsNewListEl.innerHTML = items
    .map((key) => `<li>${escapeHtml(t(key, locale))}</li>`)
    .join("");
}

aboutButtonEl.addEventListener("click", () => {
  aboutDialogEl.showModal();
  aboutCloseButtonEl.focus();
});

aboutCloseButtonEl.addEventListener("click", () => {
  aboutDialogEl.close();
  aboutButtonEl.focus();
});

aboutDialogEl.addEventListener("click", (e: MouseEvent) => {
  if (e.target === aboutDialogEl) {
    aboutDialogEl.close();
    aboutButtonEl.focus();
  }
});

aboutDialogEl.querySelectorAll<HTMLButtonElement>(".about-link[data-url]").forEach((btn) => {
  btn.addEventListener("click", () => {
    sendPluginMessage({ type: "open-url", url: btn.dataset.url! });
  });
});

// ── Init ──────────────────────────────────────────────────────────────────────
state.locale = detectLocale();
document.documentElement.lang = state.locale === "pt-BR" ? "pt" : state.locale;
localeSelectEl.value = state.locale;
applyTranslations(state.locale);
renderWhatsNew(state.locale);
sendPluginMessage({ type: "load-prefs" });
syncWindowToggleLabel();
syncCreateActions();
syncStepUI();

// ── Render ────────────────────────────────────────────────────────────────────
function render() {
  renderTextStyleDiagnostics();
  updateTabCounts();

  if (!hasResults()) {
    const loc = state.locale;
    itemsEl.innerHTML = `<p class="empty">${t("empty_tokens", loc)}</p>`;
    colorStylesEl.innerHTML = `<p class="empty">${t("empty_color_styles_pending", loc)}</p>`;
    effectStylesEl.innerHTML = `<p class="empty">${t("empty_effect_styles_pending", loc)}</p>`;
    textStylesEl.innerHTML = `<p class="empty">${t("empty_text_styles_pending", loc)}</p>`;
    summaryEl.textContent = state.selectionCount > 0
      ? t("summary_no_tokens", loc, { nodes: state.selectionCount })
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

  const loc = state.locale;
  const modeLabel = state.forcedShowAll
    ? t("summary_no_repeated_all", loc)
    : repeatedOnlyEl.checked
      ? t("summary_repeated_only", loc)
      : t("summary_all_tokens", loc);

  summaryEl.textContent = t("summary_scanned", loc, {
    nodes: state.selectionCount,
    tokens: visibleItems.length,
    colors: counts.colors || 0,
    texts: counts.texts || 0,
    sizes: counts.sizes || 0,
    mode: modeLabel
  });

  if (visibleItems.length === 0) {
    itemsEl.innerHTML = `<p class="empty">${t("empty_repeated", loc)}</p>`;
  } else {
    itemsEl.innerHTML = "";
    const grouped = groupItemsByType(visibleItems);
    renderGroup("colors", grouped.colors);
    renderGroup("texts", grouped.texts);
    renderGroup("sizes", grouped.sizes);
  }

  colorStylesEl.innerHTML = "";
  if (state.colorStyles.length === 0) {
    colorStylesEl.innerHTML = `<p class="empty">${t("empty_color_styles", loc)}</p>`;
  } else {
    state.colorStyles.forEach((item) => colorStylesEl.appendChild(buildColorStyleCard(item)));
  }

  effectStylesEl.innerHTML = "";
  if (state.effectStyles.length === 0) {
    effectStylesEl.innerHTML = `<p class="empty">${t("empty_effect_styles", loc)}</p>`;
  } else {
    state.effectStyles.forEach((item) => effectStylesEl.appendChild(buildEffectStyleCard(item)));
  }

  textStylesEl.innerHTML = "";
  if (state.textStyles.length === 0) {
    textStylesEl.innerHTML = `<p class="empty">${t("empty_text_styles", loc)}</p>`;
  } else {
    state.textStyles.forEach((item) => textStylesEl.appendChild(buildTextStyleCard(item)));
  }

  syncStepUI();
}

// ── Group render ──────────────────────────────────────────────────────────────
function renderGroup(groupKey: "colors" | "texts" | "sizes", items: UiItem[]) {
  if (items.length === 0) return;

  const titleMap: Record<"colors" | "texts" | "sizes", string> = {
    colors: t("group_colors", state.locale),
    texts: t("group_texts", state.locale),
    sizes: t("group_sizes", state.locale),
  };
  const title = titleMap[groupKey];
  const bodyId = `group-body-${groupKey}`;

  const section = document.createElement("div");
  section.className = "group-section";

  const header = document.createElement("div");
  header.className = "group-header";
  header.setAttribute("role", "button");
  header.setAttribute("tabindex", "0");
  header.setAttribute("aria-expanded", "true");
  header.setAttribute("aria-controls", bodyId);
  header.innerHTML = `<span>${escapeHtml(title)}</span><span style="font-weight:400;font-size:10px;" aria-hidden="true">${items.length}</span>`;

  const body = document.createElement("div");
  body.className = "group-body";
  body.id = bodyId;

  const toggle = () => {
    const collapsed = body.classList.toggle("collapsed");
    header.setAttribute("aria-expanded", String(!collapsed));
  };
  header.addEventListener("click", toggle);
  header.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
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
          return `<div class="color-chip" aria-hidden="true" style="background:rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${c.a})"></div>`;
        })()
      : "";

  const badgeClass = `badge-${item.group}`;
  const loc = state.locale;
  const groupLabel = escapeHtml(t(`group_${item.group}`, loc));

  const nameInput = document.createElement("input");
  nameInput.className = "item-name-input";
  nameInput.value = item.name;
  nameInput.setAttribute("aria-label", t("aria_name_token", loc));

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = item.include;
  checkbox.setAttribute("aria-label", t("checkbox_include", loc));
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
      <div class="item-main">
        <div class="item-value">${escapeHtml(valueLabel)}</div>
        <div class="item-occurrences" aria-hidden="true">${item.occurrences}×</div>
      </div>
    </div>
    <div class="item-meta">
      <span class="badge ${badgeClass}">${groupLabel}</span>
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
        <input class="item-name-input" aria-label="${escapeHtml(t("aria_name_text_style", state.locale))}" value="${escapeHtml(item.name)}" />
        <div class="item-value">${escapeHtml(formatTextStyleValue(item))}</div>
        <div class="item-occurrences">${item.occurrences}×</div>
      </div>
    </div>
    <div class="item-meta">
      <span class="badge badge-style">${escapeHtml(t("badge_text_style", state.locale).toUpperCase())}</span>
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
      <div class="color-chip" style="background:rgba(${Math.round(item.value.r * 255)},${Math.round(item.value.g * 255)},${Math.round(item.value.b * 255)},${item.value.a})" aria-hidden="true"></div>
      <div class="item-main style-main">
        <input class="item-name-input" aria-label="${escapeHtml(t("aria_name_color_style", state.locale))}" value="${escapeHtml(item.name)}" />
        <div class="item-value">${escapeHtml(rgbaLabel(item.value))}</div>
        <div class="item-occurrences">${item.occurrences}×</div>
      </div>
    </div>
    <div class="item-meta">
      <span class="badge badge-style">${escapeHtml(t("badge_color_style", state.locale).toUpperCase())}</span>
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
        <input class="item-name-input" aria-label="${escapeHtml(t("aria_name_effect_style", state.locale))}" value="${escapeHtml(item.name)}" />
        <div class="item-value">${escapeHtml(summarizeEffects(item.effects))}</div>
        <div class="item-occurrences">${item.occurrences}×</div>
      </div>
    </div>
    <div class="item-meta">
      <span class="badge badge-style">${escapeHtml(t("badge_effect_style", state.locale).toUpperCase())}</span>
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
      autoScanSelection: autoScanSelectionEl.checked,
      locale: state.locale
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

  const loc = state.locale;
  scanButtonEl.dataset.loading = busy && action === "scan" ? "true" : "false";
  createButtonEl.dataset.loading = busy && action === "create" ? "true" : "false";
  createApplyButtonEl.dataset.loading = busy && action === "create-apply" ? "true" : "false";

  scanButtonEl.textContent = busy && action === "scan" ? t("btn_scan_loading", loc) : t("btn_scan", loc);
  createButtonEl.textContent = busy && action === "create" ? t("btn_create_loading", loc) : t("btn_create", loc);
  createApplyButtonEl.textContent = busy && action === "create-apply" ? t("btn_create_apply_loading", loc) : t("btn_create_apply", loc);

  if (busy) {
    statusDotEl.dataset.state = "busy";
    statusTextEl.textContent = label || t("status_ready", loc);
    nextButtonEl.disabled = true;
    return;
  }

  statusDotEl.dataset.state = "idle";
  statusTextEl.textContent = t("status_ready", state.locale);
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
      statusTextEl.textContent = t("status_ready", state.locale);
    }
    state.toastTimer = null;
  }, 3200);
}

function applyPrefs(prefs: Partial<UiPrefs>) {
  if (typeof prefs.collectionName === "string") applyCollectionPref(prefs.collectionName);
  if (typeof prefs.modeName === "string") applyModePref(prefs.modeName);
  if (typeof prefs.repeatedOnly === "boolean") repeatedOnlyEl.checked = prefs.repeatedOnly;
  if (typeof prefs.autoScanSelection === "boolean") autoScanSelectionEl.checked = prefs.autoScanSelection;
  if (prefs.locale && SUPPORTED_LOCALES.includes(prefs.locale)) {
    setLocale(prefs.locale);
  }
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
    showToast("warning", t("toast_select_output", state.locale));
    return;
  }

  persistPrefs();
  state.pendingCreateActions = targets.length;
  setBusy(true, applyToSelection ? "create-apply" : "create", t("btn_create_loading", state.locale));

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
  newOption.textContent = t("option_new_collection", state.locale);
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
  newOption.textContent = t("option_new_mode", state.locale);
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
  const loc = state.locale;
  const { textNodesFound, styledSegmentsRead, styleCandidatesGenerated } = state.textStyleDiagnostics;
  textStylesDiagnosticsEl.innerHTML = `
    <span><strong>${textNodesFound}</strong> ${escapeHtml(t("diag_text_nodes", loc))}</span>
    <span><strong>${styledSegmentsRead}</strong> ${escapeHtml(t("diag_segments", loc))}</span>
    <span><strong>${styleCandidatesGenerated}</strong> ${escapeHtml(t("diag_candidates", loc))}</span>
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
  windowToggleButtonEl.textContent = state.isMaximized ? t("btn_restore", state.locale) : t("btn_maximize", state.locale);
}

function getValueLabel(item: UiItem) {
  if (item.type === "COLOR") {
    const c = item.value as { r: number; g: number; b: number; a: number };
    return `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, ${roundAlpha(c.a)})`;
  }
  return String(item.value);
}

function getSourceSummary(sources: string[]) {
  if (sources.length === 0) return t("source_none", state.locale);
  if (sources.length === 1) return sources[0];
  return `${sources[0]} ${t("source_more", state.locale, { count: sources.length - 1 })}`;
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

