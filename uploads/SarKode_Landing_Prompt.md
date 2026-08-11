# Prompt — Landing Page SarKode

Construye una landing page full-screen, multi-sección, en React + TypeScript + Vite + Tailwind CSS, con estética "liquid glass" sobre un video de fondo en loop, siguiendo la identidad de marca de SarKode (AI Engineering Studio). Usa `lucide-react` para íconos. Sin otras librerías de UI.

## Fuentes y CSS global (`src/index.css`)

- Importar **Satoshi** (o fallback `Inter`/`General Sans` si no está disponible) para wordmark y titulares, y **JetBrains Mono** desde Google Fonts para tags/micro-copy: `https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap`
- Aplicar la tipografía principal globalmente: `* { font-family: 'Satoshi', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }`
- Clase `.mono-tag` para labels: `font-family: 'JetBrains Mono', monospace; text-transform: uppercase; letter-spacing: 0.2em; font-size: 0.7rem; opacity: 0.65;`
- Incluir `@tailwind base; @tailwind components; @tailwind utilities;`
- Custom properties en `:root`:
  - `--bg: #14141a;` (fondo base, gris carbón — nunca negro puro)
  - `--bg-elevated: #1c1c24;` (tarjetas)
  - `--accent-1: #9C93F0;` (lavanda)
  - `--accent-2: #F2A8C6;` (rosa)
  - `--accent-3: #A8C7F0;` (azul pastel)
  - `--text: #F6F1EC;` (crema)
  - `--text-muted: #6B5B7D;` (malva apagado)
  - `--brand-gradient: linear-gradient(90deg, var(--accent-1), var(--accent-2), var(--accent-3));`
- Clase `.liquid-glass`:
  - `background: rgba(255,255,255,0.03);`
  - `backdrop-filter: blur(14px);` + `-webkit-backdrop-filter`
  - `border: none; position: relative; overflow: hidden;`
  - `box-shadow: inset 0 1px 1px rgba(255,255,255,0.08);`
- `.liquid-glass::before` (borde degradado vía mask compositing):
  - `content:''; position:absolute; inset:0; border-radius:inherit; padding:1.2px;`
  - `background: linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.08) 25%, rgba(255,255,255,0) 45%, rgba(255,255,255,0) 65%, rgba(255,255,255,0.1) 85%, rgba(255,255,255,0.35) 100%);`
  - `-webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask-composite: exclude; pointer-events:none;`
- Respetar `prefers-reduced-motion: reduce` desactivando parallax y scroll-reveal (mostrar todo estático).

## Componente principal (`src/App.tsx`)

- Import de `lucide-react`: `Menu`, `X`, `ChevronDown`, `ArrowUpRight`, `Sparkles`, `Workflow`, `Package`, `PenTool` (íconos de línea, `strokeWidth={1.5}`, sin relleno, para los 4 pilares de servicio).
- `BG_VIDEO`: ruta local al video subido por el usuario (colocarlo en `/public/videos/sarkode-bg.mp4` y referenciarlo como `/videos/sarkode-bg.mp4`).
- `navLinks`: `{ label: 'Inicio', active: true }`, `{ label: 'Servicios' }`, `{ label: 'Cómo trabajamos' }`, `{ label: 'Equipo' }`.
- Estados: `menuOpen` (`useState(false)`), `scrolled` (`useState(false)` — true cuando `window.scrollY > 40`, controla el navbar).

## Estructura general

`<div className="relative w-full bg-[#14141a]">` con secciones apiladas en scroll normal (no snap): **Hero** (100vh) → **Servicios** → **Cómo trabajamos** (opcional, franja corta) → **CTA final** → **Footer**.

## Video de fondo (solo en Hero, tratamiento sutil)

- `<video>` absolutamente posicionado dentro del hero, `w-full h-full object-cover`, `autoPlay muted loop playsInline`, `src={BG_VIDEO}`.
- Encima, overlay `absolute inset-0` con `background: linear-gradient(180deg, rgba(20,20,26,0.35) 0%, rgba(20,20,26,0.55) 55%, rgba(20,20,26,0.95) 100%)` para que el texto siempre sea legible y el video se sienta de fondo, no protagonista.
- Filtro sobre el propio `<video>`: `filter: brightness(0.75) saturate(1.05);` — evita que se vea "crudo" o llamativo.
- Reproducir a `playbackRate = 0.75` vía `ref` en `useEffect` para que el movimiento se perciba lento y calmado (parte clave de "sutil").
- Parallax opcional: al hacer scroll, trasladar el video `translateY(scrollY * 0.15)` con `requestAnimationFrame` (nunca más del 15–20% del scroll) — deshabilitado si `prefers-reduced-motion`.

## Navbar (`fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-6 sm:px-10 py-5 transition-all duration-300`)

- Cuando `scrolled` es `true`, el propio navbar completo adopta `liquid-glass` con `py-3` (se "condensa"); en el hero inicial va transparente sobre el video.
- Logo (izquierda): wordmark "SarKode" en texto real — las letras **S** y **K** con `background: var(--brand-gradient); background-clip: text; color: transparent;`, el resto del nombre en `var(--text)`. Debajo (solo visible cuando NO scrolled y en desktop), tag `.mono-tag`: "DIGITAL SOLUTIONS".
- Nav pill (centro, `hidden md:flex liquid-glass items-center gap-1 rounded-xl px-2 py-2`): mapear `navLinks`, mismo patrón de estados activo/hover que el ejemplo (`bg-white/10 text-[var(--text)]` activo, `text-white/60 hover:text-white` inactivo).
- CTA derecha (`hidden md:flex`): botón "Ver servicios" — pill, `background: var(--brand-gradient)`, texto `#14141a` (oscuro, para contraste sobre el degradado claro), `hover:opacity-90 transition-opacity`.
- Toggle móvil (`md:hidden liquid-glass p-2 rounded-lg`): `X` si `menuOpen`, si no `Menu` (size 18). Menú móvil: mismo patrón `liquid-glass` desplegable que el navbar, con los mismos links + CTA al final.

