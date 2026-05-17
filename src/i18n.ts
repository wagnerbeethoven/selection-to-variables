export type Locale = "en" | "pt-BR" | "es";

export const SUPPORTED_LOCALES: Locale[] = ["en", "pt-BR", "es"];

export const LOCALE_LABELS: Record<Locale, string> = {
  "en": "English",
  "pt-BR": "Português",
  "es": "Español",
};

const messages: Record<Locale, Record<string, string>> = {
  en: {
    // Window
    btn_maximize: "Maximize",
    btn_restore: "Restore",

    // Steps
    step_configure: "Configure",
    step_review: "Review",
    step_create: "Create",
    step1_aria: "Step 1: Configure",
    step2_aria: "Step 2: Review",
    step3_aria: "Step 3: Create",

    // Fields
    field_collection: "Collection",
    field_mode: "Mode",
    placeholder_collection: "Collection name",
    placeholder_mode: "Mode name",
    option_new_collection: "Create new collection...",
    option_new_mode: "Create new mode...",

    // Toggles
    toggle_repeated_only: "Show repeated tokens only",
    toggle_auto_scan: "Auto-refresh on selection change",

    // Status
    status_ready: "Ready",
    status_nothing_selected: "Nothing selected.",
    status_something_wrong: "Something went wrong.",

    // Scan
    scan_cta_desc: "Select Groups, Frames, or Sections in Figma, then scan to extract tokens.",
    btn_scan: "Scan selection",
    btn_scan_loading: "Scanning...",

    // Tabs
    tab_variables: "Variables",
    tab_text_styles: "Text styles",
    tab_color_styles: "Color styles",
    tab_effect_styles: "Effect styles",

    // Step 3
    step3_desc: "Choose what to create from the scanned tokens:",
    btn_export: "Export JSON",
    btn_create: "Create",
    btn_create_loading: "Creating...",
    btn_create_apply: "Create and apply",
    btn_create_apply_loading: "Creating...",
    btn_back: "← Back",
    btn_next: "Next →",

    // Empty states
    empty_tokens: "No tokens found. Select Groups, Frames, or Sections then scan.",
    empty_color_styles_pending: "No color styles detected yet.",
    empty_effect_styles_pending: "No effect styles detected yet.",
    empty_text_styles_pending: "No text styles detected yet.",
    empty_color_styles: "No color styles detected.",
    empty_effect_styles: "No effect styles detected.",
    empty_text_styles: "No text styles detected.",
    empty_repeated: "No repeated tokens found.",

    // Summary
    summary_no_repeated_all: "No repeated tokens — showing all.",
    summary_repeated_only: "Repeated tokens only.",
    summary_all_tokens: "All tokens.",
    summary_scanned: "{nodes} node(s) · {tokens} token(s): {colors} colors, {texts} texts, {sizes} sizes. {mode}",
    summary_no_tokens: "{nodes} node(s) scanned — no token candidates found.",

    // Toast (UI-side)
    toast_no_export: "No checked items available to export.",
    toast_exported: "{count} item(s) exported to {filename}.",
    toast_select_output: "Select at least one output type first.",
    toast_no_repeated: "No repeated tokens found. Showing all scanned tokens.",
    toast_plugin_ready: "Plugin ready.",

    // Group headers
    group_colors: "Colors",
    group_texts: "Texts",
    group_sizes: "Sizes",

    // About dialog
    about_btn: "About",
    about_title: "About this plugin",
    about_close: "Close",
    about_created_by: "Created by",
    about_version: "Version",
    about_built: "Last updated",
    about_description: "Transform selections from your Figma canvas into variables, text styles, color styles, effect styles, and JSON design tokens.",
    about_contact: "Contact",
    about_links: "Links",

    // Source summary
    source_none: "No sources",
    source_more: "+{count} more",

    // Aria labels for inputs
    aria_name_token: "Token name",
    aria_name_text_style: "Text style name",
    aria_name_color_style: "Color style name",
    aria_name_effect_style: "Effect style name",

    // Backend messages
    backend_ready: "Plugin backend is ready.",
    backend_scanning: "Scanning current selection...",
    backend_creating_variables: "Creating variables...",
    backend_creating_text_styles: "Creating text styles...",
    backend_creating_color_styles: "Creating color styles...",
    backend_creating_effect_styles: "Creating effect styles...",
    backend_no_items: "No items selected to create variables.",
    backend_no_checked: "No checked items available to create variables.",
    backend_select_node: "Select at least one node.",
    backend_select_frame: "Select at least one Group, Frame, or Section.",
    backend_ignored_layers: "Only Groups, Frames, and Sections are scanned. Other selected layers were ignored.",
    backend_select_layer: "Select at least one frame, component, or text layer.",
    backend_scan_complete: "Scan complete. Found {items} token candidates, {colorStyles} color styles, {effectStyles} effect styles, and {textStyles} text style candidates from {layers} accepted layer(s).",
    backend_variables_created: "{created} variables created and {reused} reused in \"{collection}\".",
    backend_variables_bindings: " {bound} binding(s) applied.",
    backend_style_created: "{created} {label} created and {reused} reused.",
    backend_style_created_text_applied: "{created} {label} created and {reused} reused, {applied} text layer(s) updated.",
    backend_style_created_layers_applied: "{created} {label} created and {reused} reused, {applied} layer(s) updated.",
    backend_no_style_candidates: "No {label} found in the current selection.",

    // Style labels (used inside backend messages)
    label_text_styles: "text styles",
    label_color_styles: "color styles",
    label_effect_styles: "effect styles",
    label_typography_styles: "typography styles",
  },

  "pt-BR": {
    btn_maximize: "Maximizar",
    btn_restore: "Restaurar",

    step_configure: "Configurar",
    step_review: "Revisar",
    step_create: "Criar",
    step1_aria: "Etapa 1: Configurar",
    step2_aria: "Etapa 2: Revisar",
    step3_aria: "Etapa 3: Criar",

    field_collection: "Coleção",
    field_mode: "Modo",
    placeholder_collection: "Nome da coleção",
    placeholder_mode: "Nome do modo",
    option_new_collection: "Criar nova coleção...",
    option_new_mode: "Criar novo modo...",

    toggle_repeated_only: "Mostrar apenas tokens repetidos",
    toggle_auto_scan: "Atualizar ao mudar seleção",

    status_ready: "Pronto",
    status_nothing_selected: "Nada selecionado.",
    status_something_wrong: "Algo deu errado.",

    scan_cta_desc: "Selecione Grupos, Frames ou Seções no Figma e escaneie para extrair tokens.",
    btn_scan: "Escanear seleção",
    btn_scan_loading: "Escaneando...",

    tab_variables: "Variáveis",
    tab_text_styles: "Estilos de texto",
    tab_color_styles: "Estilos de cor",
    tab_effect_styles: "Estilos de efeito",

    step3_desc: "Escolha o que criar a partir dos tokens escaneados:",
    btn_export: "Exportar JSON",
    btn_create: "Criar",
    btn_create_loading: "Criando...",
    btn_create_apply: "Criar e aplicar",
    btn_create_apply_loading: "Criando...",
    btn_back: "← Voltar",
    btn_next: "Próximo →",

    empty_tokens: "Nenhum token encontrado. Selecione Grupos, Frames ou Seções e escaneie.",
    empty_color_styles_pending: "Nenhum estilo de cor detectado ainda.",
    empty_effect_styles_pending: "Nenhum estilo de efeito detectado ainda.",
    empty_text_styles_pending: "Nenhum estilo de texto detectado ainda.",
    empty_color_styles: "Nenhum estilo de cor detectado.",
    empty_effect_styles: "Nenhum estilo de efeito detectado.",
    empty_text_styles: "Nenhum estilo de texto detectado.",
    empty_repeated: "Nenhum token repetido encontrado.",

    summary_no_repeated_all: "Sem tokens repetidos — exibindo todos.",
    summary_repeated_only: "Apenas tokens repetidos.",
    summary_all_tokens: "Todos os tokens.",
    summary_scanned: "{nodes} nó(s) · {tokens} token(s): {colors} cores, {texts} textos, {sizes} tamanhos. {mode}",
    summary_no_tokens: "{nodes} nó(s) escaneado(s) — nenhum token encontrado.",

    toast_no_export: "Nenhum item marcado para exportar.",
    toast_exported: "{count} item(s) exportado(s) para {filename}.",
    toast_select_output: "Selecione pelo menos um tipo de saída.",
    toast_no_repeated: "Nenhum token repetido. Exibindo todos.",
    toast_plugin_ready: "Plugin pronto.",

    group_colors: "Cores",
    group_texts: "Textos",
    group_sizes: "Tamanhos",

    about_btn: "Sobre",
    about_title: "Sobre este plugin",
    about_close: "Fechar",
    about_created_by: "Criado por",
    about_version: "Versão",
    about_built: "Última atualização",
    about_description: "Transforme seleções do canvas Figma em variáveis, estilos de texto, cor e efeito, e tokens JSON de design.",
    about_contact: "Contato",
    about_links: "Links",

    source_none: "Sem fontes",
    source_more: "+{count} mais",

    aria_name_token: "Nome do token",
    aria_name_text_style: "Nome do estilo de texto",
    aria_name_color_style: "Nome do estilo de cor",
    aria_name_effect_style: "Nome do estilo de efeito",

    backend_ready: "Plugin pronto.",
    backend_scanning: "Escaneando seleção atual...",
    backend_creating_variables: "Criando variáveis...",
    backend_creating_text_styles: "Criando estilos de texto...",
    backend_creating_color_styles: "Criando estilos de cor...",
    backend_creating_effect_styles: "Criando estilos de efeito...",
    backend_no_items: "Nenhum item selecionado para criar variáveis.",
    backend_no_checked: "Nenhum item marcado disponível para criar variáveis.",
    backend_select_node: "Selecione pelo menos um nó.",
    backend_select_frame: "Selecione pelo menos um Grupo, Frame ou Seção.",
    backend_ignored_layers: "Apenas Grupos, Frames e Seções são escaneados. Outras camadas foram ignoradas.",
    backend_select_layer: "Selecione pelo menos um frame, componente ou camada de texto.",
    backend_scan_complete: "Scan concluído. {items} candidatos a token, {colorStyles} estilos de cor, {effectStyles} estilos de efeito e {textStyles} candidatos a estilo de texto em {layers} camada(s).",
    backend_variables_created: "{created} variáveis criadas e {reused} reutilizadas em \"{collection}\".",
    backend_variables_bindings: " {bound} vínculo(s) aplicado(s).",
    backend_style_created: "{created} {label} criado(s) e {reused} reutilizado(s).",
    backend_style_created_text_applied: "{created} {label} criado(s) e {reused} reutilizado(s), {applied} camada(s) de texto atualizada(s).",
    backend_style_created_layers_applied: "{created} {label} criado(s) e {reused} reutilizado(s), {applied} camada(s) atualizada(s).",
    backend_no_style_candidates: "Nenhum(a) {label} encontrado(a) na seleção atual.",

    label_text_styles: "estilos de texto",
    label_color_styles: "estilos de cor",
    label_effect_styles: "estilos de efeito",
    label_typography_styles: "estilos tipográficos",
  },

  es: {
    btn_maximize: "Maximizar",
    btn_restore: "Restaurar",

    step_configure: "Configurar",
    step_review: "Revisar",
    step_create: "Crear",
    step1_aria: "Paso 1: Configurar",
    step2_aria: "Paso 2: Revisar",
    step3_aria: "Paso 3: Crear",

    field_collection: "Colección",
    field_mode: "Modo",
    placeholder_collection: "Nombre de la colección",
    placeholder_mode: "Nombre del modo",
    option_new_collection: "Crear nueva colección...",
    option_new_mode: "Crear nuevo modo...",

    toggle_repeated_only: "Mostrar solo tokens repetidos",
    toggle_auto_scan: "Actualizar al cambiar selección",

    status_ready: "Listo",
    status_nothing_selected: "Nada seleccionado.",
    status_something_wrong: "Algo salió mal.",

    scan_cta_desc: "Selecciona Grupos, Marcos o Secciones en Figma y escanea para extraer tokens.",
    btn_scan: "Escanear selección",
    btn_scan_loading: "Escaneando...",

    tab_variables: "Variables",
    tab_text_styles: "Estilos de texto",
    tab_color_styles: "Estilos de color",
    tab_effect_styles: "Estilos de efecto",

    step3_desc: "Elige qué crear a partir de los tokens escaneados:",
    btn_export: "Exportar JSON",
    btn_create: "Crear",
    btn_create_loading: "Creando...",
    btn_create_apply: "Crear y aplicar",
    btn_create_apply_loading: "Creando...",
    btn_back: "← Atrás",
    btn_next: "Siguiente →",

    empty_tokens: "No se encontraron tokens. Selecciona Grupos, Marcos o Secciones y escanea.",
    empty_color_styles_pending: "No se detectaron estilos de color aún.",
    empty_effect_styles_pending: "No se detectaron estilos de efecto aún.",
    empty_text_styles_pending: "No se detectaron estilos de texto aún.",
    empty_color_styles: "No se detectaron estilos de color.",
    empty_effect_styles: "No se detectaron estilos de efecto.",
    empty_text_styles: "No se detectaron estilos de texto.",
    empty_repeated: "No se encontraron tokens repetidos.",

    summary_no_repeated_all: "Sin tokens repetidos — mostrando todos.",
    summary_repeated_only: "Solo tokens repetidos.",
    summary_all_tokens: "Todos los tokens.",
    summary_scanned: "{nodes} nodo(s) · {tokens} token(s): {colors} colores, {texts} textos, {sizes} tamaños. {mode}",
    summary_no_tokens: "{nodes} nodo(s) escaneado(s) — no se encontraron tokens.",

    toast_no_export: "No hay elementos marcados para exportar.",
    toast_exported: "{count} elemento(s) exportado(s) a {filename}.",
    toast_select_output: "Selecciona al menos un tipo de salida.",
    toast_no_repeated: "No se encontraron tokens repetidos. Mostrando todos.",
    toast_plugin_ready: "Plugin listo.",

    group_colors: "Colores",
    group_texts: "Textos",
    group_sizes: "Tamaños",

    about_btn: "Acerca de",
    about_title: "Acerca de este plugin",
    about_close: "Cerrar",
    about_created_by: "Creado por",
    about_version: "Versión",
    about_built: "Última actualización",
    about_description: "Transforma selecciones del canvas de Figma en variables, estilos de texto, color y efecto, y tokens JSON de diseño.",
    about_contact: "Contacto",
    about_links: "Enlaces",

    source_none: "Sin fuentes",
    source_more: "+{count} más",

    aria_name_token: "Nombre del token",
    aria_name_text_style: "Nombre del estilo de texto",
    aria_name_color_style: "Nombre del estilo de color",
    aria_name_effect_style: "Nombre del estilo de efecto",

    backend_ready: "Plugin listo.",
    backend_scanning: "Escaneando selección actual...",
    backend_creating_variables: "Creando variables...",
    backend_creating_text_styles: "Creando estilos de texto...",
    backend_creating_color_styles: "Creando estilos de color...",
    backend_creating_effect_styles: "Creando estilos de efecto...",
    backend_no_items: "No hay elementos seleccionados para crear variables.",
    backend_no_checked: "No hay elementos marcados disponibles para crear variables.",
    backend_select_node: "Selecciona al menos un nodo.",
    backend_select_frame: "Selecciona al menos un Grupo, Marco o Sección.",
    backend_ignored_layers: "Solo se escanean Grupos, Marcos y Secciones. Otras capas fueron ignoradas.",
    backend_select_layer: "Selecciona al menos un marco, componente o capa de texto.",
    backend_scan_complete: "Escaneo completo. {items} candidatos a token, {colorStyles} estilos de color, {effectStyles} estilos de efecto y {textStyles} candidatos a estilo de texto en {layers} capa(s).",
    backend_variables_created: "{created} variables creadas y {reused} reutilizadas en \"{collection}\".",
    backend_variables_bindings: " {bound} vínculo(s) aplicado(s).",
    backend_style_created: "{created} {label} creado(s) y {reused} reutilizado(s).",
    backend_style_created_text_applied: "{created} {label} creado(s) y {reused} reutilizado(s), {applied} capa(s) de texto actualizada(s).",
    backend_style_created_layers_applied: "{created} {label} creado(s) y {reused} reutilizado(s), {applied} capa(s) actualizada(s).",
    backend_no_style_candidates: "No se encontró {label} en la selección actual.",

    label_text_styles: "estilos de texto",
    label_color_styles: "estilos de color",
    label_effect_styles: "estilos de efecto",
    label_typography_styles: "estilos tipográficos",
  },
};

export function t(
  key: string,
  locale: Locale,
  vars?: Record<string, string | number>
): string {
  let str = messages[locale]?.[key] ?? messages["en"][key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replaceAll(`{${k}}`, String(v));
    }
  }
  return str;
}
