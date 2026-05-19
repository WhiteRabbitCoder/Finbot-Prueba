export type Lang = 'es' | 'en'

export const translations = {
  es: {
    // Navigation & header
    faq_button_tooltip: 'Preguntas frecuentes',
    online_status: 'En linea',
    simulated_badge: 'Simulado',
    backend_banner: 'Backend no disponible - las respuestas son simuladas',

    // Chat empty state
    greeting_morning: 'Buenos dias',
    greeting_afternoon: 'Buenas tardes',
    greeting_night: 'Buenas noches',
    empty_sub: 'En que puedo ayudarte hoy?',
    input_placeholder: 'Escribe tu mensaje...',

    // Input/output mode toggles
    entrada: 'Entrada:',
    salida: 'Salida:',
    texto: 'Texto',
    voz: 'Voz',
    imagen: 'Imagen',
    audio: 'Audio',

    // Sidebar tabs
    sistema: 'Sistema',
    mercados: 'Mercados',
    noticias: 'Noticias',

    // Sidebar - Sistema
    ultima_actividad: 'Ultima actividad',
    chunks_indexed: 'chunks indexados',
    no_chunks: 'Sin chunks indexados',
    entries: 'entradas',
    in_memory: 'memoria',
    active_tools: 'herramientas activas',
    llm_model: 'Modelo LLM',

    // Sidebar - Mercados
    tasas_cambio: 'TASAS DE CAMBIO',
    actualizado: 'Actualizado:',
    fuente: 'Fuente: open.er-api.com',
    hace_min: 'Hace {x} min',

    // Sidebar - Noticias
    economia_vivo: 'Economia en vivo',
    ver_mas: 'Ver mas noticias',
    analyze_news: 'Analiza esta noticia y dime que impacto puede tener en mis finanzas personales:',

    // FAQ view
    faq_title: 'Preguntas frecuentes',
    faq_sub: 'Todo lo que necesitas saber sobre FinBot y tus finanzas.',
    faq_cta: 'No encontraste tu respuesta?',
    faq_cta_btn: 'Preguntale a FinBot',
    faq_prefill: 'Tengo una pregunta: ',
    faq_back: 'Volver al chat',

    // Admin view
    admin_title: 'Panel administrativo',
    admin_back: 'Volver al chat',
    system_prompt_label: 'System Prompt',
    save_prompt_btn: 'Guardar system prompt',
    tools_label: 'Herramientas activas',
    stats_label: 'Estadisticas de uso',
    top_tools_label: 'Herramientas mas llamadas',
    top_queries_label: 'Consultas frecuentes',
    tool_calls: 'Llamadas a tools',
    cache_hits: 'Cache hit rate',
    total_messages: 'Consultas totales',
    last_24h: 'acumulado',
    hit_rate: 'tasa de acierto',
    current_session: 'registradas',
    searches: 'veces',
    calls: 'llamadas',
    cache_section_label: 'Cache semantico',
    cache_clear_btn: 'Limpiar cache',
    rag_label: 'Fuentes RAG',
    rag_url_placeholder: 'https://...',
    rag_add_btn: 'Indexar',
    rag_reindex_btn: 'Re-indexar todo',

    // Settings drawer
    settings_title: 'Ajustes',
    profile: 'Perfil',
    hello: 'Hola,',
    appearance: 'Apariencia',
    theme: 'Tema',
    lang_label: 'Idioma de la interfaz',
    chat_preferences: 'Preferencias de chat',
    show_timestamps: 'Mostrar timestamps',
    auto_scroll: 'Auto-scroll al ultimo mensaje',
    show_status_panel: 'Mostrar panel de estado',
    auto_play_audio: 'Reproducir audio automaticamente',
    about: 'Sobre FinBot',
    logout_btn: 'Cerrar sesion',

    // Voice note
    voice_tap: 'Nota de voz',
    ver_transcripcion: 'Ver transcripcion',
    ocultar_transcripcion: 'Ocultar',

    // Tool step labels
    tool_searching_web: 'Buscando en la web...',
    tool_fetching_rate: 'Consultando tipo de cambio...',
    tool_processing: 'Procesando respuesta...',
    tool_fetching_news: 'Buscando noticias economicas...',
    tool_filtering: 'Filtrando por relevancia...',
    tool_generating_summary: 'Generando resumen...',
    tool_processing_image: 'Procesando imagen...',
    tool_analyze_receipt: 'Ejecutando analyze_receipt...',
    tool_thinking: 'Pensando...',
  },
  en: {
    // Navigation & header
    faq_button_tooltip: 'FAQ',
    online_status: 'Online',
    simulated_badge: 'Simulated',
    backend_banner: 'Backend unavailable - responses are simulated',

    // Chat empty state
    greeting_morning: 'Good morning',
    greeting_afternoon: 'Good afternoon',
    greeting_night: 'Good evening',
    empty_sub: 'How can I help you today?',
    input_placeholder: 'Type your message...',

    // Input/output mode toggles
    entrada: 'Input:',
    salida: 'Output:',
    texto: 'Text',
    voz: 'Voice',
    imagen: 'Image',
    audio: 'Audio',

    // Sidebar tabs
    sistema: 'System',
    mercados: 'Markets',
    noticias: 'News',

    // Sidebar - Sistema
    ultima_actividad: 'Recent activity',
    chunks_indexed: 'chunks indexed',
    no_chunks: 'No chunks indexed',
    entries: 'entries',
    in_memory: 'memory',
    active_tools: 'active tools',
    llm_model: 'LLM Model',

    // Sidebar - Mercados
    tasas_cambio: 'EXCHANGE RATES',
    actualizado: 'Updated:',
    fuente: 'Source: open.er-api.com',
    hace_min: '{x} min ago',

    // Sidebar - Noticias
    economia_vivo: 'Live Economy',
    ver_mas: 'Load more',
    analyze_news: 'Analyze this news and tell me the potential impact on my personal finances:',

    // FAQ view
    faq_title: 'Frequently asked questions',
    faq_sub: 'Everything you need to know about FinBot.',
    faq_cta: 'Didn\'t find your answer?',
    faq_cta_btn: 'Ask FinBot',
    faq_prefill: 'I have a question: ',
    faq_back: 'Back to chat',

    // Admin view
    admin_title: 'Admin panel',
    admin_back: 'Back to chat',
    system_prompt_label: 'System Prompt',
    save_prompt_btn: 'Save system prompt',
    tools_label: 'Active tools',
    stats_label: 'Usage statistics',
    top_tools_label: 'Top tool calls',
    top_queries_label: 'Top queries',
    tool_calls: 'Tool calls',
    cache_hits: 'Cache hit rate',
    total_messages: 'Total queries',
    last_24h: 'total',
    hit_rate: 'hit rate',
    current_session: 'recorded',
    searches: 'times',
    calls: 'calls',
    cache_section_label: 'Semantic cache',
    cache_clear_btn: 'Clear cache',
    rag_label: 'RAG Sources',
    rag_url_placeholder: 'https://...',
    rag_add_btn: 'Index',
    rag_reindex_btn: 'Re-index all',

    // Settings drawer
    settings_title: 'Settings',
    profile: 'Profile',
    hello: 'Hello,',
    appearance: 'Appearance',
    theme: 'Theme',
    lang_label: 'Interface language',
    chat_preferences: 'Chat preferences',
    show_timestamps: 'Show timestamps',
    auto_scroll: 'Auto-scroll to last message',
    show_status_panel: 'Show status panel',
    auto_play_audio: 'Auto-play audio',
    about: 'About FinBot',
    logout_btn: 'Sign out',

    // Voice note
    voice_tap: 'Voice note',
    ver_transcripcion: 'Show transcript',
    ocultar_transcripcion: 'Hide',

    // Tool step labels
    tool_searching_web: 'Searching the web...',
    tool_fetching_rate: 'Fetching exchange rate...',
    tool_processing: 'Processing response...',
    tool_fetching_news: 'Fetching economic news...',
    tool_filtering: 'Filtering by relevance...',
    tool_generating_summary: 'Generating summary...',
    tool_processing_image: 'Processing image...',
    tool_analyze_receipt: 'Running analyze_receipt...',
    tool_thinking: 'Thinking...',
  },
}