## Hero (contenido, `absolute bottom-0 left-0 z-20 px-6 sm:px-12 pb-14 sm:pb-20 max-w-3xl`)

- Tag `.mono-tag` arriba del título: `SOFTWARE · PRODUCT · AI · CLOUD`
- `<h1>` `text-[var(--text)] text-4xl sm:text-5xl lg:text-6xl font-medium leading-[1.05] tracking-tight mb-5`:
  **"Ingeniería de IA que se nota en los resultados, no en el discurso."**
- `<p>` `text-white/55 text-base leading-relaxed mb-8 max-w-lg`:
  **"Diseñamos agentes, automatizaciones y productos digitales que reemplazan trabajo repetitivo por sistemas que piensan, actúan y se conectan a lo que ya usas — sin promesas vacías de 'transformación digital'."**
- Botones (`flex flex-wrap items-center gap-3`):
  - "Ver servicios" — `background: var(--brand-gradient); color:#14141a;` pill, `px-7 py-3.5 rounded-full font-medium hover:opacity-90 transition-opacity`
  - "Cómo trabajamos" — `.liquid-glass text-white px-7 py-3.5 rounded-full font-medium hover:bg-white/5 transition-colors`, con `ArrowUpRight` a la derecha del texto.
- Indicador de scroll sutil, centrado abajo: `ChevronDown` animado con `animate-bounce` muy lento (o `transition` en vez de keyframe agresivo) + texto `.mono-tag` "SCROLL".

## Sección Servicios (fondo `var(--bg)`, `py-24 sm:py-32 px-6 sm:px-12`)

- Tag `.mono-tag` centrado o alineado a la izquierda: "QUÉ HACEMOS"
- `<h2>` `text-3xl sm:text-4xl font-medium tracking-tight max-w-2xl mb-16`:
  **"Creamos agentes de IA y productos digitales que impulsan tu negocio."**
- Grid `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5`. Cada tarjeta `bg-[var(--bg-elevated)] rounded-2xl p-7 border border-white/5 hover:border-transparent relative` — en `hover`, aplicar el mismo patrón `::before` de borde degradado que `.liquid-glass` (transición `opacity` 0→1, `duration-500`).
  1. **AI Agents** (ícono `Sparkles`) — *"Tu equipo de soporte que nunca duerme."* Desarrollamos agentes de IA personalizados para atención al cliente, ventas, soporte interno, RRHH y más. Conectados a tus herramientas y datos.
  2. **Automation** (ícono `Workflow`) — *"Menos clics, menos errores, más horas libres."* Automatizamos procesos e integraciones con n8n, APIs y tus plataformas actuales para ahorrarte tiempo y reducir costos.
  3. **Products** (ícono `Package`) — *"De prototipo a producto real, en semanas."* Creamos productos digitales con IA: SaaS, plataformas internas, MVPs y herramientas inteligentes escalables.
  4. **UX/UI Design** (ícono `PenTool`) — *"Interfaces que se sienten obvias desde el primer clic."* Diseñamos experiencias excepcionales, desde UX Research hasta UI Design y prototipos listos para desarrollo.
- Scroll reveal: cada tarjeta entra con `opacity-0 translate-y-6` → `opacity-100 translate-y-0` (`transition-all duration-700 ease-out`) al cruzar el viewport, vía `IntersectionObserver`, con `stagger` de ~100ms entre tarjetas (delay incremental por índice). Una sola vez (no repetir al volver a scrollear).

## Franja "Cómo trabajamos" (opcional, corta, `py-20 px-6 sm:px-12 border-t border-white/5`)

- 3 pasos en línea horizontal (`grid sm:grid-cols-3 gap-8`), numerados `01 / 02 / 03` en `.mono-tag` con color `var(--accent-1)`: *Diagnóstico → Diseño y build → Entrega y soporte.* Copy breve, una frase por paso, sin relleno genérico.

## CTA final (`py-28 px-6 text-center relative overflow-hidden`)

- Fondo: `var(--bg-elevated)` con un glow sutil de `var(--brand-gradient)` en `blur-3xl opacity-20` detrás del contenido (no un gradiente plano cubriendo todo).
- `<h2>` `text-3xl sm:text-4xl font-medium mb-6`: **"¿Construimos lo que sigue?"**
- Botón único: "Empecemos" — mismo estilo `var(--brand-gradient)` que el CTA del navbar, `px-8 py-4 text-base`.

## Footer (`py-10 px-6 sm:px-12 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4`)

- Wordmark pequeño + `.mono-tag` "© 2026 SARKODE" a la izquierda; links secundarios (Contacto, LinkedIn, Email) a la derecha en `text-white/50 hover:text-white text-sm`.

## Animaciones e interacciones (resumen)

- Todo hover/estado usa `transition-colors` / `transition-opacity`, nunca abrupto.
- Único parallax: el video del hero (sutil, ≤20% del scroll).
- Único scroll-reveal: tarjetas de servicio (fade + translate, stagger, una vez).
- Navbar se condensa a `.liquid-glass` al hacer scroll.
- Nada de animaciones llamativas, partículas, o efectos que compitan con el video o el degradado de marca — la sensación debe ser minimalista y premium, no "flashy".

## Dependencias

`react`, `react-dom`, `lucide-react`, `tailwindcss`, `vite`, `@vitejs/plugin-react`, TypeScript. Tailwind con content globs por defecto (`./index.html`, `./src/**/*.{ts,tsx}`).
