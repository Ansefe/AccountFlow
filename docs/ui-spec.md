# AccountFlow — Especificación UI/UX para Diseñador

Documento de referencia completo para diseñar la interfaz de **AccountFlow**, una aplicación de escritorio (Windows) para gestión y alquiler de cuentas de League of Legends. El estilo visual debe transmitir sofisticación tecnológica inspirada en plataformas como TradingView y apps de criptomonedas modernas.

---

## 1. Identidad Visual

### 1.1 Concepto de Diseño

**Dirección artística:** Dark tech / fintech aesthetic — similar a TradingView, Binance Pro, o Deribit.

**Palabras clave del estilo:**
- Oscuro, sofisticado, premium
- Data-dense pero legible
- Bordes sutiles, glassmorphism selectivo
- Micro-animaciones fluidas
- Profesional pero con personalidad gaming

**Referentes visuales:**
- **TradingView** — Layout de paneles, densidad de datos, sidebar colapsable
- **Binance** — Cards con gradientes sutiles, badges de estado, dark theme
- **Linear.app** — Limpieza, tipografía, transiciones suaves
- **Discord** — Sidebar de navegación, sistema de roles/badges
- **op.gg / u.gg** — Cards de campeones, indicadores de elo con color

### 1.2 Paleta de Colores

**Filosofía:** Fondo oscuro profundo con acentos de color vibrantes. Los colores de estado (elo, disponibilidad) son críticos para la UX.

#### Colores base (Dark Theme)

| Token | Hex | Uso |
|---|---|---|
| `--background` | `#0A0A0F` | Fondo principal de la app |
| `--background-secondary` | `#111118` | Fondo de sidebar, panels |
| `--surface` | `#16161F` | Cards, modales, dropdowns |
| `--surface-hover` | `#1C1C28` | Hover en cards y filas de tabla |
| `--border` | `#232333` | Bordes de cards, separadores |
| `--border-hover` | `#2E2E42` | Bordes en hover |

#### Texto

| Token | Hex | Uso |
|---|---|---|
| `--text-primary` | `#F0F0F5` | Texto principal, headings |
| `--text-secondary` | `#A0A0B8` | Texto secundario, labels |
| `--text-muted` | `#5C5C72` | Placeholders, texto deshabilitado |
| `--text-inverse` | `#0A0A0F` | Texto sobre fondos claros |

#### Acentos

| Token | Hex | Uso |
|---|---|---|
| `--accent-primary` | `#6C5CE7` | Botones principales, links, foco — violeta eléctrico |
| `--accent-primary-hover` | `#7E6FF0` | Hover del accent |
| `--accent-primary-muted` | `#6C5CE720` | Backgrounds sutiles del accent (20% opacity) |
| `--accent-secondary` | `#00D2FF` | Badges premium, iconos destacados — cyan brillante |

#### Estados

| Token | Hex | Uso |
|---|---|---|
| `--success` | `#00E676` | Cuenta disponible, pago exitoso |
| `--warning` | `#FFAB00` | Alquiler por expirar, créditos bajos |
| `--error` | `#FF5252` | Cuenta baneada, error, acción destructiva |
| `--info` | `#448AFF` | Información, tooltips |

#### Colores de Elo (League of Legends)

| Elo | Hex | Nota |
|---|---|---|
| Iron | `#5C4033` | Marrón oscuro |
| Bronze | `#CD7F32` | Bronce metálico |
| Silver | `#A8B0B8` | Gris plata |
| Gold | `#FFD700` | Dorado |
| Platinum | `#1ABC9C` | Verde azulado |
| Emerald | `#2ECC71` | Verde esmeralda |
| Diamond | `#9B59B6` | Púrpura |
| Master | `#E74C3C` | Rojo intenso |
| Grandmaster | `#E67E22` | Naranja rojizo |
| Challenger | `#F1C40F` | Dorado brillante con brillo |

Cada badge de elo debe tener un **glow sutil** (`box-shadow`) del mismo color para dar sensación de rango.

### 1.3 Tipografía

