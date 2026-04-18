Aquí tienes la arquitectura de pantallas del sistema. Ahora te entrego el prompt completo y ultra-detallado para Figma:

🏐 PROMPT FIGMA — SPIKE TOURNAMENT SYSTEM
CONTEXTO DEL PROYECTO
Diseña un sistema completo de gestión de torneos deportivos llamado "Spike" para un club de voleibol. La app reemplaza y supera en todos los aspectos a herramientas como Tournify. Debe ser una PWA (Progressive Web App) con experiencia nativa, soporte offline, instalable desde el navegador, y diseñada con los más altos estándares de usabilidad moderna.

IDENTIDAD VISUAL Y BRANDING
Paleta de colores primaria:

Rojo principal: #E31E24 (acción, CTA, live, alertas)
Azul profundo: #003087 (confianza, navegación, estructura)
Blanco: #FFFFFF (superficies, cards, fondos)
Neutro oscuro: #0F0F14 (backgrounds en dark mode, texto principal)
Neutro medio: #6B7280 (texto secundario, iconos inactivos)
Gris claro: #F4F5F7 (fondos de cards en light mode)

Paleta de acentos (no usar de manera masiva, solo para jerarquía):

Verde éxito: #00C853 (victoria, set ganado)
Amarillo/Ámbar: #FFB300 (empate, advertencia)
Rojo oscuro hover: #B71C1C
Azul claro acento: #1565C0

Tipografía:

Headlines / Scores: Barlow Condensed — Bold 700, pesado, deportivo, números grandes
UI principal: Inter — Regular 400 y Medium 500
Números de marcador: Barlow Condensed 700, size 48–72px mínimo
Escala tipográfica: 12 / 14 / 16 / 20 / 24 / 32 / 48 / 64px

Iconografía: Phosphor Icons (consistente, limpio, moderno). Estilo "regular" en navegación, "fill" para estados activos.
Motivos visuales:

Textura sutil de red de voleibol como pattern decorativo (muy baja opacidad, 3-5%)
Líneas diagonales tipo campo deportivo en headers de sección
Gradientes direccionales sutiles: rojo → azul oscuro en banners de torneo


FILOSOFÍA DE DISEÑO
Referencias principales:

UEFA Champions League app — jerarquía de información, live scores
ESPN app — densidad de info sin ruido visual
NBA app — bracket interactivo, stats animadas
FlightRadar / Notion — claridad de datos en tiempo real
Apple Sports — limpieza extrema, whitespace generoso
FC Barcelona digital — uso de colores de club con elegancia

Principios irrenunciables:

Mobile-first siempre — el 85% del uso será desde teléfono en la cancha
Thumb-friendly — todos los elementos interactivos mínimo 44×44px de área táctil
Información escaneable — el usuario identifica el próximo partido en 2 segundos
Live-first — los partidos en vivo tienen jerarquía visual absoluta sobre todo lo demás
Modo offline — con Service Worker, todas las vistas críticas deben cargar sin conexión


DESIGN TOKENS (Variables en Figma)
// Colors
color/brand/red         #E31E24
color/brand/blue        #003087
color/brand/white       #FFFFFF
color/brand/red-dark    #B71C1C
color/brand/blue-light  #1565C0

// Surfaces
color/surface/primary   #FFFFFF / #0F0F14
color/surface/secondary #F4F5F7 / #1A1A24
color/surface/card      #FFFFFF / #16161E
color/surface/overlay   rgba(0,0,0,0.6)

// Text
color/text/primary      #0F0F14 / #F9F9FB
color/text/secondary    #6B7280 / #9CA3AF
color/text/disabled     #D1D5DB / #374151
color/text/inverse      #FFFFFF / #0F0F14

// Feedback
color/feedback/win      #00C853
color/feedback/loss     #E31E24
color/feedback/draw     #FFB300
color/feedback/live     #E31E24  (con animación pulse)

// Spacing (8pt grid)
spacing/1  4px
spacing/2  8px
spacing/3  12px
spacing/4  16px
spacing/5  20px
spacing/6  24px
spacing/8  32px
spacing/10 40px
spacing/12 48px
spacing/16 64px

