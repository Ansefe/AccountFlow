# AccountFlow — Documento de Progreso

> Última actualización: 11 de febrero de 2026

---

## Índice

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Estado Actual del Proyecto](#2-estado-actual-del-proyecto)
3. [Arquitectura Implementada](#3-arquitectura-implementada)
4. [Sistema de Planes y Créditos](#4-sistema-de-planes-y-créditos)
5. [Base de Datos y Migraciones](#5-base-de-datos-y-migraciones)
6. [Consideraciones Técnicas Importantes](#6-consideraciones-técnicas-importantes)
7. [Bugs Resueltos](#7-bugs-resueltos)
8. [Lo que Falta para el MVP](#8-lo-que-falta-para-el-mvp)
9. [Lo que Falta para el App Completa](#9-lo-que-falta-para-el-app-completa)
10. [Acciones Pendientes del Usuario](#10-acciones-pendientes-del-usuario)
11. [Riesgos y Deuda Técnica](#11-riesgos-y-deuda-técnica)

---

## 1. Resumen Ejecutivo

**AccountFlow** es una aplicación de escritorio Windows para gestión y alquiler de cuentas de League of Legends. Modelo de negocio: suscripción mensual + créditos.

| Dato | Valor |
|------|-------|
| **Stack** | Electron 39 + Vue 3 + TypeScript + TailwindCSS 4 + Pinia 3 + Supabase |
| **Build** | Limpio, 0 errores, ~1789 módulos. Instalador .exe generado |
| **Fase actual** | Fase 1 completa + Lemon Squeezy integrado + auto-login LoL operativo (API + fallback UI) |
| **Páginas** | 11 (Login, Register, Dashboard, Accounts, MyRentals, Credits, Settings, Admin ×4) |
| **Stores** | 4 (auth, accounts, rentals, admin) |
| **Rutas** | 11 con guards de auth y admin |
| **Migraciones SQL** | 3 (001_initial_schema + 002_early_bird_pgcron + 003_lemonsqueezy_integration) |
| **Edge Functions** | 5 (create-checkout, ls-webhook, customer-portal, renew-subscriptions, payment-result) |
| **Procesador de pagos** | Lemon Squeezy (MoR — Merchant of Record) |
| **Landing page** | GitHub Pages: `ansefe.github.io/AccountFlow` (rebranded como gaming analytics) |

---

## 2. Estado Actual del Proyecto

### ✅ Completado

#### Infraestructura
- [x] Scaffold Electron-Vite con ventana frameless + controles IPC custom
- [x] TailwindCSS v4 dark theme (inspiración TradingView/Binance)
- [x] Vue Router con 11 rutas + navigation guards (auth + admin)
- [x] 4 Pinia stores: `auth`, `accounts`, `rentals`, `admin`
- [x] Cliente Supabase configurado con `persistSession`, `autoRefreshToken`, `fetchWithTimeout`
- [x] CSP configurado para Supabase, Discord, Google Fonts
- [x] Fuentes Inter + JetBrains Mono vía Google Fonts CSS link
- [x] Proyecto Supabase creado y configurado (Free tier)
- [x] Las 3 migraciones SQL ejecutadas en Supabase
- [x] Auth email/password habilitado en Supabase
- [x] Build .exe de Windows generado con electron-builder

#### Autenticación
- [x] Login con email/password
- [x] Registro con email/password
- [x] Login con Discord OAuth (requiere configuración en Supabase + Discord Developer Portal)
- [x] Persistencia de sesión (`getSession` + `onAuthStateChange`)
- [x] Logout funcional desde sidebar y settings
- [x] Auto-fetch de perfil al detectar sesión

#### Páginas de Usuario
- [x] **Dashboard** — Créditos, plan activo, alquiler en curso con countdown, tabla de actividad reciente
- [x] **Catálogo de Cuentas** — Búsqueda, filtros por elo, badges de estado, botón "Alquilar"
- [x] **Modal de Alquiler** — Selección de duración, deducción de créditos, flujo diferenciado para Unlimited
- [x] **Mis Alquileres** — Tab activos (timer + liberar) / tab historial
- [x] **Créditos** — Balance (sub + comprados), paquetes de compra, historial de transacciones, bloqueo para Unlimited
- [x] **Ajustes** — Perfil editable, cambio de plan self-service (4 planes con tarjetas), ruta Riot Client, logout

#### Panel Admin
- [x] **Admin Dashboard** — Stats en vivo (usuarios, cuentas libres/ocupadas, alquileres)
- [x] **Admin Cuentas** — CRUD completo (agregar/editar/eliminar, forzar liberación)
- [x] **Admin Usuarios** — Tabla, ajuste de créditos, gestión de planes
- [x] **Admin Activity Log** — Filtros por tipo de evento, resolución de usuario

#### Sistema de Planes (actualizado)
- [x] 4 tipos de plan: `none`, `early_bird`, `basic`, `unlimited`
- [x] Cambio de plan vía función RPC `change_user_plan()` (SECURITY DEFINER)
- [x] Recarga mensual automática vía Edge Function + GitHub Actions cron (00:05 UTC)
- [x] Unlimited: sin créditos, alquiler ilimitado (1 cuenta a la vez), sin compra de créditos
- [x] Early Bird: $6/mes, 1000 créditos, badge "40% OFF · Tiempo limitado"
- [x] Plan cards en SettingsPage con feedback visual

#### Pagos — Lemon Squeezy (Merchant of Record)
- [x] Integración Lemon Squeezy Checkout para suscripciones (early_bird, basic, unlimited)
- [x] Integración Lemon Squeezy Checkout para compra de créditos (paquetes)
- [x] Edge Function `create-checkout` (crea checkouts via LS API — JSON:API format)
- [x] Edge Function `ls-webhook` (procesa eventos: subscription_created, subscription_updated, subscription_cancelled, subscription_payment_success, order_created)
- [x] Edge Function `customer-portal` (URL pre-firmada del portal de cliente LS, válida 24h)
- [x] Edge Function `payment-result` (página HTML de resultado post-pago, en inglés)
- [x] Edge Function `renew-subscriptions` (alternativa a pg_cron para Free tier)
- [x] GitHub Actions workflow `renew-subscriptions.yml` (cron diario 00:05 UTC)
- [x] SQL migration 003: funciones server-side (activate_subscription, handle_subscription_renewal, cancel_subscription, add_purchased_credits)
- [x] IPC `shell:openExternal` para abrir URLs de LS en el navegador
- [x] LS Customer Portal para gestionar/cancelar suscripción
- [x] Polling de perfil cada 5s en SettingsPage y CreditsPage (detectar cambios post-pago)
- [x] Validación: requiere plan activo para comprar créditos
- [x] Validación: Unlimited no puede comprar créditos
- [x] Columnas `ls_customer_id`, `ls_subscription_id` en profiles, `ls_variant_id` en credit_packages
- [x] Webhook HMAC SHA-256 signature verification via `X-Signature` header
- [x] Webhook configurado en LS Dashboard
- [x] Productos y variantes creados en LS (3 suscripciones)
- [x] Secrets configurados en Supabase Edge Functions
- [x] Secrets configurados en GitHub Actions (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
- [x] 5 Edge Functions desplegadas en Supabase
- [x] Suscripción de prueba exitosa (checkout → webhook → plan activado → email de confirmación)

#### Landing Page y Documentos Legales
- [x] Landing page en GitHub Pages (`ansefe.github.io/AccountFlow`)
- [x] Página de términos de servicio (`/terms.html`)
- [x] Página de política de privacidad (`/privacy.html`)
- [x] Página de política de reembolsos (`/refund.html`)
- [x] Rebranded como "Competitive Gaming Performance Analytics" (para aprobación de procesador de pagos)

#### Reglas de Negocio Corregidas
- [x] Orden de créditos: subscription se gasta primero, luego purchased
- [x] Unlimited: sin créditos, alquiler directo ilimitado ($30/mes pago con LS)
- [x] Requiere plan activo para comprar créditos extra

#### Base de Datos
- [x] 8 tablas: profiles, accounts, rentals, credit_transactions, payments, credit_packages, activity_log, app_settings
- [x] Todos los enums definidos
- [x] RLS policies para todas las tablas
- [x] Triggers para `updated_at` y `handle_new_user`
- [x] Seed data para credit_packages y app_settings
- [x] Migración 002: pg_cron + early_bird + change_user_plan RPC
- [x] Migración 003: Lemon Squeezy columns + 4 SECURITY DEFINER functions

#### UI/UX
- [x] Sidebar con navegación, plan badge (incluye Unlimited ∞), dropdown de usuario
- [x] Active state correcto en sidebar para rutas admin
- [x] Header con breadcrumbs y balance de créditos
- [x] TitleBar custom (minimizar, maximizar, cerrar)
- [x] Dropdowns con colores legibles en dark mode
- [x] Layout glassmorphism en login/register

### ⚠️ Parcialmente Implementado
- [ ] Discord OAuth — Código listo, pero requiere configuración manual en Discord Developer Portal + Supabase (dejado para el final)
- [ ] Riot Client path — Campo existe en Settings, pero no se guarda ni se utiliza aún
- [ ] Compra de créditos en LS — Error CORS al hacer checkout (posiblemente producto no publicado o variant_id faltante en tabla `credit_packages`). Las suscripciones sí funcionan.
- [ ] Endurecimiento final del fallback UI (bloqueo de input requiere permisos elevados en algunos equipos)

### ❌ No Implementado Aún
- [ ] Heartbeat system
- [ ] Riot API sync
- [ ] Auto-updates (electron-updater)
- [ ] Notificaciones in-app
- [ ] Restricción de RLS en profiles (seguridad crítica)
- [ ] Endurecimiento de secretos en memoria del proceso (borrado explícito post-login)

---

## 3. Arquitectura Implementada

```
accountflow/
├── docs/
│   ├── plan.md                          # Plan original del proyecto
│   ├── ui-spec.md                       # Especificación UI/UX
│   ├── progress.md                      # Este documento
│   ├── index.html                       # Landing page (GitHub Pages)
│   ├── terms.html                       # Términos de servicio
│   ├── privacy.html                     # Política de privacidad
│   └── refund.html                      # Política de reembolsos
│
├── .github/
│   └── workflows/
│       └── renew-subscriptions.yml      # Cron diario — alternativa a pg_cron
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql       # Schema completo (8 tablas, RLS, triggers, seed)
│   │   ├── 002_early_bird_pgcron.sql    # early_bird enum, pg_cron, change_user_plan RPC
│   │   └── 003_lemonsqueezy_integration.sql  # LS columns, server-side SECURITY DEFINER functions
│   └── functions/
│       ├── create-checkout/index.ts     # Crea checkouts via Lemon Squeezy API (JSON:API)
│       ├── ls-webhook/index.ts          # Procesa webhooks de Lemon Squeezy (HMAC SHA-256)
│       ├── customer-portal/index.ts     # URL pre-firmada del portal de cliente LS
│       ├── renew-subscriptions/index.ts # Renueva suscripciones expiradas (admin-granted)
│       └── payment-result/index.ts      # Página HTML post-pago
│
├── src/
│   ├── main/index.ts                    # Electron Main Process (frameless window + shell IPC)
│   ├── preload/index.ts                 # contextBridge + IPC tipado + shell.openExternal
│   └── renderer/
│       ├── index.html                   # CSP + Google Fonts
│       └── src/
│           ├── main.ts                  # Entry: Pinia + Router + auth.initialize()
│           ├── App.vue                  # Router view
│           ├── assets/main.css          # Tailwind + theme CSS variables
│           ├── lib/
│           │   ├── supabase.ts          # Cliente Supabase con fetchWithTimeout
│           │   ├── lemonsqueezy.ts      # Helpers: checkoutSubscription, checkoutCreditPackage, openCustomerPortal
│           │   └── utils.ts             # cn() helper
│           ├── types/database.ts        # Tipos TS del schema (con campos LS)
│           ├── router/index.ts          # 11 rutas + guards
│           ├── stores/
│           │   ├── auth.store.ts        # Sesión, perfil, isUnlimited
│           │   ├── accounts.store.ts    # CRUD cuentas + filtros
│           │   ├── rentals.store.ts     # Alquileres activos/historial
│           │   └── admin.store.ts       # Stats y gestión admin
│           ├── components/
│           │   ├── RentalModal.vue      # Modal de alquiler (normal + unlimited)
│           │   └── layout/
│           │       ├── AppLayout.vue    # Layout con sidebar + header
│           │       ├── Sidebar.vue      # Navegación + plan badge + user menu
│           │       ├── Header.vue       # Breadcrumbs + créditos
│           │       └── TitleBar.vue     # Controles de ventana
│           └── pages/
│               ├── LoginPage.vue
│               ├── RegisterPage.vue
│               ├── DashboardPage.vue
│               ├── AccountsPage.vue
│               ├── MyRentalsPage.vue
│               ├── CreditsPage.vue
│               ├── SettingsPage.vue
│               └── admin/
│                   ├── AdminDashboardPage.vue
│                   ├── AdminAccountsPage.vue
│                   ├── AdminUsersPage.vue
│                   └── AdminActivityPage.vue
```

---

## 4. Sistema de Planes y Créditos

### 4.1 Planes

| Plan | Precio | Créditos/mes | Comportamiento | Estado |
|------|--------|-------------|----------------|--------|
| **Sin Plan** | Gratis | 0 | Puede ver catálogo, comprar créditos individuales | Activo |
| **Early Bird** | $6/mes | 1,000 | 40% descuento vs Basic. Oferta de tiempo limitado. | Activo (ocultable vía `app_settings`) |
| **Basic** | $10/mes | 1,000 | Plan estándar | Activo |
| **Unlimited** | $30/mes | N/A | Sin créditos, alquiler directo ilimitado (1 cuenta a la vez), sin compra de créditos permitida | Activo |

### 4.2 Costos de Alquiler

| Duración | Créditos |
|----------|----------|
| 30 min | 25 |
| 1 hora | 50 |
| 2 horas | 90 |
| 4 horas | 160 |
| 8 horas | 280 |
| 24 horas | 500 |

> **Unlimited**: No aplica. Alquilan sin costo y sin límite de tiempo (30 días de duración técnica, liberación manual).

### 4.3 Reglas de Créditos

- **Créditos de suscripción** (`subscription_credits`): Se **resetean** (no acumulan) al día de renovación mensual.
- **Créditos comprados** (`purchased_credits`): **Sí acumulan**, nunca expiran, se conservan independientemente del plan.
- **Orden de consumo**: Primero se gastan créditos de suscripción (`subscription`), luego los comprados.
- **Unlimited → otro plan**: Los créditos comprados que tenía se conservan. Los de suscripción del nuevo plan se suman.
- **Requisito para comprar créditos**: Se debe tener un plan activo (early_bird o basic). Unlimited y sin plan no pueden comprar.
- **Cualquier plan → Unlimited**: Deja de necesitar créditos. Los comprados que tenía se quedan (pero no puede comprar más).
- **Cancelar plan** (→ `none`): `subscription_credits` se pone a 0. Los comprados se conservan.

### 4.4 Recarga Mensual (pg_cron)

La función `renew_expired_subscriptions()` corre **diariamente a las 00:05 UTC** y:
1. Busca perfiles con `plan_expires_at <= now()` y plan activo
2. Para `basic` / `early_bird`: resetea `subscription_credits` al valor del plan (1000), extiende `plan_expires_at` +30 días
3. Para `unlimited`: solo extiende `plan_expires_at` +30 días (no maneja créditos)
4. Registra `credit_transaction` tipo `subscription_reset` para auditoría

### 4.5 Cambio de Plan (RPC)

El cambio de plan se realiza vía la función `change_user_plan()` (SECURITY DEFINER), que:
1. Valida que sea el propio usuario o un admin
2. Actualiza `plan_type`, `plan_expires_at`, `subscription_credits` según el nuevo plan
3. Registra `credit_transaction` (subscription_grant) y `activity_log` (plan_change)
4. Retorna el resultado con los créditos otorgados

### 4.6 Ocultar Plan Early Bird

Cuando quieras dejar de ofrecer Early Bird a nuevos usuarios:

```sql
-- Actualizar app_settings para marcar early_bird como no visible
UPDATE app_settings
SET value = jsonb_set(value, '{early_bird,visible}', 'false')
WHERE key = 'plans';
```

En el frontend, filtrar `planOptions` por `visible: true` consultando `app_settings`. Los usuarios existentes con early_bird **conservan su plan y precio** — el cron sigue renovando normalmente.

> **TODO frontend**: Actualmente las plan cards están hardcodeadas en SettingsPage. Para la versión de producción, se deberían cargar dinámicamente desde `app_settings.plans` y filtrar por `visible`.

---

## 5. Base de Datos y Migraciones

### Migración 001: `001_initial_schema.sql`
- 8 tablas completas con tipos, relaciones y defaults
- 10+ enums (plan_type, user_role, account_status, rental_status, etc.)
- RLS policies para todas las tablas
- Función `is_admin()` helper
- Función `handle_new_user()` trigger para crear perfil automáticamente al registrarse
- Triggers `updated_at` en todas las tablas relevantes
- Realtime habilitado para `accounts` y `rentals`
- Seed data: 3 credit_packages + app_settings (plans)

### Migración 002: `002_early_bird_pgcron.sql`
- `ALTER TYPE plan_type ADD VALUE 'early_bird'`
- Actualización de `app_settings.plans` con early_bird + campo `visible`
- `CREATE EXTENSION pg_cron`
- Función `renew_expired_subscriptions()` (SECURITY DEFINER)
- Cron schedule: diario a las 00:05 UTC
- Función `change_user_plan()` (SECURITY DEFINER, RPC)

### Migración 003: `003_lemonsqueezy_integration.sql`
- `ls_customer_id`, `ls_subscription_id` columns en profiles
- `ls_variant_id` column en credit_packages
- Actualización de `app_settings.plans` con campos `ls_variant_id`
- Function `activate_subscription()` (SECURITY DEFINER) — activa plan tras checkout de LS
- Function `handle_subscription_renewal()` (SECURITY DEFINER) — renueva créditos mensual (webhook)
- Function `cancel_subscription()` (SECURITY DEFINER) — cancela plan
- Function `add_purchased_credits()` (SECURITY DEFINER) — agrega créditos tras compra one-time

### Estado de ejecución
| Migración | Estado |
|-----------|--------|
| 001_initial_schema.sql | ✅ Ejecutada |
| 002_early_bird_pgcron.sql | ✅ Ejecutada (pg_cron puede estar activo pero no se usa — ver nota) |
| 003_lemonsqueezy_integration.sql | ✅ Ejecutada |

> **Nota**: Si se creó un cron job de pg_cron en Supabase, se puede eliminar de forma segura. La renovación se maneja vía GitHub Actions + Edge Function `renew-subscriptions`. Para borrarlo: Supabase Dashboard → Database → Extensions → buscar "pg_cron" → Cron Jobs, o ejecutar `SELECT cron.unschedule('renew-expired-subscriptions');`.

---

## 6. Consideraciones Técnicas Importantes

### 6.1 pg_cron no se utiliza — GitHub Actions como alternativa

**Decisión: Supabase Free tier.** Se implementó alternativa:

| Componente | Función |
|-----------|--------|
| **Edge Function `renew-subscriptions`** | Ejecuta `renew_expired_subscriptions()` vía service_role |
| **GitHub Actions workflow** | Cron diario a las 00:05 UTC que invoca la Edge Function |
| **LS webhooks** | Para usuarios con Lemon Squeezy, la renovación se maneja vía `subscription_payment_success` webhook |

La función `renew_expired_subscriptions()` de migration 002 sigue siendo necesaria para planes asignados manualmente por el admin (sin LS). Para usuarios LS, el webhook `subscription_payment_success` maneja la renovación directamente.

**Estado**: ✅ Desplegado y configurado. GitHub Actions secrets seteados.

> Si existe un cron job de pg_cron creado en Supabase, se puede borrar de forma segura ya que no se utiliza.

### 6.2 Seguridad del cambio de plan

Actualmente el cambio de plan pasa por la función RPC `change_user_plan()` con SECURITY DEFINER, lo cual es seguro — la lógica vive en el servidor y el usuario no puede manipular los créditos directamente.

**Sin embargo**, las RLS policies actuales de `profiles` permiten que un usuario haga `UPDATE` de cualquier columna de su propio perfil (incluyendo `plan_type`, `subscription_credits`). Esto es un **riesgo de seguridad**:

**Solución recomendada para producción**:
```sql
-- Restringir qué columnas puede actualizar un usuario normal
DROP POLICY "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own display_name"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Crear una función SECURITY DEFINER para actualizar solo display_name
CREATE OR REPLACE FUNCTION update_own_profile(new_display_name text)
RETURNS void AS $$
BEGIN
  UPDATE profiles SET display_name = new_display_name WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

> **TODO**: Implementar restricción de columnas en RLS antes de producción. El cambio de plan ya está protegido vía RPC, pero el perfil general no.

### 6.3 Discord OAuth

El código está implementado pero requiere configuración manual:

1. **Discord Developer Portal** → New Application → OAuth2
2. Agregar redirect: `https://TU_PROJECT_REF.supabase.co/auth/v1/callback`
3. **Supabase Dashboard** → Auth → Providers → Discord
4. Ingresar Client ID (numérico, el Application ID) y Client Secret
5. El Client ID **debe ser el ID numérico** de la aplicación Discord, NO el nombre

**Error conocido**: Si se configura mal el Client ID, Supabase devuelve "El valor X no es snowflake" — significa que el Client ID no es numérico.

### 6.4 Lemon Squeezy Integration Architecture

**Procesador de pagos**: Lemon Squeezy actúa como Merchant of Record (MoR), gestionando impuestos, facturación y cumplimiento. Soporta merchants desde Colombia con usuarios globales.

**API**: `https://api.lemonsqueezy.com/v1` — formato JSON:API.

**Flujo de suscripción:**
1. Usuario clic en plan card (SettingsPage) → llama Edge Function `create-checkout`
2. Edge Function crea Checkout via LS API (POST `/v1/checkouts`) → devuelve URL
3. App abre URL en navegador externo vía `shell.openExternal`
4. Usuario completa pago en LS Checkout
5. LS envía webhook `subscription_created` → Edge Function `ls-webhook`
6. Webhook llama `activate_subscription()` → actualiza perfil (plan, créditos, ls_subscription_id, ls_customer_id)
7. App detecta cambio vía polling cada 5s

**Flujo de compra de créditos:**
1. Usuario clic "Comprar" en paquete (CreditsPage) → `create-checkout` con `type: credit_package`
2. Pago one-time en LS
3. Webhook `order_created` → llama `add_purchased_credits()` → suma créditos al perfil

**Renovación mensual:**
- LS cobra automáticamente → webhook `subscription_payment_success` (billing_reason=renewal) → `handle_subscription_renewal()` → reset subscription_credits

**Cancelación:**
- Via Customer Portal (LS) → webhook `subscription_cancelled` → `cancel_subscription()`

**Gestión:**
- Botón "Gestionar suscripción" abre LS Customer Portal (URL pre-firmada, válida 24h)

**Verificación de webhooks:**
- Header `X-Signature` con HMAC SHA-256 hex digest del body
- Verificación con `timingSafeEqual` para prevenir timing attacks

**Variables de entorno (Edge Functions):**
- `LEMONSQUEEZY_API_KEY` — API key de LS
- `LEMONSQUEEZY_STORE_ID` — Store ID numérico
- `LEMONSQUEEZY_WEBHOOK_SECRET` — Signing secret del webhook
- `LS_VARIANT_EARLY_BIRD`, `LS_VARIANT_BASIC`, `LS_VARIANT_UNLIMITED` — Variant IDs de suscripciones
- `CRON_SECRET` — Secret para autenticar GitHub Actions

### 6.5 Electron en producción

El Main Process actual solo maneja la ventana frameless. Para producción necesita:
- IPC handlers para nut.js (auto-login)
- Process monitor para detectar cierre del Riot Client
- Heartbeat hacia Supabase
- Auto-updates vía electron-updater + GitHub Releases
- `before-quit` handler para limpiar rentals activos

### 6.6 Auto-login LoL (estado actual)

Implementado y probado de extremo a extremo en entorno real:

- Flujo principal por Riot Local API (`lockfile` + `/rso-auth/*` + `/riot-client-auth/*`).
- Fallback automático (Camino B) por teclado simulado cuando Riot bloquea API (`captcha_not_allowed`/`auth_failure`).
- Progreso en tiempo real Main → Renderer (`riot:login-progress`) para observabilidad.
- Modo producción: credenciales solo desde Supabase Edge Function (`get-credentials`).
- Eliminadas rutas de credenciales hardcodeadas/override por variables de entorno de test.

Notas de seguridad actuales del fallback UI:

- Verifica foco en cada tecla; si se pierde foco, aborta.
- Si se pierde foco o falla `BlockInput`, se fuerza cierre de Riot Client para limpiar campos parciales.
- `BlockInput` activado por defecto en Camino B (`RIOT_UI_BLOCK_INPUT=1`), pero puede fallar sin privilegios elevados.

### 6.7 Encriptación de credenciales

Las credenciales de las cuentas de LoL (`encrypted_password` en tabla `accounts`) aún **no tienen encriptación implementada**. Actualmente se almacenan en texto plano. Para producción:
- Encriptar con AES-256-GCM antes de guardar
- Desencriptar solo en Edge Function o Main Process (nunca en el Renderer)
- La clave de encriptación debe estar en variables de entorno del servidor (Supabase secrets)

---

## 7. Bugs Resueltos

| # | Bug | Solución | Fecha |
|---|-----|----------|-------|
| 1 | Admin sidebar siempre marcaba "Dashboard" activo | `isActive()` con exact match para `/` y `/admin` | Feb 2026 |
| 2 | Botón logout no funcionaba | `handleLogout()` async en vez de `.then()` chain | Feb 2026 |
| 3 | Flecha del dropdown de usuario no hacía nada | Implementado dropdown con settings + logout + click-away | Feb 2026 |
| 4 | Filtro Activity Log ilegible en dark mode | CSS para `select option` con background/color del tema | Feb 2026 |
| 5 | JetBrains Mono 404 (woff2 URL v20 rota) | Migrado a Google Fonts CSS link en `index.html` | Feb 2026 |
| 6 | SettingsPage mostraba datos de plan desactualizados | `auth.fetchProfile()` en `onMounted` | Feb 2026 |
| 7 | Sesión no persistía / errores de AbortController | `syncSession()` + `authUnsubscribe` + try/catch robusto (arreglado por el usuario) | Feb 2026 |

| 8 | Orden de créditos corregido | Subscription first (era purchased first) | Feb 2026 |
| 9 | Plan requerido para comprar créditos | Validación en CreditsPage + Edge Function | Feb 2026 |
| 10 | Stripe no soporta Colombia para merchants | Migración a Paddle, luego a Lemon Squeezy | Feb 2026 |
| 11 | Paddle rechazó dominio GitHub Pages | Migración a Lemon Squeezy como procesador final | Feb 2026 |
| 12 | payment-result caracteres corruptos (UTF-8) | HTML entities + texto en inglés | Feb 2026 |
| 13 | ls-webhook module not found (deno.land/std) | Cambio a `node:crypto` y `node:buffer` imports | Feb 2026 |
| 14 | redirect_url sin status param | Incluir `?status=success` en redirect_url del checkout | Feb 2026 |
| 15 | Build .exe falla por symlinks (7-zip) | Habilitar Developer Mode en Windows | Feb 2026 |
| 16 | Auto-login API bloqueado por Riot (`captcha_not_allowed`) | Fallback Camino B por teclado simulado + validación de foco + detección de tokens | Feb 2026 |
| 17 | Flujo opaco de autologin (sin visibilidad de etapas) | Progreso IPC `riot:login-progress` + estado en MyRentalsPage | Feb 2026 |
| 18 | Riesgo de exposición parcial al perder foco durante tipeo | Abort por foco + cierre inmediato de Riot Client + `BlockInput` por defecto | Feb 2026 |

---

El MVP es la versión mínima funcional que se puede distribuir a los primeros usuarios (amigos). Incluye todo lo necesario para que paguen, alquilen cuentas y las usen.

### 8.1 Bloque A — Pagos (✅ Completado)

| Tarea | Estado | Detalle |
|-------|--------|---------|
| Integración procesador de pagos | ✅ | Lemon Squeezy (Stripe → Paddle → LS por restricciones de Colombia) |
| Webhooks vía Edge Function | ✅ | `ls-webhook` — procesa subscription_created, updated, cancelled, payment_success, order_created |
| Vincular pago con cambio de plan | ✅ | Checkout → webhook → activate_subscription() |
| Portal de gestión | ✅ | Customer Portal de Lemon Squeezy (URL pre-firmada) |
| Cripto manual (admin) | ✅ | El admin puede ajustar créditos manualmente desde el panel |
| Landing page + docs legales | ✅ | GitHub Pages para aprobación del procesador de pagos |
| Deploy Edge Functions | ✅ | 5 funciones desplegadas en Supabase |
| Secrets configurados | ✅ | Supabase Edge Functions + GitHub Actions |
| Suscripción probada | ✅ | Checkout → pago → webhook → plan activado → email confirmación |

### 8.2 Bloque B — Auto-Login LoL (✅ Implementado, en hardening)

| Tarea | Prioridad | Estimado | Detalle |
|-------|-----------|----------|---------|
| IPC handlers Main ↔ Renderer | ✅ | — | `riot:login`, `riot:kill`, `riot:login-progress` |
| Auto-login por Riot Local API | ✅ | — | Flujo lockfile + sesión RSO + login-token |
| Fallback UI (Camino B) | ✅ | — | Teclado simulado con validación de foco y `BlockInput` |
| Botón "Iniciar Sesión" en UI | ✅ | — | En MyRentalsPage para rental activo |
| Endurecer limpieza de secretos en memoria | 🔴 Alta | 0.5-1 día | Borrado explícito de buffers/strings sensibles tras uso |

### 8.3 Bloque C — Seguridad (Crítico — SIGUIENTE PASO)

| Tarea | Prioridad | Estimado | Detalle |
|-------|-----------|----------|---------|
| Restringir RLS de profiles | 🔴 Alta | 0.5 días | Solo permitir UPDATE de `display_name`, todo lo demás vía SECURITY DEFINER |
| Encriptación de passwords de cuentas | 🔴 Alta | 1 día | AES-256-GCM en DB, decrypt solo server-side |
| Edge Function para decrypt credentials | 🔴 Alta | 1 día | Solo accesible con rental activo válido |

### 8.4 Bloque D — Estabilidad

| Tarea | Prioridad | Estimado | Detalle |
|-------|-----------|----------|---------|
| Heartbeat system | 🟡 Media | 1-2 días | Ping cada 60s a Supabase, liberar cuenta si 3min sin heartbeat |
| Expiración de rentals (client-side) | 🟡 Media | 0.5 días | Timer que auto-libera cuando `expires_at` pasa (ya parcialmente implementado) |
| Global toast notifications | 🟡 Media | 0.5 días | Feedback visual para success/error en todas las acciones |
| Cargar plan visibility desde app_settings | 🟢 Baja | 0.5 días | Para poder ocultar early_bird sin deploy |

### 8.5 Bloque E — Distribución

| Tarea | Prioridad | Estimado | Detalle |
|-------|-----------|----------|---------|
| Build de producción Windows (.exe) | ✅ Listo | — | `npm run build:win` genera instalador NSIS |
| Auto-updates (electron-updater) | 🟡 Media | 1 día | GitHub Releases como host |
| Smoke test completo | 🔴 Alta | 1 día | Registro → login → comprar plan → alquilar → auto-login → liberar |

### Estimación restante MVP: ~5-8 días de trabajo (Bloques C + D + E parcial)

---

## 9. Lo que Falta para el App Completa

Más allá del MVP, estas son las fases posteriores:

### Fase 2 — Core Features (3-4 semanas post-MVP)

| Feature | Detalle |
|---------|---------|
| **Riot API sync** | Edge Function cron que sincroniza elo/LP/stats de las ~100 cuentas cada hora. Personal Key del Developer Portal. |
| **Notificaciones in-app** | Alquiler por expirar (5min antes), créditos bajos (<100), plan por vencer |
| **Dashboard métricas admin** | Gráficos: ingresos, alquileres/día, usuarios activos, cuentas más usadas |
| **Onboarding flow** | Primera vez que abre el app → tour guiado |
| **Mejoras UI** | Animaciones con @vueuse/motion, skeletons, empty states mejorados |
| **PayPal** | Si hay demanda entre los usuarios |

### Fase 3 — Polish (2-3 semanas)

| Feature | Detalle |
|---------|---------|
| **Testing E2E** | Playwright o similar para flujos críticos |
| **Monitoreo / logging** | Sentry o similar para errores en producción |
| **Backup automático** | Supabase backups (Pro tier) o export manual |
| **Rate limiting** | Evitar abuso de la API desde el cliente |
| **Audit trail completo** | Todos los eventos admin en activity_log |

### Fase 4 — Expansión (post-launch)

| Feature | Detalle |
|---------|---------|
| **Soporte multi-juego** | Valorant, TFT, etc. |
| **NOWPayments** | Crypto automatizado si escala a público |
| **Landing page** | Website público para atraer nuevos usuarios |
| **Sistema de referidos** | Invita amigos → créditos gratis |
| **App móvil (opcional)** | Monitor de rentals desde el teléfono |

---

## 10. Acciones Pendientes del Usuario

### Completadas

| # | Acción | Estado |
|---|--------|--------|
| 1 | Crear proyecto Supabase | ✅ |
| 2 | Ejecutar migración 001 | ✅ |
| 3 | Ejecutar migración 002 | ✅ |
| 4 | Ejecutar migración 003 (Lemon Squeezy) | ✅ |
| 5 | Crear `.env` con SUPABASE_URL y ANON_KEY | ✅ |
| 6 | Habilitar Auth email/password | ✅ |
| 7 | Crear cuenta en Lemon Squeezy | ✅ |
| 8 | Crear productos/variantes en LS (3 suscripciones) | ✅ |
| 9 | Configurar webhook en LS | ✅ |
| 10 | Deploy 5 Edge Functions | ✅ |
| 11 | Setear secrets en Supabase Edge Functions | ✅ |
| 12 | Setear secrets en GitHub Actions | ✅ |
| 13 | Generar build .exe de Windows | ✅ |
| 14 | Probar suscripción (checkout → pago → plan activado) | ✅ |

### Pendientes

| # | Acción | Detalle |
|---|--------|---------|
| 15 | **Probar compra de créditos** | Verificar que los productos one-time en LS estén publicados y que `credit_packages.ls_variant_id` esté seteado en la DB |
| 16 | **Promover usuario a admin** | `UPDATE profiles SET role = 'admin' WHERE id = 'TU-USER-ID';` |
| 17 | **Cargar cuentas LoL en la DB** | Via panel admin o SQL directo |
| 18 | **(Opcional) Borrar cron de pg_cron** | `SELECT cron.unschedule('renew-expired-subscriptions');` o desde Supabase Dashboard |

### Para Discord OAuth (dejado para el final)

| # | Acción | Detalle |
|---|--------|---------|
| 19 | Crear aplicación en Discord Developer Portal | [discord.com/developers](https://discord.com/developers/applications) |
| 20 | Copiar Application ID (numérico) y Client Secret | |
| 21 | Agregar redirect URL | `https://sisitxrcjovkvfeqlkwx.supabase.co/auth/v1/callback` |
| 22 | Configurar en Supabase | Auth → Providers → Discord → Client ID + Secret |

---

## 11. Riesgos y Deuda Técnica

### Riesgos Altos

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| **Sin pasarela de pago** | ✅ Resuelto | Lemon Squeezy integrado y funcionando (suscripciones probadas) |
| **RLS de profiles muy permisivo** | Un usuario técnico podría darse créditos infinitos via SDK | Restringir RLS a solo `display_name`, forzar todo lo demás vía SECURITY DEFINER |
| **Credenciales LoL parcialmente visibles si falla el bloqueo/foco en Camino B** | Exposición parcial local en la UI del cliente de Riot | Ejecutar con privilegios elevados para `BlockInput`, abort fail-closed y cierre inmediato del cliente (implementado), más limpieza de memoria pendiente |
| **Sin heartbeat** | Un usuario puede cerrar el app y mantener la cuenta lockeada indefinidamente | Implementar heartbeat + auto-release |

### Riesgos Medios

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| pg_cron no disponible en Free tier | ✅ Resuelto | Edge Function + GitHub Actions como alternativa implementada y desplegada |
| **Discord OAuth mal configurado** | Usuarios no pueden loguear con Discord | Dejado para el final — documentación clara de configuración |
| **Sin auto-updates** | Los usuarios tendrían que descargar manualmente cada actualización | electron-updater + GitHub Releases (Fase 2) |
| **Compra de créditos con error CORS** | Usuarios no pueden comprar créditos extra | Probablemente producto no publicado en LS o ls_variant_id faltante en DB |

### Deuda Técnica

| Item | Severidad | Detalle |
|------|-----------|---------|
| Plan cards hardcodeadas | Baja | Deberían cargarse dinámicamente desde `app_settings.plans` |
| Lint warnings en Sidebar | Cosmético | `pl-[9px]` → `pl-2.25`, `bg-gradient-to-br` → `bg-linear-to-br` (Tailwind v4) |
| `@theme` warning en CSS | Cosmético | Linter no reconoce Tailwind v4, funciona correctamente |
| Sin validación de pago en plan change | ✅ Resuelto | Plan change ahora pasa por Lemon Squeezy Checkout |
| Orden de consumo de créditos | ✅ Resuelto | Subscription primero, purchased después |
| Documentos legales mencionan Paddle | Baja | Actualizar terms/privacy/refund para decir "Lemon Squeezy" |

---

> **Documento generado para AccountFlow v1.0.0**
> Última actualización: 11 de febrero de 2026
> Próxima revisión sugerida: después de cerrar hardening de seguridad (RLS + encriptación + limpieza de secretos en memoria + heartbeat).
