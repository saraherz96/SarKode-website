## Sección Servicios — panel glass "pinned" con scroll interno

En vez de un grid estático, la sección de servicios es un **contenedor alto** dentro del cual un panel `.liquid-glass` queda fijo ("pinned") en el centro del viewport mientras el usuario sigue scrolleando; ese scroll adicional va pasando las 4 tarjetas de servicio una por una (crossfade), y solo cuando termina la última, el scroll libera el panel y continúa hacia la siguiente sección.

- **Wrapper exterior** `<section id="servicios" className="relative" style={{ height: '400vh' }}>` — la altura (`4 × 100vh`, una por tarjeta) es lo que define cuánto scroll "consume" la sección.
- **Panel pinned** dentro del wrapper: `sticky top-0 h-screen w-full flex items-center justify-center px-6 sm:px-12`. Adentro, el panel visual real: `.liquid-glass rounded-[32px] w-full max-w-5xl h-[70vh] sm:h-[75vh] p-8 sm:p-14 flex flex-col justify-center relative overflow-hidden`.
- **Cálculo de progreso** (hook `useServiceScroll` o lógica inline en `useEffect` con listener de `scroll`):
  - Con un `ref` en el wrapper exterior, calcular `progress = clamp((-rect.top) / (rect.height - window.innerHeight), 0, 1)` en cada evento de scroll (usar `requestAnimationFrame` para throttle).
  - `activeIndex = Math.min(services.length - 1, Math.floor(progress * services.length))`.
  - Guardar `activeIndex` en estado; solo re-renderiza cuando cambia (evita renders innecesarios).
- **Contenido del panel** (cambia según `activeIndex`, con `AnimatePresence` de `motion/react` para crossfade `opacity`/`translateY` suave entre tarjetas, `duration: 0.4`):
  - Tag `.mono-tag` fijo arriba del panel (no cambia): "QUÉ HACEMOS"
  - Número + total, estilo `.mono-tag` con `color: var(--accent-1)`: `01 / 04` (se actualiza con `activeIndex + 1`).
  - Layout interno de cada tarjeta activa: `grid sm:grid-cols-[auto,1fr] gap-8 items-center` — ícono grande a la izquierda dentro de un círculo `.liquid-glass w-20 h-20 rounded-full flex items-center justify-center` (`size={32} strokeWidth={2.5}`), y a la derecha título (`text-3xl sm:text-4xl font-medium mb-3`) + outcome-line en itálica (`text-xl text-white/70 italic mb-4`) + descripción (`text-white/50 text-base leading-relaxed max-w-md`).
  - **Barra de progreso / dots** abajo del panel: 4 segmentos horizontales (`flex gap-2`), cada uno `h-1 rounded-full flex-1 bg-white/10`; el segmento del `activeIndex` (y los anteriores) se rellenan con `var(--brand-gradient)` vía `transition-all duration-300`. Esto le da al usuario feedback claro de "cuánto falta" dentro del panel.
- **Las 4 tarjetas** (mismo copy ya definido, reorganizado para el layout de panel único):
  1. **AI Agents** (ícono `Sparkles`) — *"Tu equipo de soporte que nunca duerme."* Desarrollamos agentes de IA personalizados para atención al cliente, ventas, soporte interno, RRHH y más. Conectados a tus herramientas y datos.
  2. **Automation** (ícono `Workflow`) — *"Menos clics, menos errores, más horas libres."* Automatizamos procesos e integraciones con n8n, APIs y tus plataformas actuales para ahorrarte tiempo y reducir costos.
  3. **Products** (ícono `Package`) — *"De prototipo a producto real, en semanas."* Creamos productos digitales con IA: SaaS, plataformas internas, MVPs y herramientas inteligentes escalables.
  4. **UX/UI Design** (ícono `PenTool`) — *"Interfaces que se sienten obvias desde el primer clic."* Diseñamos experiencias excepcionales, desde UX Research hasta UI Design y prototipos listos para desarrollo.
- **Fallback mobile / `prefers-reduced-motion`:** si el viewport es `< 640px` o el usuario prefiere menos movimiento, no hacer pinned-scroll — renderizar directamente un grid vertical simple (`flex flex-col gap-4`) con las 4 tarjetas en formato "glow card" (ver siguiente sección) apiladas, sin scroll-jacking.

## Tarjetas "glow" — estilo de referencia (`Cards.rtf`) aplicado a marca