// Border radius
radius/sm   4px
radius/md   8px
radius/lg   12px
radius/xl   16px
radius/2xl  24px
radius/pill 9999px

// Shadows
shadow/card     0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)
shadow/elevated 0 4px 16px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.08)
shadow/modal    0 20px 60px rgba(0,0,0,0.24)

SISTEMA DE COMPONENTES
1. MATCH CARD (componente estrella)
El componente más importante de toda la app. Debe existir en 4 variantes:
Variante: Upcoming (próximo partido)

Fondo: color/surface/card
Estructura: [Fecha + hora badge] / [Equipo A logo + nombre] vs [Equipo B logo + nombre] / [Cancha + árbitro]
Badge "Próximo": azul con texto blanco, pill shape
Hora: Barlow Condensed Bold 20px, rojo si es en las próximas 2 horas
Nombres de equipos: Inter Medium 16px
Logos: 40×40px, circular, con fallback de iniciales

Variante: Live (en vivo)

Borde izquierdo: 3px sólido rojo #E31E24
Badge "EN VIVO" con dot animado (pulse animation en CSS)
Marcador: Barlow Condensed Bold 48px, centrado, con fondo degradado muy sutil
Set actual: visible con puntuación set a set (25-23 · 22-18 actual)
Fondo ligeramente diferenciado del resto de cards
Sombra elevada shadow/elevated

Variante: Completed (finalizado)

Score final prominente: ganador en bold/azul, perdedor en regular/gris
Badge "FIN" gris neutro
Duración del partido si está disponible
Expandible para ver set a set

Variante: Compact (para lista densa)

Una sola línea: [hora] [Equipo A] [score] [Equipo B] [cancha]
Altura máxima 52px
Para vistas de tabla/agenda


2. STANDINGS TABLE (tabla de posiciones)

Sticky header con nombre de grupo/fase
Columnas: Pos · Equipo · PJ · PG · PP · Sets F/C · Pts
Row ganador calificado: background muy sutil verde
Row propio equipo (si hay login): highlight azul muy suave
Números: Barlow Condensed Medium
Responsive: en mobile, colapsar columnas menos importantes con toggle


3. BRACKET VISUAL (eliminatorias)

Líneas de conexión SVG fluidas (no quebradas)
Cards de equipo: 120×56px mínimo, con logo + nombre
Avance automático resaltado con línea azul
Match en vivo: border rojo animado en las dos cards del partido
Scroll horizontal en mobile con snap points
Zoom pinch-to-zoom en desktop y tablet


4. BOTTOM NAVIGATION (mobile)
5 tabs: 🏠 Home · 📅 Partidos · 🏆 Tabla · ⚔️ Bracket · 👤 Perfil

Active state: ícono fill + color rojo + label visible
Inactive: ícono regular + gris + sin label
Badge numérico para notificaciones (máximo "9+")
Safe area inset para iPhone (padding bottom variable)
Fondo blur (backdrop-filter: blur(16px)) sobre contenido


5. TOURNAMENT HERO HEADER

Imagen de fondo: foto del club o cancha (con overlay oscuro gradiente)
Logo del torneo: centrado, 80px
Nombre del torneo: Barlow Condensed Bold, 32px, blanco
Dates badge + Teams count badge + Status badge
Tabs de sección pegados al fondo del header


6. SCORE INPUT (árbitros/admin)

Teclado numérico grande optimizado para ingreso rápido en cancha
Botones +/- para cada set de cada equipo
Preview del marcador en tiempo real mientras se ingresa
Confirmación con swipe o botón grande verde
Modo landscape obligatorio para esta pantalla


7. NOTIFICATION TOAST

Position: top-center en mobile, top-right en desktop
Variantes: Gol (verde), Cambio (azul), Error (rojo), Info (neutro)
Auto-dismiss 4 segundos con barra de progreso
Swipe-to-dismiss en mobile


PANTALLAS A DISEÑAR
FLUJO 1 — ESPECTADOR / PARTICIPANTE
1.1 Splash Screen

Fondo degradado: azul #003087 → negro #0F0F14
Logo "Spike" centrado, animación de entrada fade + scale
Slogan debajo en blanco
Duración: 2-3 segundos antes de transición

1.2 Onboarding (3 slides)

