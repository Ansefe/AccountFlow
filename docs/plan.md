# AccountFlow — Plan de Proyecto Definitivo

Plan final para construir **AccountFlow**: sistema de gestión y alquiler de cuentas de LoL como app de escritorio Windows con Electron + Vue 3, backend en Supabase, modelo de suscripción + créditos, distribución privada (~100 cuentas, grupo de amigos).

---

## 1. Decisiones Confirmadas

| Decisión | Valor |
|---|---|
| Nombre | **AccountFlow** |
| Lenguaje | **TypeScript** |
| Framework desktop | **Electron** (ver sección 2 para justificación vs Tauri) |
| Framework UI | **Vue 3** + Composition API |
| Backend | **Supabase** (PostgreSQL + Auth + Edge Functions + Realtime) |
| Distribución | **Privada** (grupo de amigos, ~100 cuentas propias) |
| Panel admin | **Dentro de la misma app** (role-based) |
| Landing page | **No** (por ahora) |
| Riesgo legal | **Aceptado** por el usuario |

---

## 2. Electron vs Tauri — Por qué Electron

Tauri 2.0 es excelente (apps más livianas ~10MB vs ~150MB, menor RAM, Rust backend), pero **Electron gana para este proyecto** por estas razones:

| Aspecto | Electron | Tauri |
|---|---|---|
| **UI Automation (auto-login LoL)** | ✅ nut.js nativo en Node.js | ❌ Requiere escribir Rust o FFI complejo |
| **Ecosistema Node.js** | ✅ child_process, tasklist, etc. | ⚠️ Hay que usar Rust o Tauri commands |
| **Tu experiencia (JS/TS)** | ✅ Todo en JS/TS | ❌ Necesitas aprender Rust para el backend |
| **Monitoreo de procesos Windows** | ✅ Librerías maduras en npm | ⚠️ Posible pero en Rust |
| **Tamaño de app** | ❌ ~150MB | ✅ ~10MB |
| **RAM** | ❌ ~100-200MB | ✅ ~30-50MB |

**Veredicto:** La feature crítica es el auto-login con nut.js y el control de procesos de Windows. Esto es trivial en Electron (Node.js nativo) y complejo en Tauri (requiere Rust). Como distribuyes a amigos, el tamaño extra de Electron no es problema.

> **Nota para el futuro:** Si en algún momento quieres migrar a Tauri, la capa de Vue 3 (renderer) se reutiliza al 100%. Solo reescribirías el Main Process en Rust.

---

## 3. Riot Vanguard y Auto-Login — ¿Es seguro?

**Respuesta corta: Sí, es seguro. No debería haber problemas.**

Riot Vanguard es un anti-cheat a nivel kernel (ring 0) enfocado en:
- Lectura/escritura de memoria del juego (cheats, wallhacks, aimbots)
- Modificación de archivos del juego
- Hooks de funciones del juego

Lo que **NO** detecta ni le interesa:
- Simulación de teclado estándar (`SendInput` / `keybd_event`) en la **pantalla de login del Riot Client**
- Automatización de la UI del launcher (que es una app Electron/Chromium separada del juego)
- Herramientas como RiotAutoLogin y League-Pass-Manager llevan **años** funcionando sin detecciones

**¿Por qué?**
- El auto-login ocurre en el **Riot Client** (launcher), no dentro del juego
- Vanguard protege el **proceso del juego**, no el launcher
- Usamos APIs estándar del SO para simular input (mismo mecanismo que cualquier password manager)
- No inyectamos código ni modificamos procesos

**Precaución:** No simular input dentro del juego (in-game). Solo en la pantalla de login del Riot Client.

---

## 4. Code Signing — ¿Es necesario?

**No es necesario para distribución privada.** Puedes enviar el instalador directamente.

Lo que pasa sin code signing:
- **Windows SmartScreen** mostrará un aviso: *"Windows protegió tu equipo"*
- Tus amigos hacen clic en *"Más información"* → *"Ejecutar de todas formas"*
- Si envías el `.exe` por USB/link directo (no descarga del navegador), a veces ni aparece