Este es el estilo de tarjeta a reutilizar tanto dentro del panel pinned (versión grande, una a la vez) como en el fallback mobile (versión grid). Requiere `motion/react` (Framer Motion).

- Componente reutilizable `<GlowCard title description icon gradient delay />`.
- Wrapper: `<motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: 'easeOut', delay }}>` — `relative flex flex-col justify-start items-start w-full group`.
- **Glow de fondo:** `div` absoluto detrás, `w-full h-full opacity-60 rounded-[40px] pointer-events-none`, inline `style={{ background: gradient, filter: 'blur(45px)' }}`.
- **Tarjeta primer plano:** `relative h-full rounded-[40px] z-10 overflow-hidden`, borde de `8px solid transparent`, inline `style={{ background: 'linear-gradient(var(--bg-elevated), var(--bg-elevated)) padding-box, ' + gradient + ' border-box' }}`.
- Contenido interno: `w-full h-full p-7 flex flex-col justify-between`. Ícono `size={32} strokeWidth={2.5}` en `text-white/90`; título `text-white font-medium text-xl mb-3 tracking-tight`; descripción `text-gray-400 text-[14px] leading-[1.6]`.
- **Gradientes por tarjeta** (variaciones del gradiente de marca, no colores ajenos a la paleta):
  1. AI Agents: `linear-gradient(137deg, #9C93F0 0%, #F2A8C6 50%, #A8C7F0 100%)`
  2. Automation: `linear-gradient(137deg, #A8C7F0 0%, #9C93F0 50%, #F2A8C6 100%)`
  3. Products: `linear-gradient(137deg, #F2A8C6 0%, #A8C7F0 50%, #9C93F0 100%)`
  4. UX/UI Design: `linear-gradient(137deg, #9C93F0 0%, #A8C7F0 50%, #F2A8C6 100%)`

## Franja "Cómo trabajamos" (opcional, corta, `py-20 px-6 sm:px-12 border-t border-white/5`)

- 3 pasos en línea horizontal (`grid sm:grid-cols-3 gap-8`), numerados `01 / 02 / 03` en `.mono-tag` con color `var(--accent-1)`: *Diagnóstico → Diseño y build → Entrega y soporte.* Copy breve, una frase por paso, sin relleno genérico.

## CTA final (`py-28 px-6 text-center relative overflow-hidden`)

- Fondo: `var(--bg-elevated)` con un glow sutil de `var(--brand-gradient)` en `blur-3xl opacity-20` detrás del contenido (no un gradiente plano cubriendo todo).
- `<h2>` `text-3xl sm:text-4xl font-medium mb-6`: **"¿Construimos lo que sigue?"**
- Botón único: "Book a call" — mismo estilo `var(--brand-gradient)` que el CTA del navbar, `px-8 py-4 text-base`, abre el **modal de contacto** (mismo `setModalOpen(true)`, no un link externo).

## Modal de contacto (se abre al hacer click en "Book")

Overlay a pantalla completa que se monta sobre la landing (no navega a otra URL) cuando `modalOpen` es `true`. Estructura de dos columnas inspirada en el mockup de referencia, pero **reskineada al glass oscuro de SarKode** (no en tema claro) para mantener consistencia de marca.

- **Overlay:** `fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8`, fondo `bg-[#0A0A0C]/80 backdrop-blur-sm`. Cierra al hacer click fuera del panel, al presionar `Escape`, o con el botón `X`. Bloquear el scroll del `body` mientras está abierto (`overflow: hidden`).
- **Animación de entrada** (`motion/react`): overlay `initial={{ opacity: 0 }} animate={{ opacity: 1 }}`; panel `initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }}`.
- **Panel:** `.liquid-glass rounded-[28px] w-full max-w-5xl max-h-[90vh] overflow-y-auto grid grid-cols-1 lg:grid-cols-2` (fondo del panel un poco más opaco que el resto de la UI: `background: rgba(28,28,36,0.92)` en vez del `.liquid-glass` translúcido por defecto, para legibilidad del formulario). Botón `X` (`size 18`) en `absolute top-5 right-5 liquid-glass p-2 rounded-lg text-white/70 hover:text-white`.

**Columna izquierda** (`p-8 sm:p-12 flex flex-col justify-center`):
- Tag `.mono-tag` con color `var(--accent-1)`: "HABLEMOS"
- `<h2>` `text-3xl sm:text-4xl font-medium leading-tight mb-5`:
  **"Construyamos algo que valga la pena"** + salto de línea + palabra final en itálica con `background: var(--brand-gradient); background-clip: text; color: transparent; font-style: italic;`: **"terminar."**