Slide 1: "Todos tus torneos en un lugar" — ilustración de schedule
Slide 2: "Sigue el marcador en vivo" — ilustración live score
Slide 3: "Recibe alertas de tus partidos" — ilustración notificaciones
Indicadores de progreso: pills en rojo
Botón "Comenzar" en el último slide, CTA rojo full-width

1.3 Home

Header: Logo Spike + nombre del club + avatar usuario
Section "EN VIVO AHORA" — scroll horizontal de live match cards si existen (borde pulsante rojo)
Section "HOY" — lista de partidos del día con time separators
Section "MIS TORNEOS" — chips/pills de torneos favoritos
Section "PRÓXIMOS TORNEOS" — cards de torneos con fechas
FAB (Floating Action Button): azul, "+", para admin crear torneo (solo si tiene rol admin)

1.4 Tournament Detail

Hero header con nombre del torneo, fechas, deporte
Tab bar: Partidos | Tabla | Bracket | Equipos | Info
Contador regresivo si el torneo no ha comenzado
Botón "Seguir" que activa notificaciones push para ese torneo

1.5 Schedule / Partidos

Selector de fecha: scroll horizontal de chips de días, activo en azul
Filtro por cancha y/o grupo (dropdown)
Lista de match cards agrupadas por hora
Sticky header con fecha actual
Pull-to-refresh con animación de pelota de voleibol

1.6 Standings / Tabla

Selector de grupo/fase (si hay múltiples)
Tabla con 6-8 columnas
Rows expandibles para ver partidos del equipo
Leyenda: clasificados, eliminados, en zona de playoffs

1.7 Bracket

Vista horizontal scrolleable por fases
Cuartos → Semis → Final → Campeón
Campeón con corona/trofeo animado
Tapping en un match: modal con detalle del partido

1.8 Team Profile

Header: logo + nombre + colores del equipo
Roster: grid de jugadores con foto, número, posición
Stats: PG/PP, sets a favor/contra, racha actual
Partidos recientes del equipo (últimos 5)

1.9 Match Detail

Score prominente con set a set
Timeline del partido (si hay datos)
Árbitro, cancha, fase, hora de inicio/fin
Botón "Compartir resultado" para redes sociales
Deep link compartible (spike.club/partido/ID)


FLUJO 2 — ADMIN / ORGANIZADOR
2.1 Admin Dashboard

Overview stats: torneos activos, partidos hoy, equipos registrados
Quick actions: Crear torneo · Ingresar resultado · Ver alerts
Actividad reciente: log de acciones

2.2 Crear Torneo — Wizard (4 pasos)

Paso 1 Información básica: nombre, deporte, club, fechas, descripción, imagen de portada
Paso 2 Formato: tipo (grupos+eliminatoria / solo grupos / solo eliminatoria / liga), número de equipos, canchas disponibles, árbitros
Paso 3 Equipos: agregar equipos manualmente o por código de invitación, gestionar roster
Paso 4 Review + Publicar: preview de todo el torneo, toggle "publicar ahora" o "guardar borrador"
Progress bar en top con nombres de pasos
Navegación atrás/adelante entre pasos
Guardado automático en draft

2.3 Schedule Builder

Vista tipo calendario/grid: ejes X = horas, Y = canchas
Drag & drop de partidos entre slots
Auto-generar horario: botón que genera el schedule optimizado
Conflictos visualizados en rojo (mismo equipo en dos partidos simultáneos)
Exportar PDF del schedule

2.4 Live Score Input

Selección de partido activo desde lista
Interface de ingreso: dos columnas, una por equipo
Botones grandes +1 / -1 para puntos del set actual
Indicador de set actual (Set 1 / Set 2 / Set 3...)
Botón "Terminar set" con confirmación
Botón "Partido terminado" con resumen final para confirmar
Historial de ediciones (por si hay error de ingreso)

2.5 Gestión de Equipos

Lista con status: confirmado / pendiente / eliminado
Inline edit de roster
Importar desde CSV
Ver árbol de resultados de cada equipo


PWA ESPECÍFICO
Pantalla Install Prompt