export const newsES = [
  { id: '1', source: 'Bancolombia', headline: 'Dolar alcanza $4.100 COP en medio de tensiones globales', snippet: 'El peso colombiano se debilita frente al dolar...', timeAgo: 'Hace 5 min' },
  { id: '2', source: 'Portafolio', headline: 'Banco de la Republica mantiene tasa en 9.75%', snippet: 'La junta directiva decidio mantener la tasa...', timeAgo: 'Hace 18 min' },
  { id: '3', source: 'Reuters', headline: 'Fed senala posible recorte de tasas en segundo semestre', snippet: 'Jerome Powell indica que la inflacion...', timeAgo: 'Hace 31 min' },
  { id: '4', source: 'Bloomberg', headline: 'Petroleo Brent sube 1.4% tras recorte de inventarios', snippet: 'Los precios del crudo repuntan...', timeAgo: 'Hace 47 min' },
  { id: '5', source: 'El Tiempo', headline: 'Inflacion en Colombia baja a 5.8% en abril', snippet: 'Es el nivel mas bajo en dos anos...', timeAgo: 'Hace 1h' },
  { id: '6', source: 'Reuters', headline: 'Bitcoin supera los $105.000 en mercados asiaticos', snippet: 'La criptomoneda alcanza nuevo maximo...', timeAgo: 'Hace 1h 20min' },
  { id: '7', source: 'Portafolio', headline: 'Acciones de Ecopetrol caen 2.1% tras informe', snippet: 'El reporte de produccion decepciono...', timeAgo: 'Hace 2h' },
  { id: '8', source: 'Bloomberg', headline: 'Wall Street cierra en verde; S&P 500 sube 0.6%', snippet: 'Los mercados reaccionan positivamente...', timeAgo: 'Hace 3h' },
]