**¿Cuándo sería necesario?**
- Si distribuyes públicamente a desconocidos (genera desconfianza)
- Si quieres publicar en una tienda de apps
- Si quieres evitar que antivirus lo marquen como sospechoso

**Decisión: Omitir code signing.** Ahorro de $70-200/año. Les dices a tus amigos que ignoren el aviso.

---

## 5. Riot API — Estrategia de Registro

### Tipos de API Key:

| Tipo | Expiración | Uso | Aprobación |
|---|---|---|---|
| **Development** | Cada 24h | Desarrollo/testing | ❌ Automática (solo crear cuenta) |
| **Personal** | No expira | Proyectos personales/pequeños | ✅ Requiere aplicar, aprobación ligera |
| **Production** | No expira | Apps públicas con usuarios | ✅ Requiere app funcional, website, ToS |

### Estrategia recomendada (dos apps separadas):

**App 1 — "AccountFlow Stats" (registro en Developer Portal)**
- Registrar como un **stats tracker / account manager personal**
- Descripción: "Tool to track ranked stats, elo changes, and match history for personal accounts"
- Solicitar una **Personal Key** (no production, no necesitas website)
- Uso: sincronizar elo, LP, historial de partidas de tus 100 cuentas
- **No mencionar** lending, sharing, ni nada comercial

**App 2 — AccountFlow (la app principal)**
- No requiere registro en Riot porque no usa la API directamente
- Consume los datos ya sincronizados en la base de datos por la App 1
- La API se llama desde **Edge Functions de Supabase** (backend), nunca desde el cliente

### Rate limits con Personal Key:
- 20 requests/segundo, 100 requests/2 minutos
- Para 100 cuentas sincronizando 1 vez/hora = ~100 requests/hora = **holgado**

### Alternativa sin Riot API:
Si no quieres lidiar con el registro, puedes obtener stats vía web scraping de **op.gg** o **u.gg**. Es menos elegante pero funciona como fallback.

---

## 6. Cripto como Método de Pago

La política de Riot dice "no cryptocurrencies" para productos que usen su API. **Pero:**

- La funcionalidad de pagos está en **AccountFlow** (la app principal), no en el stats tracker registrado con Riot
- Para distribución privada entre amigos, Riot no va a auditar tu sistema de pagos
- Los fees de Stripe (2.9% + $0.30) y PayPal (2.9% + $0.30) son estándar

### Si quieres ofrecer cripto igualmente:

| Gateway | Fee | Monedas | Complejidad |
|---|---|---|---|
| **NOWPayments** | 0.5% | 300+ | Baja (API simple) |
| **CoinGate** | 1% | 70+ | Baja |
| Directo (wallet) | 0% (solo gas) | Manual | Mínima |

**Recomendación pragmática para grupo de amigos:**
1. **Stripe** como principal (tarjetas)
2. **Cripto directo** — Tus amigos te envían USDT/USDC a tu wallet, tú ajustas créditos manualmente desde el admin panel. Sin gateway, sin fees, sin integración compleja.
3. **PayPal** — Dejarlo para Fase 3 si alguien lo necesita.

Esto es más realista para un grupo pequeño. Si escalas a público, ahí sí integras NOWPayments.

---

## 7. Stack Tecnológico Definitivo

### 7.1 App de Escritorio
- **Electron 33+** — Runtime
- **electron-vite** — Build tool (soporte nativo Vue)
- **Vue 3** + Composition API + `<script setup>` — Framework UI
- **TypeScript** — Tipado estático
- **Vue Router** — Navegación
- **Pinia** — State management
- **TailwindCSS 4** — Estilos utility-first
- **shadcn-vue** (Radix Vue) — Componentes UI
- **Lucide Icons** — Iconografía
- **VueUse** — Composables utilitarios
- **@vueuse/motion** — Animaciones
- **nut.js** — UI Automation (auto-login LoL)
- **electron-updater** — Auto-updates

### 7.2 Backend (Supabase)
- **PostgreSQL** — Base de datos
- **Supabase Auth** — Login (email/password + Discord OAuth)
- **Supabase Realtime** — Estado de cuentas en tiempo real
- **Supabase Edge Functions** (Deno/TypeScript) — Lógica serverless
- **Supabase RLS** — Seguridad a nivel de fila