| Rol | Fuente | Weight | Size |
|---|---|---|---|
| **Headings** (H1-H3) | **Inter** | 700 (Bold) | 28/22/18px |
| **Subheadings** (H4-H5) | Inter | 600 (Semi) | 16/14px |
| **Body** | Inter | 400 (Regular) | 14px |
| **Body small** | Inter | 400 | 12px |
| **Monospace** (datos, timers) | **JetBrains Mono** | 500 | 14px |
| **Números grandes** (créditos, stats) | JetBrains Mono | 700 | 24-32px |

**Inter** — Sans-serif moderna, excelente legibilidad en pantallas, usada por Linear, Vercel, y muchos productos tech.

**JetBrains Mono** — Para datos numéricos (créditos, timers, elo/LP). Le da el toque "tech/terminal" que buscamos.

### 1.4 Iconografía

- **Librería:** Lucide Icons (open source, consistente, ~1400 iconos)
- **Tamaño estándar:** 18px para navegación, 16px inline, 24px para acciones principales
- **Estilo:** Outline (stroke-width 1.5-2), no filled
- **Color:** Hereda del texto (`currentColor`)

### 1.5 Espaciado y Grid

- **Sistema de espaciado:** Múltiplos de 4px (4, 8, 12, 16, 20, 24, 32, 40, 48, 64)
- **Border radius:** 
  - Botones/inputs: `8px`
  - Cards: `12px`
  - Modales: `16px`
  - Badges/tags: `9999px` (pill)
- **Sombras:** Mínimas. Preferir bordes sutiles sobre sombras. Cuando se usen: `0 4px 24px rgba(0,0,0,0.3)`

---

## 2. Componentes UI (shadcn-vue + Custom)

### 2.1 Librería Base

**shadcn-vue** — Port de shadcn/ui para Vue 3. Componentes accesibles basados en Radix Vue, estilizados con Tailwind CSS. Se copian al proyecto (no son dependencia npm), lo que permite customización total.

**Componentes de shadcn-vue a usar:**
- Button, Input, Label, Textarea
- Select, Dropdown Menu, Command (palette)
- Dialog (modales), Sheet (panel lateral)
- Table, Data Table (con TanStack Table)
- Tabs, Badge, Avatar
- Toast (notificaciones)
- Tooltip, Popover
- Card, Separator
- Progress, Skeleton (loading states)
- Alert, Alert Dialog (confirmaciones destructivas)

### 2.2 Componentes Custom a Diseñar

| Componente | Descripción |
|---|---|
| **EloBadge** | Badge con icono de rango + texto + glow del color de elo |
| **ServerBadge** | Badge pequeño con código del servidor (LAN, NA, EUW...) |
| **StatusIndicator** | Dot animado (verde/amarillo/rojo) + label para estado de cuenta |
| **CreditBalance** | Display grande de créditos con icono de moneda custom |
| **RentalTimer** | Countdown circular o lineal con colores que cambian al acercarse a 0 |
| **AccountCard** | Card compacta con nombre, elo badge, servidor, estado, botón alquilar |
| **AccountRow** | Fila de tabla con la misma info para vista de lista |
| **PlanCard** | Card de plan con precio, features, CTA (estilo pricing page) |
| **CreditPackageCard** | Card de paquete de créditos con cantidad, precio, animación al hover |
| **ActivityLogEntry** | Fila de log con icono de evento, timestamp, descripción, metadata |
| **StatCard** | Card de métrica para dashboards (número grande + label + trend arrow) |
| **OccupiedOverlay** | Overlay semi-transparente sobre AccountCard cuando está lockeada |

---

## 3. Layout General de la Aplicación

### 3.1 Estructura Global

```
┌────────────────────────────────────────────────────────────────┐
│  ■ ■ ■  Window Title Bar (custom, frameless)         — □ ✕   │
├────────┬───────────────────────────────────────────────────────┤
│        │  ┌─────────────────────────────────────────────────┐  │
│  SIDE  │  │ Header: Page title + Search + CreditBalance    │  │
│  BAR   │  │         + Avatar/Notifications                 │  │
│        │  ├─────────────────────────────────────────────────┤  │
│  Logo  │  │                                                 │  │
│  ────  │  │                                                 │  │
│  Nav   │  │              MAIN CONTENT AREA                  │  │
│  items │  │                                                 │  │
│        │  │  (Cada página renderiza su contenido aquí)      │  │
│  ────  │  │                                                 │  │
│  Plan  │  │                                                 │  │
│  badge │  │                                                 │  │
│        │  │                                                 │  │
│  ────  │  │                                                 │  │
│ Admin  │  │                                                 │  │
│(si rol)│  └─────────────────────────────────────────────────┘  │
├────────┴───────────────────────────────────────────────────────┤
│  Footer (opcional): Status bar — conexión, versión app        │
└────────────────────────────────────────────────────────────────┘
```