export const newsEN = [
  { id: '1', source: 'Bancolombia', headline: 'Dollar hits 4,100 COP amid global tensions', snippet: 'The Colombian peso weakens against the dollar...', timeAgo: '5 min ago' },
  { id: '2', source: 'Portafolio', headline: 'Colombia\'s central bank holds rate at 9.75%', snippet: 'The board decided to maintain the rate...', timeAgo: '18 min ago' },
  { id: '3', source: 'Reuters', headline: 'Fed signals potential rate cut in second half of 2026', snippet: 'Jerome Powell indicates inflation...', timeAgo: '31 min ago' },
  { id: '4', source: 'Bloomberg', headline: 'Brent crude rises 1.4% on OPEC inventory cut', snippet: 'Crude prices rebound...', timeAgo: '47 min ago' },
  { id: '5', source: 'El Tiempo', headline: 'Colombia inflation drops to 5.8% in April, 2yr low', snippet: 'This is the lowest level in two years...', timeAgo: '1h ago' },
  { id: '6', source: 'Reuters', headline: 'Bitcoin surpasses $105,000 in Asian markets', snippet: 'The cryptocurrency reaches new high...', timeAgo: '1h 20min ago' },
  { id: '7', source: 'Portafolio', headline: 'Ecopetrol shares fall 2.1% after production report', snippet: 'Production report disappointed...', timeAgo: '2h ago' },
  { id: '8', source: 'Bloomberg', headline: 'Wall Street closes green; S&P 500 gains 0.6%', snippet: 'Markets react positively...', timeAgo: '3h ago' },
]

export function getTranslation(lang: Lang) {
  return translations[lang]
}