### 7.3 Integraciones
- **Stripe** — Pagos (suscripciones + créditos)
- **Riot Games API** — Stats/elo (via Edge Functions)
- **Discord OAuth2** — Login social

---

## 8. Arquitectura de la Aplicación

```
┌──────────────────────────────────────────────────┐
│                 ELECTRON APP                      │
│  ┌────────────────────────────────────────────┐   │
│  │           RENDERER (Vue 3 + TS)            │   │
│  │  ┌───────┐ ┌────────┐ ┌───────┐ ┌──────┐  │   │
│  │  │ Login │ │Catálogo│ │Alquil.│ │Admin │  │   │
│  │  │       │ │Cuentas │ │Activos│ │Panel │  │   │
│  │  └───────┘ └────────┘ └───────┘ └──────┘  │   │
│  └────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────┐   │
│  │           MAIN PROCESS (Node.js + TS)      │   │
│  │  • Auto-login LoL (nut.js)                 │   │
│  │  • Monitoreo proceso LoL (child_process)   │   │
│  │  • Cierre automático del cliente           │   │
│  │  • Desencriptación de credenciales         │   │
│  │  • Auto-updates (electron-updater)         │   │
│  │  • Heartbeat → Supabase                    │   │
│  └────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────┐   │
│  │           PRELOAD (Bridge seguro)          │   │
│  │  • IPC tipado Renderer ↔ Main              │   │
│  │  • contextBridge API segura                │   │
│  └────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
                │                    ▲
                ▼                    │ (Realtime WebSocket)
┌──────────────────────────────────────────────────┐
│                   SUPABASE                        │
│  ┌───────────┐ ┌──────────┐ ┌────────────────┐   │
│  │PostgreSQL │ │  Auth    │ │ Edge Functions │   │
│  │ (DB+RLS)  │ │(Discord) │ │ • Stripe hook  │   │
│  │           │ │          │ │ • Riot sync    │   │
│  │           │ │          │ │ • Heartbeat    │   │
│  │           │ │          │ │ • Rental logic │   │
│  └───────────┘ └──────────┘ └────────────────┘   │
│  ┌───────────┐                                    │
│  │ Realtime  │ (broadcast estado de cuentas)      │
│  └───────────┘                                    │
└──────────────────────────────────────────────────┘
          │                         │
          ▼                         ▼
  ┌──────────────┐          ┌──────────────┐
  │   Stripe     │          │  Riot API    │
  │  (Payments)  │          │ (Stats/Elo)  │
  └──────────────┘          └──────────────┘
```

---

## 9. Modelo de Base de Datos (PostgreSQL / Supabase)

### Tablas:

**`profiles`** (extiende auth.users de Supabase)
- id (UUID, PK, ref → auth.users)
- display_name, avatar_url
- discord_id (nullable)
- subscription_credits (integer, default 0) — créditos del plan mensual
- purchased_credits (integer, default 0) — créditos comprados (no expiran)
- role (enum: 'user', 'admin', default 'user')
- plan_type (enum: 'none', 'basic', 'unlimited')
- plan_expires_at (timestamptz)
- stripe_customer_id (text, nullable)
- last_heartbeat_at (timestamptz)
- created_at, updated_at

**`accounts`** (cuentas de LoL — ~100 iniciales)
- id (UUID, PK)
- name (nombre visible en el catálogo)
- riot_username, riot_tag
- encrypted_password (AES-256, desencriptado solo en Edge Functions)
- server (enum: NA, EUW, EUNE, LAN, LAS, BR, KR, JP, OCE, TR, RU, PH, SG, TW, TH, VN)
- elo (enum: Iron → Challenger)
- elo_division (1-4, nullable para Master+)
- lp (integer)
- status (enum: 'active', 'inactive', 'semi_active')
- is_banned (boolean, default false)
- ban_type (enum: null, 'permanent', 'normals_required')
- puuid (text, Riot API identifier)
- current_rental_id (UUID, FK → rentals, nullable) — si está ocupada
- last_stats_sync (timestamptz)
- notes (text, nullable) — notas admin
- created_at, updated_at

**`account_credentials`** (credenciales sensibles 1:1 por cuenta)
- account_id (UUID, PK, FK → accounts.id)
- login_username (text) — usuario/email real de login
- encrypted_password (text)
- created_at, updated_at