### 3.2 Sidebar (Navegación Principal)

**Ancho:** 240px expandido, 64px colapsado (solo iconos).
**Toggle:** Botón hamburguesa o auto-colapso en ventanas pequeñas.

**Secciones:**

```
┌──────────────────────┐
│  ⬡ AccountFlow       │  ← Logo + nombre (oculto al colapsar)
│                      │
│  ▸ Dashboard         │  ← LayoutDashboard icon
│  ▸ Cuentas           │  ← Gamepad2 icon (o Shield)
│  ▸ Mis Alquileres    │  ← Clock icon
│  ▸ Créditos          │  ← Coins icon
│                      │
│  ─────────────────   │  ← Separador
│                      │
│  ▸ Configuración     │  ← Settings icon
│                      │
│  ─────────────────   │  ← Separador (solo si es admin)
│  ADMIN               │  ← Label de sección
│  ▸ Dashboard Admin   │  ← BarChart3 icon
│  ▸ Gestión Cuentas   │  ← Database icon
│  ▸ Gestión Usuarios  │  ← Users icon
│  ▸ Activity Log      │  ← ScrollText icon
│                      │
│  ─────────────────   │
│  ┌────────────────┐  │
│  │ Plan: Basic    │  │  ← Badge del plan actual
│  │ 750 créditos   │  │
│  └────────────────┘  │
│                      │
│  👤 Username ▾       │  ← Avatar + nombre + dropdown (logout, perfil)
└──────────────────────┘
```

**Comportamiento:**
- Item activo: fondo `--accent-primary-muted`, texto `--accent-primary`, borde izquierdo de 3px `--accent-primary`
- Hover: fondo `--surface-hover`
- Transición al colapsar: 200ms ease, los textos hacen fade-out
- El badge del plan usa un gradiente sutil si es Unlimited

### 3.3 Header (Top Bar)

**Altura:** 56px.
**Contenido (izquierda a derecha):**

1. **Título de página** — H3, bold (ej: "Catálogo de Cuentas")
2. **Breadcrumb** (opcional) — Para sub-páginas admin
3. **Spacer** (flex-grow)
4. **Search** (Command+K) — Input con shortcut hint, abre Command Palette
5. **Credit Balance** — Icono de moneda + número en JetBrains Mono, clickeable (va a /credits)
6. **Notificaciones** — Bell icon con dot rojo si hay pendientes
7. **Avatar** — Circular, 32px, dropdown con opciones de cuenta

---

## 4. Pantallas Detalladas

### 4.1 Login / Registro

**Layout:** Centrado, sin sidebar. Fondo con gradiente sutil oscuro o patrón geométrico abstracto.

```
┌────────────────────────────────────────────────┐
│                                                │
│            ⬡ AccountFlow                       │
│            "Tu acceso a todas las cuentas"     │
│                                                │
│    ┌────────────────────────────────────┐      │
│    │                                    │      │
│    │   [Email]                          │      │
│    │   [Password]                       │      │
│    │                                    │      │
│    │   [ Iniciar Sesión ]  ← primary    │      │
│    │                                    │      │
│    │   ── o continuar con ──            │      │
│    │                                    │      │
│    │   [ 🎮 Discord ]  ← outline btn   │      │
│    │                                    │      │
│    │   ¿No tienes cuenta? Regístrate    │      │
│    │                                    │      │
│    └────────────────────────────────────┘      │
│                                                │
│    Fondo: gradiente radial oscuro              │
│    o partículas animadas sutiles               │
│                                                │
└────────────────────────────────────────────────┘
```