- `<p>` `text-white/55 text-sm leading-relaxed mb-8 max-w-sm`:
  **"Cuéntanos tu idea o tu problema. Respondemos en un día hábil con un punto de vista, no un guion de ventas."**
- Bloque de datos de contacto (`flex flex-col gap-5`), cada ítem `flex items-center gap-3`: ícono en círculo `.liquid-glass w-10 h-10 rounded-full flex items-center justify-center`, y a la derecha label `.mono-tag` + valor `text-white text-sm`:
  - `Mail` — EMAIL — `hola@sarkode.com` *(reemplazar por el correo real)*
  - `MapPin` — ESTUDIO — `Remoto · LatAm` *(reemplazar por la ubicación real si aplica)*
  - `Calendar` — `¿PREFIERES HABLAR?` — "Agenda una llamada de 30 min →" (link externo a Calendly/Cal.com, se abre en nueva pestaña, no dentro del modal)

**Columna derecha** (`bg-[var(--bg-elevated)] p-8 sm:p-12 flex flex-col gap-5`, formulario controlado con `useState`):
- Grid `grid grid-cols-1 sm:grid-cols-2 gap-4`: inputs "Nombre completo" (placeholder `Ada Lovelace`) y "Email de trabajo" (placeholder `ada@empresa.com`).
- Grid `grid grid-cols-1 sm:grid-cols-2 gap-4`: input "Empresa" y `<select>` "Rango de presupuesto" (opciones: `< $5,000`, `$5,000–15,000`, `$15,000–50,000`, `$50,000+`).
- Todos los inputs/selects: `bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:border-[var(--accent-1)] focus:outline-none transition-colors`.
- Label `text-sm text-white/80 mb-2 block`: "¿En qué te ayudamos?" — pills multi-selección (`flex flex-wrap gap-2`), una por cada pilar de SarKode: `AI Agents`, `Automation`, `Products`, `UX/UI Design`. Estado activo `background: var(--brand-gradient); color: #14141a;`, inactivo `.liquid-glass text-white/70 hover:text-white`. Toggle con `useState<string[]>`.
- Textarea "Cuéntanos del proyecto" (placeholder: `¿Qué estás construyendo y cómo se ve el éxito?`), mismo estilo de input, `rows={4}`.
- Botón submit "Enviar mensaje" con `ArrowUpRight`: `background: var(--brand-gradient); color: #14141a;` full-width, `py-3.5 rounded-full font-medium hover:opacity-90 transition-opacity`.
- Texto de apoyo debajo, centrado, `.mono-tag` sin mayúsculas forzadas (`normal-case text-white/40 text-xs`): "Respondemos en un día hábil. Cero spam."
- El `onSubmit` puede quedar como stub (`console.log` / placeholder para conectar a backend o servicio de forms más adelante) — no es necesario implementar el envío real en esta iteración.

## Footer (`py-10 px-6 sm:px-12 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4`)

- Wordmark pequeño + `.mono-tag` "© 2026 SARKODE" a la izquierda; links secundarios (Contacto, LinkedIn, Email) a la derecha en `text-white/50 hover:text-white text-sm`.

## Animaciones e interacciones (resumen)

- Todo hover/estado usa `transition-colors` / `transition-opacity`, nunca abrupto.
- Único parallax: el video del hero (sutil, ≤20% del scroll).
- Servicios: panel pinned con crossfade entre tarjetas controlado por progreso de scroll (no repite, no rebota).
- Glow cards: entrada `fade + translateY` con `motion/react`, stagger por `delay`.
- Modal: `scale + fade` de entrada/salida con `AnimatePresence`, cierre por click-fuera/`Escape`/botón `X`.
- Navbar se condensa a `.liquid-glass` al hacer scroll.
- Nada de animaciones llamativas, partículas, o efectos que compitan con el video o el degradado de marca — la sensación debe ser minimalista y premium, no "flashy".

## Dependencias

`react`, `react-dom`, `lucide-react`, `motion` (Framer Motion, importado como `motion/react`), `tailwindcss`, `vite`, `@vitejs/plugin-react`, TypeScript. Tailwind con content globs por defecto (`./index.html`, `./src/**/*.{ts,tsx}`).