Regla operativa de producción:
- `account_credentials` es la fuente correcta para login (source of truth).
- `accounts.encrypted_password` se mantiene como legacy temporal solo durante migración/backfill.
- Al finalizar backfill, el flujo de login debe depender únicamente de `account_credentials`.

**`rentals`**
- id (UUID, PK)
- user_id (FK → profiles)
- account_id (FK → accounts)
- credits_spent (integer)
- matches_total (integer, nullable) — número de partidas compradas
- matches_used (integer, default 0) — partidas consumidas hasta ahora
- last_match_at (timestamptz, nullable) — timestamp de la última partida detectada
- duration_minutes (integer, nullable) — legacy (ya no se usa en nuevas rentas)
- started_at (timestamptz)
- expires_at (timestamptz, nullable) — legacy (ya no se usa en nuevas rentas)
- ended_at (timestamptz, nullable)
- status (enum: 'active', 'expired', 'cancelled', 'force_released', 'completed')

**`rental_matches`** (log de partidas individuales por rental)
- id (UUID, PK)
- rental_id (FK → rentals)
- match_id (text, NOT NULL) — ID de Riot (e.g. "LA1_12345")
- game_mode (text, nullable) — CLASSIC, ARAM, etc.
- champion (text, nullable) — campeón usado
- win (boolean, nullable)
- duration_secs (integer, nullable)
- detected_at (timestamptz)
- UNIQUE(rental_id, match_id) — evita doble conteo

**`credit_transactions`**
- id (UUID, PK)
- user_id (FK → profiles)
- amount (integer, + o -)
- balance_type (enum: 'subscription', 'purchased') — de cuál pool se afectó
- type (enum: 'subscription_grant', 'subscription_reset', 'rental_spend', 'package_purchase', 'admin_adjustment', 'refund')
- reference_id (UUID, nullable)
- description (text)
- created_at

**`payments`**
- id (UUID, PK)
- user_id (FK → profiles)
- provider (enum: 'stripe', 'manual_crypto')
- provider_payment_id (text, nullable)
- amount_usd (decimal)
- type (enum: 'subscription', 'credit_package')
- status (enum: 'pending', 'completed', 'failed', 'refunded')
- metadata (JSONB) — info extra (wallet address para crypto, etc.)
- created_at

**`credit_packages`**
- id (UUID, PK)
- name, description
- credits (integer)
- price_usd (decimal)
- is_active (boolean)

**`activity_log`**
- id (UUID, PK)
- user_id (FK → profiles, nullable — para eventos de sistema)
- event_type (enum: 'login', 'logout', 'rental_start', 'rental_end', 'rental_force_release', 'payment_completed', 'plan_change', 'credit_purchase', 'account_login_launched', 'app_closed', 'heartbeat_timeout', 'admin_action')
- metadata (JSONB) — detalles contextuales
- ip_address (inet, nullable)
- created_at

**`app_settings`**
- key (text, PK)
- value (JSONB)
- updated_at

---

## 10. Modelo de Negocio y Créditos

### Planes
| Plan | Precio | Créditos/mes | Detalle |
|---|---|---|---|
| **Free** | $0 | 0 | Ver catálogo, no alquilar |
| **Basic** | $10/mes | 1,000 | Acceso a todas las cuentas |
| **Unlimited** | $30/mes | ∞ | Sin límite de créditos |

### Costos de alquiler (por partidas)
| Partidas | Créditos |
|---|---|
| 1 partida | 20 |
| 3 partidas | 55 |
| 5 partidas | 85 |
| 10 partidas | 150 |

> Precios configurables en `app_settings` key `match_packages` (JSONB: `{"matches": credits}`)

### Paquetes de créditos extra
| Paquete | Créditos | Precio |
|---|---|---|
| Starter | 500 | $5 |
| Popular | 1,200 | $10 |
| Pro | 3,000 | $22 |

### Reglas
- Créditos de suscripción: se **resetean** el día de renovación (no acumulan)
- Créditos comprados: **sí acumulan**, no expiran
- Al gastar: primero se consumen créditos de suscripción, luego los comprados
- Plan Unlimited: alquiler directo sin deducción de créditos