**Detalles:**
- Card de login: `--surface` con borde `--border`, border-radius 16px
- Inputs: fondo `--background`, borde `--border`, focus: borde `--accent-primary` con glow sutil
- Botón principal: gradiente de `--accent-primary` a un tono más claro, con hover animado
- Botón Discord: outline con icono de Discord, color #5865F2
- Fondo: puede tener un patrón grid sutil animado o partículas (vibe crypto/tech)
- Logo: grande centrado arriba del card, con glow del accent color
- Opcionalmente: imagen/ilustración lateral en pantallas anchas (split layout)

### 4.2 Dashboard (Home)

**Propósito:** Vista rápida del estado del usuario — créditos, alquileres activos, actividad reciente.

```
┌──────────────────────────────────────────────────────────┐
│  Dashboard                                       🔍 💰 🔔│
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ Créditos │ │ Alquiler │ │ Cuentas  │ │  Plan    │    │
│  │   750    │ │  Activo  │ │ Dispon.  │ │  Basic   │    │
│  │ de 1000  │ │  1 de 1  │ │  87/100  │ │ 23 días  │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
│                                                          │
│  ┌─────────────────────────────────┐ ┌────────────────┐  │
│  │  Alquiler Activo                │ │ Acciones Ráp.  │  │
│  │  ┌───────────────────────────┐  │ │                │  │
│  │  │ SmurfKing123 | Diamond II│  │ │ ▸ Alquilar     │  │
│  │  │ LAN | ⏱ 01:23:45 restant│  │ │ ▸ Comprar      │  │
│  │  │                           │  │ │   créditos     │  │
│  │  │ [Iniciar Sesión] [Liber.]│  │ │ ▸ Ver historial│  │
│  │  └───────────────────────────┘  │ │                │  │
│  └─────────────────────────────────┘ └────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Actividad Reciente                               │    │
│  │  🕐 Hace 2h  Alquilaste "SmurfKing123" por 2h   │    │
│  │  🕐 Hace 1d  Compraste 500 créditos ($5)        │    │
│  │  🕐 Hace 3d  Alquilaste "DiamondSmurf" por 4h   │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Detalles:**
- **Stat cards** (fila superior): 4 cards en grid. Número grande en JetBrains Mono. Icono a la izquierda con fondo `--accent-primary-muted` redondeado. Borde sutil. Hover: elevación sutil.
- **Alquiler activo**: Card destacada con borde `--accent-primary`. Timer grande en monospace. Botones de acción prominentes. Si no hay alquiler activo: estado vacío con CTA "Explorar cuentas".
- **Acciones rápidas**: Links/botones simples con iconos.
- **Actividad reciente**: Lista compacta con icono de evento, timestamp relativo, descripción. Max 5-7 items.

### 4.3 Catálogo de Cuentas (Página Principal del Negocio)

**Propósito:** Browsear, filtrar y alquilar cuentas. Es LA pantalla más importante.

```
┌──────────────────────────────────────────────────────────────┐
│  Catálogo de Cuentas                             🔍 💰 🔔   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ 🔍 Buscar por nombre...  │ Elo ▾│ Server ▾│ Estado ▾│    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  Mostrando 87 cuentas disponibles     [Vista: ☷ Lista | ⊞]  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Nombre          │ Elo        │ LP  │ Server│ Estado   │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │ SmurfKing123    │ 💎 Dia II  │ 45  │ LAN  │ 🟢 Libre │  │
│  │ GoldNova42      │ 🥇 Gold I  │ 78  │ NA   │ 🟢 Libre │  │
│  │ ChallengerAcc   │ 🏆 Chall.  │ 891 │ EUW  │ 🔒 En uso│  │
│  │ IronTest        │ ⬛ Iron IV │ 0   │ LAS  │ 🟡 Semi  │  │
│  │ BannedSmurf     │ 💎 Dia III │ 12  │ BR   │ 🔴 Ban   │  │
│  │ ...             │            │     │      │          │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ← 1 2 3 4 5 ... 10 →  (paginación)                         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Columnas de la tabla:**

