# Prompt — Landing Page SarKode (parte 2: todo excepto el Hero)

Este prompt continúa el proyecto ya construido a partir de `SarKode_Landing_Prompt.md` (Hero + Navbar + variables de marca ya implementados — **no los repitas ni los reconstruyas**, solo reutilízalos). Aquí se cubre el resto de la landing, con foco principal en una nueva forma de mostrar los **servicios**: una vista previa en página que abre un **modal con grid de tarjetas**, inspirado en un patrón de "case studies" (tarjeta oscura, ícono acento, tags, botón de flecha).

## Base compartida (reutilizar, no redefinir)

- Variables `:root` (`--bg`, `--bg-elevated`, `--accent-1/2/3`, `--text`, `--text-muted`, `--brand-gradient`).
- Clases `.liquid-glass` (+ `::before` de borde degradado) y `.mono-tag`.
- Fuentes Satoshi + JetBrains Mono ya importadas en `src/index.css`.
- Componente `<GlowCard />` (glow difuminado + borde degradado vía `background-clip`) — se **extiende** en este prompt con props nuevas: `category`, `year`, `tags: string[]`, `onSelect`.
- Navbar fijo ya construido (con botón "Book" que abre el modal de contacto) — sin cambios.

## Sección Servicios — vista previa en página

`<section id="servicios" className="py-24 sm:py-32 px-6 sm:px-12 bg-[var(--bg)]">`

- Tag `.mono-tag`: "QUÉ HACEMOS"
- `<h2>` `text-3xl sm:text-4xl font-medium tracking-tight max-w-xl mb-4`: **"Creamos agentes de IA y productos digitales que impulsan tu negocio."**
- `<p>` `text-white/50 text-sm max-w-md mb-10`: **"Cuatro formas de trabajar juntos — elige una o combínalas."**
- Preview compacto: grid `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`, cada ítem un `<GlowCard />` en **tamaño mini** (`h-[180px]`, solo ícono + título, sin descripción ni tags — versión resumida del mismo componente vía prop `compact`).
- Cada mini-card es clickeable (`cursor-pointer`, `hover:scale-[1.02] transition-transform`) y al hacer click abre el **modal de servicios** (`setServicesModalOpen(true)`) con esa tarjeta ya enfocada/en el tope del scroll (`scrollToIndex`).
- Botón centrado debajo del grid, `mt-10 mx-auto block`: "Ver todos los servicios" — `.liquid-glass text-white px-6 py-3 rounded-full text-sm hover:bg-white/5 transition-colors`, con `ArrowUpRight` — abre el mismo modal sin tarjeta preseleccionada.

## Modal de servicios (grid expandido de case-cards)

Overlay a pantalla completa (mismo patrón de overlay/animación que el modal de contacto ya definido: `fixed inset-0 z-50`, scrim `bg-[#0A0A0C]/80 backdrop-blur-sm`, cierre por click-fuera / `Escape` / botón `X`, bloqueo de scroll del `body`, entrada `scale 0.96→1 + fade`).

- **Panel:** `.liquid-glass rounded-[28px] w-full max-w-4xl max-h-[85vh] relative` con fondo algo más opaco (`background: rgba(28,28,36,0.94)`) para legibilidad. Botón `X` **fijo** (no scrollea con el contenido): `absolute top-5 right-5 z-10 liquid-glass p-2 rounded-lg text-white/70 hover:text-white`.
- **Header del panel** (no scrollea, `sticky top-0 z-[5] px-8 sm:px-10 pt-8 pb-4 bg-[inherit]`): tag `.mono-tag` "NUESTROS SERVICIOS" + `<h3 className="text-2xl font-medium">` "Cómo podemos ayudarte".
- **Contenido scrolleable:** `overflow-y-auto px-8 sm:px-10 pb-10`, con scrollbar delgado y `thumb` en `var(--accent-1)` (`scrollbar-thin` vía CSS custom, `::-webkit-scrollbar { width: 6px }`, `::-webkit-scrollbar-thumb { background: var(--accent-1); border-radius: 999px }`).
- **Grid de tarjetas:** `grid grid-cols-1 sm:grid-cols-2 gap-6`. Cada tarjeta es un `<GlowCard />` en tamaño completo (`h-[300px]`) con la estructura extendida:
  - Esquina superior izquierda, `.mono-tag`: `{CATEGORY} — 2026` (ej. `AI AGENTS — 2026`).
  - Esquina superior derecha: botón circular `.liquid-glass w-9 h-9 rounded-full flex items-center justify-center`, ícono `ArrowUpRight size={16}`; en `hover` del card, rota `rotate-45` (`transition-transform duration-300`) para insinuar "abrir/seleccionar".
  - Centro: ícono de línea grande del servicio (`Sparkles` / `Workflow` / `Package` / `PenTool`, `size={40} strokeWidth={1.5}`, `text-white/90`), sin relleno — más minimalista que un ícono sólido tipo estrella.
  - Título `text-white font-medium text-xl mb-2 tracking-tight` + outcome-line en itálica `text-white/60 text-sm italic mb-3`.
  - Descripción `text-gray-400 text-[14px] leading-[1.6] mb-4`.
  - Tags (`flex flex-wrap gap-2` al fondo de la tarjeta): pills `.liquid-glass px-3 py-1 rounded-full text-xs text-white/70`.
  - `onClick` en toda la tarjeta: llama `onSelect(service.id)` — cierra el modal de servicios y abre el **modal de contacto** con ese servicio ya marcado como pill activa en "¿En qué te ayudamos?" (compartir estado `preselectedService` entre ambos modales).