---

## 11. Métodos de Pago

| Método | Prioridad | Implementación |
|---|---|---|
| **Stripe** | Principal | Checkout integrado, suscripciones, webhooks |
| **Cripto (manual)** | Secundario | Amigo envía USDT/USDC → Admin ajusta créditos manualmente |
| **PayPal** | Fase 3 | Si lo piden |

Para un grupo de amigos, Stripe + cripto manual es suficiente. PayPal se integra después si hay demanda.

---

## 12. Flujos de Usuario

### 12.1 Login
1. App abre → Pantalla de login
2. Email+Password o Discord OAuth (Supabase Auth)
3. Post-login → Dashboard

### 12.2 Alquilar cuenta (modelo por partidas)
1. Catálogo → Filtrar por elo, servidor, estado
2. Seleccionar cuenta disponible
3. Elegir paquete de partidas (1, 3, 5, 10) → Confirmar
4. Se descuentan créditos → Cuenta marcada como "ocupada" (Realtime)
5. Botón **"Iniciar Sesión"** disponible
6. Click → Main Process abre Riot Client + auto-login
7. UI muestra: partidas usadas / partidas totales, historial de matches en tiempo real
8. Cada ~3 min el server (Edge Function `check-rental-matches`) consulta Riot Match-v5 API
9. Al detectar nueva partida → se inserta en `rental_matches`, se incrementa `matches_used`
10. Realtime (Supabase) actualiza la UI del cliente automáticamente

### 12.3 Fin de alquiler
- **Manual:** "Liberar cuenta" → Cierre automático del cliente LoL
- **Todas las partidas consumidas:** `matches_used >= matches_total` → status `completed`, cierre automático + toast
- **Inactividad (idle timeout):** si no juega ninguna partida en N minutos (configurable, default 60 min), liberación automática con reembolso proporcional de créditos
  - Fórmula de reembolso: `floor((matches_remaining / matches_total) * credits_spent)`
  - El reembolso se acredita en `purchased_credits` (no expiran)
  - Se registra `credit_transaction` tipo `refund`
- **App cerrada:** `before-quit` → `taskkill` Riot Client → Supabase update (cuenta sigue activa, idle timeout eventual)
- **Heartbeat:** Solo para observabilidad admin. NO libera cuentas.

> **Nota:** El idle timeout es configurable en `app_settings` key `idle_timeout_minutes` (default 60).

### 12.4 Auto-Login (Main Process)
1. Edge Function desencripta credenciales → envía al Main Process vía IPC
2. Main Process busca/lanza `RiotClientServices.exe`
3. **nut.js** espera ventana de login → escribe username → Tab → password → Enter
4. Credenciales se limpian de memoria inmediatamente
5. Monitor de proceso: detecta si el Riot Client se cierra externamente

---

## 13. Panel de Administración (dentro de la app)

### Funcionalidades:
- **CRUD de cuentas** — Agregar, editar, eliminar las 100 cuentas
- **Dashboard** — Cuentas activas, usuarios conectados, créditos en circulación
- **Usuarios** — Ver todos, ajustar créditos, cambiar planes, registrar pagos crypto manuales
- **Alquileres** — Ver activos, forzar liberación
- **Activity Log** — Eventos de todos los usuarios
- **Riot API Sync** — Botón para sincronizar elo/stats de todas las cuentas
- **Configuración** — Precios, duraciones, feature flags

### Acceso:
- Campo `role = 'admin'` en `profiles`
- RLS de Supabase bloquea todo lo que no sea del usuario (excepto admin)
- Vue Router guard en rutas `/admin/*`

---

## 14. Riot Games API

### Endpoints:
- `GET /riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}` — PUUID
- `GET /lol/league/v4/entries/by-summoner/{id}` — Elo/LP
- `GET /lol/match/v5/matches/by-puuid/{puuid}/ids?startTime={epoch}` — IDs de partidas desde cierto timestamp
- `GET /lol/match/v5/matches/{matchId}` — Detalle de partida (campeón, win, duración, modo)