| Columna | Contenido | Ancho sugerido |
|---|---|---|
| **Nombre** | Texto + avatar placeholder (letra inicial con color de fondo) | 200px |
| **Elo** | EloBadge (icono + texto + color) | 140px |
| **LP** | Número en monospace | 60px |
| **Servidor** | ServerBadge (pill con código) | 80px |
| **Estado** | StatusIndicator (dot + label) | 120px |
| **Ocupada** | Si está en uso: icono de lock + "En uso" (gris/rojo). Si libre: "Disponible" (verde) | 120px |
| **Ban** | Si baneada: badge rojo "Permanente" o amarillo "Normals". Si no: — | 120px |
| **Acción** | Botón "Alquilar" (primary, deshabilitado si ocupada/baneada) | 100px |

**Filtros:**
- **Elo:** Multi-select con checkboxes, cada opción muestra el EloColor
- **Servidor:** Multi-select con badges
- **Estado:** Select con opciones: Todas, Activas, Inactivas, Semi-activas
- **Disponibilidad:** Toggle "Solo disponibles"

**Vista alternativa — Grid de Cards:**
- Cada cuenta es un AccountCard
- Grid responsivo de 3-4 columnas
- Card muestra: nombre, elo badge, servidor, estado, botón

**Interacción al hacer clic en una cuenta (o botón "Alquilar"):**
→ Abre **AccountDetailModal** (ver 4.3.1)

#### 4.3.1 Modal: Detalle de Cuenta + Alquilar

```
┌──────────────────────────────────────────────┐
│  ✕                                           │
│                                              │
│  SmurfKing123                                │
│  💎 Diamond II — 45 LP                       │
│  🌎 LAN  |  🟢 Activa  |  Disponible        │
│                                              │
│  ─────────────────────────────────────────   │
│                                              │
│  📊 Estadísticas (Riot API)                  │
│  Win Rate: 58%  |  Partidas: 234             │
│  Campeones más jugados:                      │
│  [Yasuo 67%] [Lee Sin 54%] [Ahri 61%]       │
│                                              │
│  ─────────────────────────────────────────   │
│                                              │
│  ⏱ Selecciona duración del alquiler:         │
│                                              │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │
│  │ 30m  │ │  1h  │ │  2h  │ │  4h  │        │
│  │ 25cr │ │ 50cr │ │ 90cr │ │160cr │        │
│  └──────┘ └──────┘ └──────┘ └──────┘        │
│  ┌──────┐ ┌──────┐                           │
│  │  8h  │ │ 24h  │                           │
│  │280cr │ │500cr │                           │
│  └──────┘ └──────┘                           │
│                                              │
│  Tu balance: 750 créditos                    │
│  Después del alquiler: 700 créditos          │
│                                              │
│  [       Alquilar por 50 créditos       ]    │
│                                              │
└──────────────────────────────────────────────┘
```

**Detalles:**
- Opciones de duración: grid de cards seleccionables (radio-like). Seleccionada = borde `--accent-primary` + fondo `--accent-primary-muted`
- Si no tiene suficientes créditos: botón deshabilitado + link "Comprar créditos"
- Botón principal: ancho completo, gradiente accent, tamaño grande
- Si la cuenta está ocupada: todo el modal muestra overlay "En uso por otro usuario" con countdown de cuando se libera (si se sabe)

### 4.4 Mis Alquileres

**Propósito:** Ver alquileres activos (con controles) e historial de pasados.