Bottom sheet en mobile: "Instala Spike en tu pantalla de inicio"
Preview del ícono de la app
Beneficios en 2-3 bullets: Notificaciones · Modo offline · Más rápido
Botón "Instalar" azul · "Ahora no" gris texto
No mostrar más de 1 vez por semana

Offline Mode

Banner superior: "Sin conexión — mostrando datos en caché"
Ícono de WiFi tachado en header
Datos desactualizados: timestamp "Actualizado hace X min"
Funciones deshabilitadas (score input) con tooltip explicativo


REGLAS DE RESPONSIVIDAD
Mobile (360–767px) — prioridad

Bottom navigation bar
Cards full-width con padding 16px horizontal
Bracket: scroll horizontal con snap
Tablas: columnas colapsables, primeras 3 siempre visibles
Score en partidos: máximo prominente
Menú de filtros: bottom sheet modal

Tablet (768–1023px)

Navegación lateral (sidebar colapsable, 64px) OU bottom nav (decisión de diseño)
Cards en grid 2 columnas
Bracket visible completo en landscape
Tablas completas sin colapso
Split view: schedule a la izquierda, detail a la derecha si hay espacio

Desktop (1024px+)

Sidebar fija de 240px con navegación completa
Layout en 3 columnas: nav | contenido principal | detail panel
Match cards en grid 3-4 columnas
Hover states en todos los elementos interactivos
Keyboard navigation completa (Tab, Enter, Escape)
Bracket con scroll solo si hay muchos equipos

Large screen / TV mode (1440px+)

Vista Slideshow para proyectar en pantallas del club
Auto-refresh cada 30 segundos
Fuente escalada para visibilidad a distancia
Solo info esencial: live scores + standings


MICROINTERACCIONES Y MOTION

Page transitions: slide horizontal entre tabs del mismo nivel, slide vertical para drill-down
Live score update: número antiguo sale hacia arriba, número nuevo entra desde abajo (flip animation)
Match card live: borde izquierdo rojo con pulse sutil (CSS animation, 2 segundos, reducible con prefers-reduced-motion)
Pull to refresh: pelota de voleibol que rebota mientras carga
Score input +1: haptic feedback (vibration API) + micro-bounce en el número
Toast notification: slide-in desde arriba con spring physics
Bracket win: confetti muy sutil al marcar ganador
Install PWA: bottom sheet sube con spring animation
Skeleton loading: todos los cards tienen estado skeleton antes de cargar (no spinners genéricos)


ACCESIBILIDAD

Contraste mínimo WCAG AA en todos los textos (4.5:1)
Todos los iconos tienen aria-label
Focus visible siempre presente (outline 2px azul, outline-offset: 2px)
Reducción de movimiento respetada (@media prefers-reduced-motion)
Modo alto contraste compatible
Soporte de gestos alternativos (no solo swipe)
Textos escalables hasta 200% sin perder funcionalidad


FLUJO DE ENTREGABLES PARA FIGMA
Organización de páginas en el archivo:

🎨 Design Tokens — Variables de color, tipografía, espaciado, sombras
🧩 Components — Todos los componentes atómicos y moleculares
📱 Mobile Flows — Flujo espectador + Flujo admin (375px)
💻 Desktop Flows — Mismo flujo en 1440px
⚡ PWA Specifics — Install prompt, offline, splash, notificaciones
🎬 Prototyping — Flujos interactivos conectados con transiciones
📋 Specs — Redlines, anotaciones, handoff para desarrollo

Naming convention:

Componentes: [Atom|Molecule|Organism]/[NombreComponente]/[Variante]
Frames: [Plataforma]/[Pantalla]/[Estado] ej: Mobile/Home/Default
Variables: [Categoría]/[Subcategoría]/[Nombre] ej: color/brand/red


NOTAS ADICIONALES DE CONTEXTO

El club Spike es un club de voleibol que organiza torneos internos y para la comunidad
Los usuarios principales: jugadores y familias en la cancha (luz solar directa, 1 mano ocupada)
El admin organiza desde laptop, pero también ingresa scores desde el teléfono en la cancha
Se espera entre 8 y 64 equipos por torneo
Tiempo real es crítico: los padres y equipos siguen el marcador desde las gradas
El sistema debe funcionar con señal móvil débil (sport halls con mala conectividad)