### Routing regional para Match-v5:
| Servidor AccountFlow | Riot Regional Route |
|---|---|
| NA, LAN, LAS, BR, OCE | `americas.api.riotgames.com` |
| EUW, EUNE, TR, RU | `europe.api.riotgames.com` |
| KR, JP | `asia.api.riotgames.com` |
| PH, SG, TW, TH, VN | `sea.api.riotgames.com` |

### Estrategia:
- **Personal Key** (no expira, aprobación ligera) registrada como "stats tracker"
- **Sync de stats:** Edge Function cron: 100 cuentas × 1 vez/hora = ~100 req/hora
- **Tracking de partidas (NUEVO):** Edge Function `check-rental-matches` cada 3 min vía GitHub Actions cron
  - Solo consulta partidas de cuentas con rental activo (no las 100)
  - Por cada rental activo: 1 req (matchIds) + N req (matchDetail por nuevo match)
  - Caso típico: 5-10 rentals activos × 1 req = 5-10 req/3min = **muy dentro de límites**
- Datos cacheados en tablas `accounts` (stats) y `rental_matches` (partidas)
- **Costo: $0**
- **Env var requerida:** `RIOT_API_KEY` en Supabase Edge Function secrets

---

## 14.1 Arquitectura de Tracking de Partidas (Match-Based Rentals)

### Flujo completo

```
                                  ┌─────────────────┐
                                  │  GitHub Actions  │
                                  │  cron */3 min    │
                                  └────────┬────────┘
                                           │ POST
                                           ▼
                                  ┌─────────────────┐
                                  │ check-rental-    │
                                  │ matches (Edge Fn)│
                                  └────────┬────────┘
                            ┌──────────────┼──────────────┐
                            ▼              ▼              ▼
                   ┌──────────────┐ ┌─────────────┐ ┌────────────┐
                   │ Supabase DB  │ │  Riot API   │ │  Refund    │
                   │ rentals      │ │ Match-v5    │ │  Logic     │
                   │ rental_match │ │ matchIds +  │ │            │
                   │ accounts     │ │ matchDetail │ │            │
                   └──────────────┘ └─────────────┘ └────────────┘
```

### Ciclo cada 3 minutos:
1. **Listar** todos los `rentals` con `status = 'active'` y `matches_total IS NOT NULL`
2. Para cada rental, obtener `puuid` y `server` de la tabla `accounts`
3. **Consultar Riot API** `Match-v5/matches/by-puuid/{puuid}/ids?startTime={rental.started_at}`
4. **Comparar** con `rental_matches` ya registradas → filtrar solo las nuevas
5. Para cada match nuevo → `Match-v5/matches/{matchId}` para detalle (campeón, win, duración, modo)
6. **Insertar** en `rental_matches` + incrementar `matches_used` + actualizar `last_match_at`
7. **Si `matches_used >= matches_total`:** marcar rental como `completed`, liberar cuenta, log
8. **Si idle timeout excedido** (última actividad + N min < ahora): `force_released`, refund proporcional, log

### Rate limits Riot API:
- Personal Key: **20 req/s, 100 req/2min**
- Caso típico: 5 rentals activos × (1 matchIds + ~1 matchDetail) = ~10 req/3min = **holgadísimo**
- Caso extremo: 20 rentals activos × 3 matches nuevos c/u = ~80 req/3min = **aún dentro de límites**

### Reembolso proporcional:
```
credits_refund = floor((matches_remaining / matches_total) * credits_spent)
```
- Se acredita en `purchased_credits` (no expiran)
- Se registra `credit_transaction` tipo `refund`

---

## 15. Estructura del Proyecto