```
┌──────────────────────────────────────────────────────────┐
│  Mis Alquileres                                  🔍 💰 🔔│
├──────────────────────────────────────────────────────────┤
│                                                          │
│  [Activos (1)]  [Historial (23)]   ← Tabs               │
│                                                          │
│  ── Tab: Activos ────────────────────────────────────    │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  SmurfKing123          💎 Diamond II    🌎 LAN     │  │
│  │                                                    │  │
│  │       ┌─────────────────────┐                      │  │
│  │       │     01:23:45        │  ← Timer grande      │  │
│  │       │     restante        │     monospace         │  │
│  │       └─────────────────────┘                      │  │
│  │                                                    │  │
│  │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░  62% del tiempo usado  │  │
│  │                                                    │  │
│  │  [🎮 Iniciar Sesión]    [🔓 Liberar Cuenta]       │  │
│  │                                                    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ── Tab: Historial ──────────────────────────────────    │
│                                                          │
│  Tabla: Cuenta | Duración | Créditos | Fecha | Estado    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Detalles del alquiler activo:**
- Card grande, prominente, borde `--accent-primary`
- **Timer:** Número grande en JetBrains Mono. Cambia de color:
  - `> 50%` tiempo restante → `--text-primary` (blanco)
  - `25-50%` → `--warning` (amarillo)
  - `< 25%` → `--error` (rojo) + pulso sutil
- **Barra de progreso:** Lineal, colores iguales al timer
- **Botón "Iniciar Sesión":** Botón grande, primary, con icono de gamepad. Al hacer clic: estado loading → "Abriendo Riot Client..." → "Sesión iniciada ✓"
- **Botón "Liberar":** Outline/secondary con confirmación (Alert Dialog)
- Si no hay alquileres activos: empty state con ilustración y CTA "Explorar cuentas"

### 4.5 Créditos

**Propósito:** Ver balance, historial de transacciones, comprar paquetes.

```
┌──────────────────────────────────────────────────────────┐
│  Créditos                                        🔍 💰 🔔│
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │          💰                                        │  │
│  │         750                                        │  │
│  │    créditos disponibles                            │  │
│  │                                                    │  │
│  │    Suscripción: 500  |  Comprados: 250             │  │
│  │    Se recarga en: 23 días                          │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ── Comprar Créditos Extra ──────────────────────────    │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ Starter  │  │ Popular  │  │   Pro    │               │
│  │          │  │   ⭐     │  │          │               │
│  │ 500 cr.  │  │ 1200 cr. │  │ 3000 cr. │               │
│  │   $5     │  │   $10    │  │   $22    │               │
│  │          │  │ Más      │  │ Mejor    │               │
│  │ [Comprar]│  │ vendido  │  │ valor    │               │
│  │          │  │ [Comprar]│  │ [Comprar]│               │
│  └──────────┘  └──────────┘  └──────────┘               │
│                                                          │
│  ── Historial de Transacciones ──────────────────────    │
│                                                          │
│  Fecha       │ Tipo           │ Monto    │ Balance       │
│  Hoy 14:32  │ Alquiler       │ -50      │ 750           │
│  Hoy 10:00  │ Suscripción    │ +1000    │ 800           │
│  Ayer       │ Compra paquete │ +500     │ 300           │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Detalles:**
- **Balance grande:** Número en JetBrains Mono 32px, centrado, con icono de moneda animado (brillo sutil)
- **Desglose:** Texto secundario mostrando créditos de suscripción vs comprados
- **Paquetes:** 3 cards en fila. El "Popular" tiene badge destacado y borde `--accent-secondary`. Hover: scale 1.02 + sombra. Precio en negrita.
- **Historial:** Tabla simple. Montos negativos en `--error`, positivos en `--success`.

### 4.6 Configuración

**Propósito:** Perfil, gestión de plan, preferencias.

**Secciones:**
1. **Perfil** — Avatar, display name, email (readonly), Discord vinculado
2. **Plan** — Plan actual, fecha de renovación, botón "Cambiar plan" / "Cancelar"
3. **Pagos** — Historial de pagos, gestionar método de pago (Stripe Customer Portal)
4. **Preferencias** — Ruta del Riot Client (auto-detect con override manual), notificaciones

### 4.7 Admin: Dashboard

**Propósito:** Métricas del negocio de un vistazo.