### Datos de las 4 tarjetas

1. **AI Agents** — categoría `AI AGENTS`, ícono `Sparkles`, gradiente `linear-gradient(137deg, #9C93F0 0%, #F2A8C6 50%, #A8C7F0 100%)`. Outcome: *"Tu equipo de soporte que nunca duerme."* Descripción: "Desarrollamos agentes de IA personalizados para atención al cliente, ventas, soporte interno, RRHH y más. Conectados a tus herramientas y datos." Tags: `Chatbots`, `Copilots`, `Integraciones`.
2. **Automation** — categoría `AUTOMATION`, ícono `Workflow`, gradiente `linear-gradient(137deg, #A8C7F0 0%, #9C93F0 50%, #F2A8C6 100%)`. Outcome: *"Menos clics, menos errores, más horas libres."* Descripción: "Automatizamos procesos e integraciones con n8n, APIs y tus plataformas actuales para ahorrarte tiempo y reducir costos." Tags: `n8n`, `APIs`, `Workflows`.
3. **Products** — categoría `PRODUCTS`, ícono `Package`, gradiente `linear-gradient(137deg, #F2A8C6 0%, #A8C7F0 50%, #9C93F0 100%)`. Outcome: *"De prototipo a producto real, en semanas."* Descripción: "Creamos productos digitales con IA: SaaS, plataformas internas, MVPs y herramientas inteligentes escalables." Tags: `SaaS`, `MVP`, `Escalable`.
4. **UX/UI Design** — categoría `UX/UI DESIGN`, ícono `PenTool`, gradiente `linear-gradient(137deg, #9C93F0 0%, #A8C7F0 50%, #F2A8C6 100%)`. Outcome: *"Interfaces que se sienten obvias desde el primer clic."* Descripción: "Diseñamos experiencias excepcionales, desde UX Research hasta UI Design y prototipos listos para desarrollo." Tags: `Research`, `UI Design`, `Prototipos`.

- **Animación de entrada de tarjetas:** igual que `<GlowCard />` base (`opacity 0→1, y: 30→0, duration 0.8, ease easeOut`), con `delay` escalonado por índice (`index * 0.08`) cada vez que el modal se abre (usar `key` que cambie en cada apertura para re-disparar la animación).

## Franja "Cómo trabajamos" (`py-20 px-6 sm:px-12 border-t border-white/5`)

- 3 pasos en línea horizontal (`grid sm:grid-cols-3 gap-8`), numerados `01 / 02 / 03` en `.mono-tag` con `color: var(--accent-1)`: *Diagnóstico → Diseño y build → Entrega y soporte.* Una frase breve por paso, sin relleno genérico.

## CTA final (`py-28 px-6 text-center relative overflow-hidden`)

- Fondo `var(--bg-elevated)` con glow sutil de `var(--brand-gradient)` (`blur-3xl opacity-20`) detrás del contenido.
- `<h2>` `text-3xl sm:text-4xl font-medium mb-6`: **"¿Construimos lo que sigue?"**
- Botón "Book a call" — `background: var(--brand-gradient); color:#14141a;` pill, `px-8 py-4`, abre el modal de contacto (`setModalOpen(true)`, sin servicio preseleccionado).

## Footer (`py-10 px-6 sm:px-12 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4`)

- Wordmark pequeño + `.mono-tag` "© 2026 SARKODE" a la izquierda; links secundarios (Contacto, LinkedIn, Email) a la derecha, `text-white/50 hover:text-white text-sm`.

## Modal de contacto

Reutiliza exactamente el modal ya definido en `SarKode_Landing_Prompt.md` (overlay, panel de dos columnas, formulario). Único agregado: si `preselectedService` viene seteado desde el modal de servicios, la pill correspondiente en "¿En qué te ayudamos?" debe iniciar `active` al montarse el formulario.

## Animaciones e interacciones (resumen)

- Mini-cards de preview: `hover:scale-[1.02]`, sin más.
- Modal de servicios: overlay `fade`, panel `scale + fade`; tarjetas internas con stagger fade-up (`motion/react`), ícono de flecha rota 45° en hover de cada tarjeta.
- Scroll interno del modal con scrollbar delgado de marca, header con `sticky` que no se mueve.
- Ambos modales (servicios y contacto) se cierran con `Escape`, click fuera, o botón `X`; nunca se abren los dos a la vez (seleccionar un servicio cierra el de servicios y abre el de contacto).
- Nada de animaciones extra, glitter, o parallax dentro de los modales — mismo criterio minimalista/premium del resto de la landing.

## Dependencias

Mismas que el prompt del Hero: `react`, `react-dom`, `lucide-react`, `motion` (`motion/react`), `tailwindcss`, `vite`, `@vitejs/plugin-react`, TypeScript.