```
accountflow/
├── electron.vite.config.ts
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── tsconfig.web.json
├── .env.example
├── .gitignore
├── README.md
│
├── src/
│   ├── main/                        # Electron Main Process
│   │   ├── index.ts                 # Entry, window management
│   │   ├── ipc/
│   │   │   ├── auth.ipc.ts          # Auth IPC handlers
│   │   │   ├── lol-client.ipc.ts    # Auto-login IPC
│   │   │   ├── rentals.ipc.ts       # Rental lifecycle IPC
│   │   │   └── system.ipc.ts        # App lifecycle, heartbeat
│   │   ├── services/
│   │   │   ├── lol-launcher.ts      # nut.js automation
│   │   │   ├── process-monitor.ts   # Watch LoL process
│   │   │   └── heartbeat.ts         # Ping Supabase
│   │   └── utils/
│   │       └── crypto.ts            # AES-256 decrypt
│   │
│   ├── preload/
│   │   └── index.ts                 # contextBridge, typed IPC
│   │
│   └── renderer/                    # Vue 3 App
│       ├── index.html
│       └── src/
│           ├── App.vue
│           ├── main.ts
│           ├── assets/styles/
│           │   └── globals.css
│           ├── components/
│           │   ├── ui/              # shadcn-vue
│           │   ├── layout/
│           │   │   ├── AppLayout.vue
│           │   │   ├── Sidebar.vue
│           │   │   └── Header.vue
│           │   ├── accounts/
│           │   │   ├── AccountTable.vue
│           │   │   ├── AccountFilters.vue
│           │   │   ├── AccountDetailModal.vue
│           │   │   └── RentalTimer.vue
│           │   ├── credits/
│           │   │   ├── CreditBalance.vue
│           │   │   ├── CreditHistory.vue
│           │   │   └── CreditPackages.vue
│           │   └── admin/
│           │       ├── AdminDashboard.vue
│           │       ├── AccountManager.vue
│           │       ├── UserManager.vue
│           │       └── ActivityLog.vue
│           ├── composables/
│           │   ├── useAuth.ts
│           │   ├── useAccounts.ts
│           │   ├── useCredits.ts
│           │   ├── useRentals.ts
│           │   └── useRealtime.ts
│           ├── stores/
│           │   ├── auth.store.ts
│           │   ├── accounts.store.ts
│           │   └── rentals.store.ts
│           ├── pages/
│           │   ├── LoginPage.vue
│           │   ├── DashboardPage.vue
│           │   ├── AccountsPage.vue
│           │   ├── MyRentalsPage.vue
│           │   ├── CreditsPage.vue
│           │   ├── SettingsPage.vue
│           │   └── admin/
│           │       ├── AdminDashboardPage.vue
│           │       ├── AdminAccountsPage.vue
│           │       ├── AdminUsersPage.vue
│           │       └── AdminActivityPage.vue
│           ├── router/
│           │   └── index.ts
│           ├── lib/
│           │   ├── supabase.ts
│           │   └── utils.ts
│           └── types/
│               ├── database.ts      # Supabase generated types
│               ├── ipc.ts           # IPC channel types
│               └── index.ts
│
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   ├── functions/
│   │   ├── stripe-webhook/index.ts
│   │   ├── sync-riot-stats/index.ts
│   │   ├── process-rental/index.ts
│   │   ├── decrypt-credentials/index.ts
│   │   ├── heartbeat-ping/index.ts       # Observability only
│   │   ├── heartbeat-check/index.ts      # Observability only (no release)
│   │   └── check-rental-matches/index.ts # Match tracking + idle timeout + refund
│   └── seed.sql
│
├── build/                           # electron-builder config
│   └── icon.ico
│
└── docs/
    └── ui-spec.md                   # Spec para diseñador (se creará)
```

---

## 16. Consideraciones de Seguridad

- **Credenciales LoL:** AES-256 en DB. Edge Function `decrypt-credentials` solo accesible con rental activo válido. Credenciales van al Main Process vía IPC, nunca al Renderer.
- **RLS:** Usuarios solo ven sus propios datos + datos públicos de cuentas (sin passwords). Admin bypasses controlados.
- **API Keys:** En Supabase env vars, nunca en el cliente.
- **Stripe Webhooks:** Validación de firma con `stripe-signature` header.
- **Heartbeat:** Solo observabilidad para admin panel. No libera cuentas — el ciclo de vida lo maneja `check-rental-matches` (idle timeout + partidas consumidas).
- **IPC seguro:** `contextIsolation: true`, `nodeIntegration: false`. Solo APIs explícitas vía `contextBridge`.

---

## 17. Viabilidad Económica (Actualizada)