```
┌──────────────────────────────────────────────────────────┐
│  Admin Dashboard                                 🔍 💰 🔔│
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐            │
│  │Usuarios│ │Cuentas │ │Alquil. │ │Ingresos│            │
│  │Activos │ │Libres  │ │Activos │ │ Mes    │            │
│  │  12    │ │ 87/100 │ │   5    │ │ $230   │            │
│  │ +3 ↑   │ │        │ │        │ │ +15% ↑ │            │
│  └────────┘ └────────┘ └────────┘ └────────┘            │
│                                                          │
│  ┌─────────────────────────────────────────────────┐     │
│  │ Actividad de Alquileres (últimas 24h)           │     │
│  │ [gráfico de barras o líneas]                    │     │
│  └─────────────────────────────────────────────────┘     │
│                                                          │
│  ┌─────────────────────┐ ┌────────────────────────┐      │
│  │ Cuentas más usadas  │ │ Últimos eventos        │      │
│  │ 1. SmurfKing  (23)  │ │ 🕐 User1 alquiló...   │      │
│  │ 2. DiamondAcc (18)  │ │ 🕐 User2 pagó $10...  │      │
│  │ 3. GoldSmurf  (15)  │ │ 🕐 User3 liberó...    │      │
│  └─────────────────────┘ └────────────────────────┘      │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Detalles:**
- Stat cards con **trend indicators** (↑↓) en verde/rojo
- Gráfico: usar **Chart.js** o **Apache ECharts** con theme oscuro personalizado
- Listas: top 5 cuentas más alquiladas, últimos 5-10 eventos

### 4.8 Admin: Gestión de Cuentas

**Propósito:** CRUD completo de las 100 cuentas.

**Features:**
- Tabla completa con TODAS las columnas (incluyendo las no visibles para usuarios: notas admin, last sync, puuid)
- Botón "Agregar cuenta" → Modal/Sheet con formulario
- Edición inline o modal al hacer clic en una fila
- Acción "Eliminar" con confirmación (Alert Dialog)
- Acción "Forzar liberación" si está en uso
- Botón "Sincronizar Stats" (individual y masivo)
- Búsqueda y filtros avanzados

### 4.9 Admin: Gestión de Usuarios

**Propósito:** Ver y gestionar usuarios.

**Features:**
- Tabla: Display name, email, plan, créditos (sub + comprados), alquileres activos, último login
- Acciones por usuario:
  - Ajustar créditos (+/-) con motivo (para pagos crypto manuales)
  - Cambiar plan manualmente
  - Ver actividad del usuario (filtra activity log)
  - Deshabilitar cuenta

### 4.10 Admin: Activity Log

**Propósito:** Registro cronológico de todos los eventos.

**Features:**
- Tabla paginada con filtros:
  - Por usuario
  - Por tipo de evento
  - Por rango de fechas
- Cada entrada muestra: timestamp, usuario, tipo de evento (con icono y color), descripción, metadata expandible (JSON viewer)
- Auto-refresh cada 30s o realtime

---

## 5. Animaciones y Micro-interacciones

### 5.1 Librería de Animaciones

**@vueuse/motion** — Directiva `v-motion` para Vue 3. Ligera, declarativa.

### 5.2 Catálogo de Animaciones

| Elemento | Animación | Duración |
|---|---|---|
| **Page transitions** | Fade + slide-up sutil (8px) | 200ms ease-out |
| **Modal open** | Scale de 0.95 a 1 + fade | 200ms ease-out |
| **Modal close** | Scale de 1 a 0.95 + fade-out | 150ms ease-in |
| **Card hover** | Translate Y -2px + border color change | 150ms ease |
| **Button hover** | Brightness 1.1 + scale 1.02 | 100ms ease |
| **Button click** | Scale 0.98 | 80ms ease |
| **Toast enter** | Slide-in from right + fade | 300ms spring |
| **Toast exit** | Slide-out to right + fade | 200ms ease |
| **Sidebar collapse** | Width transition + icon fade | 200ms ease |
| **Table row hover** | Background color fade | 100ms ease |
| **EloGlow** | Pulsating box-shadow en badges de elo alto | 2s infinite ease-in-out |
| **Timer critical** | Pulsation del texto cuando < 25% | 1s infinite ease-in-out |
| **Credit counter** | Count-up animation al cargar | 800ms ease-out |
| **Skeleton loading** | Shimmer gradient animation | 1.5s infinite linear |
| **Status dot** | Pulsation sutil para "activo" | 2s infinite ease-in-out |
| **Lock/unlock** | Icono de candado rota/agita al lockear | 300ms spring |

### 5.3 Principios

- **No más de 300ms** para transiciones de UI (excepto loading states)
- **Ease-out** para entradas, **ease-in** para salidas
- **Spring** para elementos que necesitan "bounce" sutil (toasts, modales)
- Respetar `prefers-reduced-motion` — deshabilitar animaciones si el usuario lo prefiere
- Las animaciones deben sentirse **fluidas, no llamativas**. Nada debe distraer del contenido.

---

## 6. Estados Especiales

### 6.1 Loading States
- **Skeleton screens** para tablas y cards (no spinners genéricos)
- Shimmer effect con gradiente de `--surface` a `--surface-hover` a `--surface`
- Los skeletons deben respetar la forma del contenido real

### 6.2 Empty States
Cada página debe tener un estado vacío atractivo:
- **Sin alquileres:** Ilustración + "Aún no has alquilado ninguna cuenta" + CTA "Explorar cuentas"
- **Sin créditos:** Ilustración + "Te quedaste sin créditos" + CTA "Comprar paquete"
- **Sin resultados (filtro):** "No se encontraron cuentas con esos filtros" + "Limpiar filtros"

### 6.3 Error States
- **Conexión perdida:** Banner top con fondo `--warning`, "Reconectando..."
- **Error de servidor:** Toast con `--error`, mensaje descriptivo
- **Pago fallido:** Modal con explicación + retry

### 6.4 Tooltips y Ayuda
- Tooltips en iconos que no sean obvios
- Primer uso: opcional onboarding tour (highlight de 3-4 features clave)

---

## 7. Custom Title Bar (Frameless Window)

Electron permite ventanas frameless con title bar custom para un look más pulido.

```
┌────────────────────────────────────────────────────┐
│ ⬡ AccountFlow              ─  □  ✕                │
└────────────────────────────────────────────────────┘
```

- **Fondo:** `--background-secondary`
- **Drag region:** Todo el title bar es draggable excepto los botones
- **Botones de ventana:** Custom styled (minimizar, maximizar, cerrar)
  - Hover: minimizar/maximizar → fondo `--surface-hover`
  - Hover: cerrar → fondo `--error`
- **Logo + nombre:** A la izquierda, pequeño
- **Altura:** 32px

---

## 8. Responsividad (dentro de Electron)

Aunque es una app de escritorio, la ventana puede ser redimensionada.

| Breakpoint | Ancho | Comportamiento |
|---|---|---|
| **Compact** | < 900px | Sidebar colapsada (solo iconos), tablas con scroll horizontal |
| **Normal** | 900-1200px | Layout estándar |
| **Wide** | > 1200px | Grid de cards con más columnas, más espacio |

**Tamaño mínimo de ventana:** 800 x 600px
**Tamaño recomendado:** 1280 x 800px

---

## 9. Resumen de Librerías UI

| Librería | Propósito | Link |
|---|---|---|
| **shadcn-vue** | Componentes base (Button, Input, Table, Modal, etc.) | https://www.shadcn-vue.com/ |
| **TailwindCSS 4** | Utility-first CSS framework | https://tailwindcss.com/ |
| **Lucide Vue Next** | Iconos | https://lucide.dev/ |
| **@vueuse/motion** | Animaciones declarativas | https://motion.vueuse.org/ |
| **VueUse** | Composables utilitarios | https://vueuse.org/ |
| **TanStack Table (Vue)** | Tabla avanzada con sorting, filtering, pagination | https://tanstack.com/table |
| **Chart.js + vue-chartjs** | Gráficos para dashboards admin | https://vue-chartjs.org/ |
| **Inter** | Fuente principal | https://rsms.me/inter/ |
| **JetBrains Mono** | Fuente monospace para datos | https://www.jetbrains.com/lp/mono/ |

---

## 10. Entregables Esperados del Diseñador

1. **Design System en Figma** — Tokens de color, tipografía, espaciado, componentes base
2. **Pantallas de alta fidelidad** — Todas las páginas listadas en sección 4
3. **Estados** — Hover, active, disabled, loading, error, empty para cada componente
4. **Prototipo interactivo** — Flujo de alquiler completo (catálogo → modal → timer → liberar)
5. **Especificación de animaciones** — Timing y easing para cada transición
6. **Assets exportables** — Iconos custom (si aplica), logo, favicon en formato SVG/PNG
