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
    step_design_guide: "Design Guide",
    step1_aria: "Step 1: Configure",
    step2_aria: "Step 2: Review",
    step3_aria: "Step 3: Create",
    step4_aria: "Optional step: Design Guide",
    step4_desc: "Generate design system documentation frames directly in your Figma canvas.",
    btn_generate: "Generate Design Guide",

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
    tab_colors: "Palette",
    tab_typography: "Typography",
    tab_sizes: "Scale",
    tab_effects: "Effects",
    tab_design_guide: "Design Guide",

    // Step 3 action targets
    create_variables: "Variables",
    create_text_styles: "Text styles",
    create_color_styles: "Color styles",
    create_effect_styles: "Effect styles",

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
    empty_colors: "No color tokens or styles detected.",
    empty_typography: "No typography tokens or styles detected.",
    empty_sizes: "No size tokens detected.",
    empty_effects: "No effect styles detected.",
    empty_design_guide: "Scan a selection first to generate the design guide.",
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

    // Group headers (variable types)
    group_colors: "Palette",
    group_texts: "Content",
    group_sizes: "Scale",

    // Style type badges
    badge_text_style: "Text style",
    badge_color_style: "Color style",
    badge_effect_style: "Effect style",

    // Diagnostics
    diag_text_nodes: "text nodes",
    diag_segments: "segments",
    diag_candidates: "candidates",

    // Checkbox
    checkbox_include: "Include token",

    // What's new
    whats_new_title: "What's new in v{version}",
    whats_new_design_guide: "Step 4 ✦ Design Guide: generates Colors, Typography, Spacing & Effects frames directly on the canvas",
    whats_new_tabs: "Review tabs reorganised: Palette, Typography, Scale, Effects — each type in its own tab",
    whats_new_4_groups: "Variables now use 4 flat groups: palette / scale / content / states — no sub-groups, locale-aware names",
    whats_new_no_duplicates: "Duplicate variables prevented: re-scanning reuses existing variables instead of creating suffixed copies",
    whats_new_checkboxes: "Checkboxes on every style card — deselect any style to exclude it from creation",
    whats_new_ds_frames: "Design Guide frames: full-width tables with grow columns, wrapping swatch grids, compact spacing chips",
    whats_new_i18n: "Interface in English, Portuguese (BR), and Spanish — date formatted per locale",
    whats_new_a11y: "Full keyboard navigation, ARIA roles, roving tabindex on tabs, step 4 with optional palette icon",

    // How to use
    how_to_use_title: "How to use",
    how_step_1: "Select one or more Frames, Groups, or Sections in the Figma canvas.",
    how_step_2: "Click \"Scan selection\" — the plugin extracts colors, typography, spacing, and effects.",
    how_step_3: "Review tokens in the Palette, Typography, Scale, and Effects tabs. Rename or uncheck items as needed.",
    how_step_4: "Go to step 3 (Create), choose what to generate: Variables, Color styles, Text styles, or Effect styles. Export JSON tokens anytime.",
    how_step_5: "Optional — open step 4 (🎨 Design Guide) and click Generate to create a visual documentation frame on the canvas.",

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
    backend_generating_design_system: "Generating design system frames...",
    backend_design_system_generated: "Design system frames generated successfully.",

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
    step_design_guide: "Guia de Design",
    step1_aria: "Etapa 1: Configurar",
    step2_aria: "Etapa 2: Revisar",
    step3_aria: "Etapa 3: Criar",
    step4_aria: "Etapa opcional: Guia de Design",
    step4_desc: "Gere frames de documentação do design system diretamente no canvas do Figma.",
    btn_generate: "Gerar Guia de Design",

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

    tab_colors: "Paleta",
    tab_typography: "Tipografia",
    tab_sizes: "Escala",
    tab_effects: "Efeitos",
    tab_design_guide: "Guia de Design",

    create_variables: "Variáveis",
    create_text_styles: "Estilos de texto",
    create_color_styles: "Estilos de cor",
    create_effect_styles: "Estilos de efeito",

    step3_desc: "Escolha o que criar a partir dos tokens escaneados:",
    btn_export: "Exportar JSON",
    btn_create: "Criar",
    btn_create_loading: "Criando...",
    btn_create_apply: "Criar e aplicar",
    btn_create_apply_loading: "Criando...",
    btn_back: "← Voltar",
    btn_next: "Próximo →",

    empty_tokens: "Nenhum token encontrado. Selecione Grupos, Frames ou Seções e escaneie.",
    empty_colors: "Nenhum token ou estilo de cor detectado.",
    empty_typography: "Nenhum token ou estilo tipográfico detectado.",
    empty_sizes: "Nenhum token de tamanho detectado.",
    empty_effects: "Nenhum estilo de efeito detectado.",
    empty_design_guide: "Escaneie uma seleção para gerar o guia de design.",
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

    group_colors: "Paleta",
    group_texts: "Conteúdo",
    group_sizes: "Escala",

    badge_text_style: "Estilo de texto",
    badge_color_style: "Estilo de cor",
    badge_effect_style: "Estilo de efeito",

    diag_text_nodes: "nós de texto",
    diag_segments: "segmentos",
    diag_candidates: "candidatos",

    checkbox_include: "Incluir token",

    whats_new_title: "Novidades na v{version}",
    whats_new_design_guide: "Etapa 4 ✦ Guia de Design: gera frames de Cores, Tipografia, Espaçamento e Efeitos diretamente no canvas",
    whats_new_tabs: "Abas de revisão reorganizadas: Paleta, Tipografia, Escala, Efeitos — cada tipo em sua própria aba",
    whats_new_4_groups: "Variáveis com 4 grupos planos: cores / escala / conteudo / estados — sem sub-grupos, nomes por idioma",
    whats_new_no_duplicates: "Variáveis duplicadas evitadas: novo scan reutiliza variáveis existentes em vez de criar cópias com sufixo",
    whats_new_checkboxes: "Checkboxes em todos os cards de estilo — desmarque para excluir da criação",
    whats_new_ds_frames: "Frames do Guia: tabelas full-width com colunas flexíveis, grade de swatches com wrap, chips compactos de espaçamento",
    whats_new_i18n: "Interface em inglês, português (BR) e espanhol — data formatada por idioma",
    whats_new_a11y: "Navegação completa por teclado, roles ARIA, roving tabindex nas abas, etapa 4 com ícone de paleta opcional",

    how_to_use_title: "Como usar",
    how_step_1: "Selecione um ou mais Frames, Grupos ou Seções no canvas do Figma.",
    how_step_2: "Clique em \"Escanear seleção\" — o plugin extrai cores, tipografia, espaçamento e efeitos.",
    how_step_3: "Revise os tokens nas abas Paleta, Tipografia, Escala e Efeitos. Renomeie ou desmarque itens conforme necessário.",
    how_step_4: "Vá para a etapa 3 (Criar), escolha o que gerar: Variáveis, Estilos de cor, Texto ou Efeito. Exporte tokens JSON a qualquer momento.",
    how_step_5: "Opcional — abra a etapa 4 (🎨 Guia de Design) e clique em Gerar para criar um frame de documentação visual no canvas.",

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
    backend_generating_design_system: "Gerando frames do design system...",
    backend_design_system_generated: "Frames do design system gerados com sucesso.",

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
    step_design_guide: "Guía de Diseño",
    step1_aria: "Paso 1: Configurar",
    step2_aria: "Paso 2: Revisar",
    step3_aria: "Paso 3: Crear",
    step4_aria: "Paso opcional: Guía de Diseño",
    step4_desc: "Genera frames de documentación del sistema de diseño directamente en tu canvas de Figma.",
    btn_generate: "Generar Guía de Diseño",

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

    tab_colors: "Paleta",
    tab_typography: "Tipografía",
    tab_sizes: "Escala",
    tab_effects: "Efectos",
    tab_design_guide: "Guía de Diseño",

    create_variables: "Variables",
    create_text_styles: "Estilos de texto",
    create_color_styles: "Estilos de color",
    create_effect_styles: "Estilos de efecto",

    step3_desc: "Elige qué crear a partir de los tokens escaneados:",
    btn_export: "Exportar JSON",
    btn_create: "Crear",
    btn_create_loading: "Creando...",
    btn_create_apply: "Crear y aplicar",
    btn_create_apply_loading: "Creando...",
    btn_back: "← Atrás",
    btn_next: "Siguiente →",

    empty_tokens: "No se encontraron tokens. Selecciona Grupos, Marcos o Secciones y escanea.",
    empty_colors: "No se detectaron tokens ni estilos de color.",
    empty_typography: "No se detectaron tokens ni estilos tipográficos.",
    empty_sizes: "No se detectaron tokens de tamaño.",
    empty_effects: "No se detectaron estilos de efecto.",
    empty_design_guide: "Escanea una selección para generar la guía de diseño.",
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

    group_colors: "Paleta",
    group_texts: "Contenido",
    group_sizes: "Escala",

    badge_text_style: "Estilo de texto",
    badge_color_style: "Estilo de color",
    badge_effect_style: "Estilo de efecto",

    diag_text_nodes: "nodos de texto",
    diag_segments: "segmentos",
    diag_candidates: "candidatos",

    checkbox_include: "Incluir token",

    whats_new_title: "Novedades en v{version}",
    whats_new_design_guide: "Paso 4 ✦ Guía de Diseño: genera frames de Colores, Tipografía, Espaciado y Efectos directamente en el canvas",
    whats_new_tabs: "Pestañas de revisión reorganizadas: Paleta, Tipografía, Escala, Efectos — cada tipo en su propia pestaña",
    whats_new_4_groups: "Variables con 4 grupos planos: paleta / escala / contenido / estados — sin sub-grupos, nombres por idioma",
    whats_new_no_duplicates: "Variables duplicadas evitadas: nuevo escaneo reutiliza variables existentes en lugar de crear copias con sufijo",
    whats_new_checkboxes: "Checkboxes en todas las tarjetas de estilo — desmarca para excluir de la creación",
    whats_new_ds_frames: "Frames de la Guía: tablas full-width con columnas flexibles, cuadrícula de swatches con wrap, chips compactos de espaciado",
    whats_new_i18n: "Interfaz en inglés, portugués (BR) y español — fecha formateada por idioma",
    whats_new_a11y: "Navegación completa por teclado, roles ARIA, roving tabindex en pestañas, paso 4 con ícono de paleta opcional",

    how_to_use_title: "Cómo usar",
    how_step_1: "Selecciona uno o más Frames, Grupos o Secciones en el canvas de Figma.",
    how_step_2: "Haz clic en \"Escanear selección\" — el plugin extrae colores, tipografía, espaciado y efectos.",
    how_step_3: "Revisa los tokens en las pestañas Paleta, Tipografía, Escala y Efectos. Renombra o desmarca elementos según sea necesario.",
    how_step_4: "Ve al paso 3 (Crear), elige qué generar: Variables, Estilos de color, Texto o Efecto. Exporta tokens JSON en cualquier momento.",
    how_step_5: "Opcional — abre el paso 4 (🎨 Guía de Diseño) y haz clic en Generar para crear un frame de documentación visual en el canvas.",

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
    backend_generating_design_system: "Generando frames del sistema de diseño...",
    backend_design_system_generated: "Frames del sistema de diseño generados correctamente.",

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