| Concepto | Costo |
|---|---|
| Supabase Free Tier | $0 (500MB DB, suficiente para MVP) |
| Stripe fees | 2.9% + $0.30/transacción |
| Code signing | $0 (no necesario, distribución privada) |
| Dominio | $0 (no necesario sin landing page) |
| Riot API | $0 |
| **Total para arrancar** | **$0** |

Breakeven: literalmente el primer pago de $10 de un amigo ya genera ingreso neto (~$9.41 después de Stripe).

---

## 18. Fases de Desarrollo

### Fase 1 — MVP (4-6 semanas)
- [ ] Setup: electron-vite + Vue 3 + TS + Tailwind + shadcn-vue
- [ ] Supabase: schema completo, RLS, auth (email + Discord)
- [ ] Login/Register page
- [ ] Catálogo de cuentas (tabla con filtros + realtime)
- [ ] Sistema de créditos (lógica completa)
- [ ] Flujo de alquiler (lock/unlock sin auto-login)
- [ ] Panel admin (CRUD cuentas, gestión usuarios)
- [ ] Activity log

### Fase 2 — Core (3-4 semanas)
- [ ] Auto-login LoL con nut.js
- [ ] Cierre automático del cliente al cerrar app / liberar rental (incluye auto-liberación)
- [ ] ~~Heartbeat system~~ → Solo observabilidad (no libera cuentas)
- [ ] Tracking de partidas por rental (Edge Function `check-rental-matches` + Riot Match-v5 API)
- [ ] Idle timeout configurable con reembolso proporcional
- [ ] Integración Stripe (suscripciones + créditos)
- [ ] Sincronización Riot API (elo, stats)
- [ ] Auto-updates (electron-updater + GitHub Releases)
- [x] Tracking por partidas — migración `004_match_based_rentals.sql` + Edge Function `check-rental-matches`
- [x] Regla de inactividad configurada en `app_settings.idle_timeout_minutes`

### Fase 3 — Polish (2-3 semanas)
- [ ] Dashboard métricas admin
- [ ] Notificaciones in-app (alquiler por expirar, créditos bajos)
- [ ] Toast global al liberar/expirar rental + cierre automático del cliente
- [ ] Ajuste manual de créditos para pagos crypto
- [ ] Onboarding flow
- [ ] Integración PayPal (si hay demanda)
- [ ] Testing E2E

### Fase 4 — Post-Launch
- [ ] Soporte para otros juegos (Valorant, etc.)
- [ ] NOWPayments para crypto automatizado (si escala)
- [ ] Landing page + distribución pública
- [ ] Sistema de referidos
- [ ] Segregación de cuentas por país (ver sección 19)

---

## 19. Segregación de Cuentas por País (Pendiente)

**Objetivo:** Evitar bans por uso de cuentas desde países distintos al de creación.

**Problema:** Riot detecta anomalías de IP y puede banear cuentas que se usan desde
regiones geográficas muy distintas a su origen habitual.

**Dato clave:** La API de Riot **no expone el país de creación** de una cuenta. Lo más
granular disponible es el `server` (NA, LAN, LAS, EUW, etc.), que ya almacenamos.

**Diseño propuesto:**

1. **Campo `country` en `profiles`** — Cada usuario indica su país al registrarse o
   desde su perfil (selector de país). Campo obligatorio para poder alquilar.

2. **Campo `allowed_countries` (o server implícito) en `accounts`** — Cada cuenta
   tiene su server; el admin puede opcionalmente marcar países específicos permitidos.

3. **Mapeo `country → servers_compatibles`** — Tabla o constante que define qué países
   pueden usar qué servers:
   - México → LAN, NA
   - Colombia → LAN
   - Argentina → LAS
   - España → EUW
   - etc.

4. **Filtrado en catálogo** — Al listar cuentas disponibles, solo mostrar las que
   coincidan con los servers compatibles del país del usuario.

5. **Validación en backend** — El RPC / Edge Function de alquiler valida la
   compatibilidad país ↔ server antes de aprobar.

**Migración necesaria:**
```sql
ALTER TABLE profiles ADD COLUMN country TEXT;
CREATE TABLE country_server_map (
  country TEXT NOT NULL,
  server server_region NOT NULL,
  PRIMARY KEY (country, server)
);
```

**Estado:** Pendiente de definir la tabla de mapeo exacta y refinar la UX.

---