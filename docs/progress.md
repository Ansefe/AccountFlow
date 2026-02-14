# AccountFlow â€” Documento de Progreso

> Ãšltima actualizaciÃ³n: 12 de febrero de 2026

---

## Ãndice

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Estado Actual del Proyecto](#2-estado-actual-del-proyecto)
3. [Arquitectura Implementada](#3-arquitectura-implementada)
4. [Sistema de Planes y CrÃ©ditos](#4-sistema-de-planes-y-crÃ©ditos)
5. [Base de Datos y Migraciones](#5-base-de-datos-y-migraciones)
6. [Consideraciones TÃ©cnicas Importantes](#6-consideraciones-tÃ©cnicas-importantes)
7. [Bugs Resueltos](#7-bugs-resueltos)
8. [Lo que Falta para el MVP](#8-lo-que-falta-para-el-mvp)
9. [Lo que Falta para el App Completa](#9-lo-que-falta-para-el-app-completa)
10. [Acciones Pendientes del Usuario](#10-acciones-pendientes-del-usuario)
11. [Riesgos y Deuda TÃ©cnica](#11-riesgos-y-deuda-tÃ©cnica)

---

## 1. Resumen Ejecutivo

**AccountFlow** es una aplicaciÃ³n de escritorio Windows para gestiÃ³n y alquiler de cuentas de League of Legends. Modelo de negocio: suscripciÃ³n mensual + crÃ©ditos.

| Dato | Valor |
|------|-------|
| **Stack** | Electron 39 + Vue 3 + TypeScript + TailwindCSS 4 + Pinia 3 + Supabase |
| **Build** | Limpio, 0 errores, ~1789 mÃ³dulos. Instalador .exe generado |
| **Fase actual** | Fase 1 completa + Lemon Squeezy integrado + auto-login LoL operativo (API + fallback UI) |
| **PÃ¡ginas** | 11 (Login, Register, Dashboard, Accounts, MyRentals, Credits, Settings, Admin Ã—4) |
| **Stores** | 4 (auth, accounts, rentals, admin) |
| **Rutas** | 11 con guards de auth y admin |
| **Migraciones SQL** | 4 (001_initial_schema + 002_early_bird_pgcron + 003_lemonsqueezy_integration + 005_match_based_rentals) |
| **Edge Functions** | 6 (create-checkout, ls-webhook, customer-portal, renew-subscriptions, payment-result, check-rental-matches) + 2 pendientes deploy (heartbeat-ping, heartbeat-sweep) |
| **Procesador de pagos** | Lemon Squeezy (MoR â€” Merchant of Record) |
| **Landing page** | GitHub Pages: `ansefe.github.io/AccountFlow` (rebranded como gaming analytics) |

---

## 2. Estado Actual del Proyecto

### âœ… Completado

#### Infraestructura
- [x] Scaffold Electron-Vite con ventana frameless + controles IPC custom
- [x] TailwindCSS v4 dark theme (inspiraciÃ³n TradingView/Binance)
- [x] Vue Router con 11 rutas + navigation guards (auth + admin)
- [x] 4 Pinia stores: `auth`, `accounts`, `rentals`, `admin`
- [x] Cliente Supabase configurado con `persistSession`, `autoRefreshToken`, `fetchWithTimeout`
- [x] CSP configurado para Supabase, Discord, Google Fonts
- [x] Fuentes Inter + JetBrains Mono vÃ­a Google Fonts CSS link
- [x] Proyecto Supabase creado y configurado (Free tier)
- [x] Las 3 migraciones SQL ejecutadas en Supabase
- [x] Auth email/password habilitado en Supabase
- [x] Build .exe de Windows generado con electron-builder

#### AutenticaciÃ³n
- [x] Login con email/password
- [x] Registro con email/password
- [x] Login con Discord OAuth (requiere configuraciÃ³n en Supabase + Discord Developer Portal)
- [x] Persistencia de sesiÃ³n (`getSession` + `onAuthStateChange`)
- [x] Logout funcional desde sidebar y settings
- [x] Auto-fetch de perfil al detectar sesiÃ³n

#### PÃ¡ginas de Usuario
- [x] **Dashboard** â€” CrÃ©ditos, plan activo, alquiler en curso con progreso de partidas, tabla de actividad reciente
- [x] **CatÃ¡logo de Cuentas** â€” BÃºsqueda, filtros por elo, badges de estado, botÃ³n "Alquilar"
- [x] **Modal de Alquiler** â€” SelecciÃ³n de paquete de partidas (1, 3, 5, 10), deducciÃ³n de crÃ©ditos, flujo diferenciado para Unlimited
- [x] **Mis Alquileres** â€” Tab activos (progreso de partidas + liberar) / tab historial
- [x] **CrÃ©ditos** â€” Balance (sub + comprados), paquetes de compra, historial de transacciones, bloqueo para Unlimited
- [x] **Ajustes** â€” Perfil editable, cambio de plan self-service (4 planes con tarjetas), ruta Riot Client, logout

#### Panel Admin
- [x] **Admin Dashboard** â€” Stats en vivo (usuarios, cuentas libres/ocupadas, alquileres)
- [x] **Admin Cuentas** â€” CRUD completo (agregar/editar/eliminar, forzar liberaciÃ³n)
- [x] **Admin Usuarios** â€” Tabla, ajuste de crÃ©ditos, gestiÃ³n de planes
- [x] **Admin Activity Log** â€” Filtros por tipo de evento, resoluciÃ³n de usuario

#### Sistema de Planes (actualizado)
- [x] 4 tipos de plan: `none`, `early_bird`, `basic`, `unlimited`
- [x] Cambio de plan vÃ­a funciÃ³n RPC `change_user_plan()` (SECURITY DEFINER)
- [x] Recarga mensual automÃ¡tica vÃ­a Edge Function + GitHub Actions cron (00:05 UTC)
- [x] Unlimited: sin crÃ©ditos, alquiler ilimitado (1 cuenta a la vez), sin compra de crÃ©ditos
- [x] Early Bird: $6/mes, 1000 crÃ©ditos, badge "40% OFF Â· Tiempo limitado"
- [x] Plan cards en SettingsPage con feedback visual

#### Pagos â€” Lemon Squeezy (Merchant of Record)
- [x] IntegraciÃ³n Lemon Squeezy Checkout para suscripciones (early_bird, basic, unlimited)
- [x] IntegraciÃ³n Lemon Squeezy Checkout para compra de crÃ©ditos (paquetes)
- [x] Edge Function `create-checkout` (crea checkouts via LS API â€” JSON:API format)
- [x] Edge Function `ls-webhook` (procesa eventos: subscription_created, subscription_updated, subscription_cancelled, subscription_payment_success, order_created)
- [x] Edge Function `customer-portal` (URL pre-firmada del portal de cliente LS, vÃ¡lida 24h)
- [x] Edge Function `payment-result` (pÃ¡gina HTML de resultado post-pago, en inglÃ©s)
- [x] Edge Function `renew-subscriptions` (alternativa a pg_cron para Free tier)
- [x] GitHub Actions workflow `renew-subscriptions.yml` (cron diario 00:05 UTC)
- [x] SQL migration 003: funciones server-side (activate_subscription, handle_subscription_renewal, cancel_subscription, add_purchased_credits)
- [x] IPC `shell:openExternal` para abrir URLs de LS en el navegador
- [x] LS Customer Portal para gestionar/cancelar suscripciÃ³n
- [x] Polling de perfil cada 5s en SettingsPage y CreditsPage (detectar cambios post-pago)
- [x] ValidaciÃ³n: requiere plan activo para comprar crÃ©ditos
- [x] ValidaciÃ³n: Unlimited no puede comprar crÃ©ditos
- [x] Columnas `ls_customer_id`, `ls_subscription_id` en profiles, `ls_variant_id` en credit_packages
- [x] Webhook HMAC SHA-256 signature verification via `X-Signature` header
- [x] Webhook configurado en LS Dashboard
- [x] Productos y variantes creados en LS (3 suscripciones)
- [x] Secrets configurados en Supabase Edge Functions
- [x] Secrets configurados en GitHub Actions (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
- [x] 5 Edge Functions desplegadas en Supabase
- [x] SuscripciÃ³n de prueba exitosa (checkout â†’ webhook â†’ plan activado â†’ email de confirmaciÃ³n)

#### Landing Page y Documentos Legales
- [x] Landing page en GitHub Pages (`ansefe.github.io/AccountFlow`)
- [x] PÃ¡gina de tÃ©rminos de servicio (`/terms.html`)
- [x] PÃ¡gina de polÃ­tica de privacidad (`/privacy.html`)
- [x] PÃ¡gina de polÃ­tica de reembolsos (`/refund.html`)
- [x] Rebranded como "Competitive Gaming Performance Analytics" (para aprobaciÃ³n de procesador de pagos)

#### Reglas de Negocio Corregidas
- [x] Orden de crÃ©ditos: subscription se gasta primero, luego purchased
- [x] Unlimited: sin crÃ©ditos, alquiler directo ilimitado ($30/mes pago con LS)
- [x] Requiere plan activo para comprar crÃ©ditos extra

#### Base de Datos
- [x] 8 tablas: profiles, accounts, rentals, credit_transactions, payments, credit_packages, activity_log, app_settings
- [x] Todos los enums definidos
- [x] RLS policies para todas las tablas
- [x] Triggers para `updated_at` y `handle_new_user`
- [x] Seed data para credit_packages y app_settings
- [x] MigraciÃ³n 002: pg_cron + early_bird + change_user_plan RPC
- [x] MigraciÃ³n 003: Lemon Squeezy columns + 4 SECURITY DEFINER functions

#### UI/UX
- [x] Sidebar con navegaciÃ³n, plan badge (incluye Unlimited âˆž), dropdown de usuario
- [x] Active state correcto en sidebar para rutas admin
- [x] Header con breadcrumbs y balance de crÃ©ditos
- [x] TitleBar custom (minimizar, maximizar, cerrar)
- [x] Dropdowns con colores legibles en dark mode
- [x] Layout glassmorphism en login/register

### âš ï¸ Parcialmente Implementado
- [ ] Discord OAuth â€” CÃ³digo listo, pero requiere configuraciÃ³n manual en Discord Developer Portal + Supabase (dejado para el final)
- [ ] Riot Client path â€” Campo existe en Settings, pero no se guarda ni se utiliza aÃºn
- [ ] Compra de crÃ©ditos en LS â€” Error CORS al hacer checkout (posiblemente producto no publicado o variant_id faltante en tabla `credit_packages`). Las suscripciones sÃ­ funcionan.
- [ ] Endurecimiento final del fallback UI (bloqueo de input requiere permisos elevados en algunos equipos)
- [ ] Heartbeat system â€” CÃ³digo implementado (ping + sweep). **Ahora es solo observabilidad** (NO libera cuentas). Pendiente deploy.
- [x] Modelo de rentas por partidas â€” MigraciÃ³n `005_match_based_rentals.sql`, Edge Function `check-rental-matches`, cron `check-rental-matches.yml` cada 3 min. Columnas `duration_minutes` y `expires_at` eliminadas.
- [x] Idle timeout configurable â€” `app_settings.idle_timeout_minutes` (default 60). Reembolso proporcional automÃ¡tico al liberar por inactividad (fÃ³rmula: costo_por_partida Ã— partidas_restantes).
- [x] Tabla `rental_matches` â€” Log de partidas individuales con detalle (campeÃ³n, win, duraciÃ³n, modo)
- [x] Realtime en `rental_matches` â€” El cliente ve actualizaciones de partidas en vivo

### âŒ No Implementado AÃºn
- [ ] Riot API sync
- [ ] Auto-updates (electron-updater)
- [ ] Notificaciones in-app
- [ ] RestricciÃ³n de RLS en profiles (seguridad crÃ­tica)
- [ ] Endurecimiento de secretos en memoria del proceso (borrado explÃ­cito post-login)

---

## 3. Arquitectura Implementada

```
accountflow/
â”œâ”€â”€ docs/
â”‚   â”œâ”€â”€ plan.md                          # Plan original del proyecto
â”‚   â”œâ”€â”€ ui-spec.md                       # EspecificaciÃ³n UI/UX
â”‚   â”œâ”€â”€ progress.md                      # Este documento
â”‚   â”œâ”€â”€ index.html                       # Landing page (GitHub Pages)
â”‚   â”œâ”€â”€ terms.html                       # TÃ©rminos de servicio
â”‚   â”œâ”€â”€ privacy.html                     # PolÃ­tica de privacidad
â”‚   â””â”€â”€ refund.html                      # PolÃ­tica de reembolsos
â”‚
â”œâ”€â”€ .github/
â”‚   â””â”€â”€ workflows/
â”‚       â””â”€â”€ renew-subscriptions.yml      # Cron diario â€” alternativa a pg_cron
â”‚       â””â”€â”€ heartbeat-sweep.yml           # Cron cada 5 min â€” observabilidad de heartbeat (no libera cuentas)
â”‚       â””â”€â”€ check-rental-matches.yml      # Cron cada 3 min â€” tracking de partidas + idle timeout
â”‚
â”œâ”€â”€ supabase/
â”‚   â”œâ”€â”€ migrations/
â”‚   â”‚   â”œâ”€â”€ 001_initial_schema.sql       # Schema completo (8 tablas, RLS, triggers, seed)
â”‚   â”‚   â”œâ”€â”€ 002_early_bird_pgcron.sql    # early_bird enum, pg_cron, change_user_plan RPC
â”‚   â”‚   â”œâ”€â”€ 003_lemonsqueezy_integration.sql  # LS columns, server-side SECURITY DEFINER functions
â”‚   â”‚   â””â”€â”€ 005_match_based_rentals.sql       # Match-based rentals: new columns, rental_matches table, idle timeout setting
â”‚   â””â”€â”€ functions/
â”‚       â”œâ”€â”€ create-checkout/index.ts     # Crea checkouts via Lemon Squeezy API (JSON:API)
â”‚       â”œâ”€â”€ ls-webhook/index.ts          # Procesa webhooks de Lemon Squeezy (HMAC SHA-256)
â”‚       â”œâ”€â”€ customer-portal/index.ts     # URL pre-firmada del portal de cliente LS
â”‚       â”œâ”€â”€ renew-subscriptions/index.ts # Renueva suscripciones expiradas (admin-granted)
â”‚       â”œâ”€â”€ heartbeat-ping/index.ts       # Actualiza last_heartbeat_at del usuario autenticado
â”‚       â”œâ”€â”€ heartbeat-sweep/index.ts      # Observabilidad â€” reporta heartbeats stale (NO libera cuentas)
â”‚       â”œâ”€â”€ check-rental-matches/index.ts # Tracking de partidas + idle timeout + reembolso proporcional
â”‚       â””â”€â”€ payment-result/index.ts      # PÃ¡gina HTML post-pago
â”‚
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ main/index.ts                    # Electron Main Process (frameless window + shell IPC)
â”‚   â”œâ”€â”€ preload/index.ts                 # contextBridge + IPC tipado + shell.openExternal
â”‚   â””â”€â”€ renderer/
â”‚       â”œâ”€â”€ index.html                   # CSP + Google Fonts
â”‚       â””â”€â”€ src/
â”‚           â”œâ”€â”€ main.ts                  # Entry: Pinia + Router + auth.initialize()
â”‚           â”œâ”€â”€ App.vue                  # Router view
â”‚           â”œâ”€â”€ assets/main.css          # Tailwind + theme CSS variables
â”‚           â”œâ”€â”€ lib/
â”‚           â”‚   â”œâ”€â”€ supabase.ts          # Cliente Supabase con fetchWithTimeout
â”‚           â”‚   â”œâ”€â”€ lemonsqueezy.ts      # Helpers: checkoutSubscription, checkoutCreditPackage, openCustomerPortal
â”‚           â”‚   â””â”€â”€ utils.ts             # cn() helper
â”‚           â”œâ”€â”€ types/database.ts        # Tipos TS del schema (con campos LS)
â”‚           â”œâ”€â”€ router/index.ts          # 11 rutas + guards
â”‚           â”œâ”€â”€ stores/
â”‚           â”‚   â”œâ”€â”€ auth.store.ts        # SesiÃ³n, perfil, isUnlimited
â”‚           â”‚   â”œâ”€â”€ accounts.store.ts    # CRUD cuentas + filtros
â”‚           â”‚   â”œâ”€â”€ rentals.store.ts     # Alquileres activos/historial
â”‚           â”‚   â””â”€â”€ admin.store.ts       # Stats y gestiÃ³n admin
â”‚           â”œâ”€â”€ components/
â”‚           â”‚   â”œâ”€â”€ RentalModal.vue      # Modal de alquiler (normal + unlimited)
â”‚           â”‚   â””â”€â”€ layout/
â”‚           â”‚       â”œâ”€â”€ AppLayout.vue    # Layout con sidebar + header
â”‚           â”‚       â”œâ”€â”€ Sidebar.vue      # NavegaciÃ³n + plan badge + user menu
â”‚           â”‚       â”œâ”€â”€ Header.vue       # Breadcrumbs + crÃ©ditos
â”‚           â”‚       â””â”€â”€ TitleBar.vue     # Controles de ventana
â”‚           â””â”€â”€ pages/
â”‚               â”œâ”€â”€ LoginPage.vue
â”‚               â”œâ”€â”€ RegisterPage.vue
â”‚               â”œâ”€â”€ DashboardPage.vue
â”‚               â”œâ”€â”€ AccountsPage.vue
â”‚               â”œâ”€â”€ MyRentalsPage.vue
â”‚               â”œâ”€â”€ CreditsPage.vue
â”‚               â”œâ”€â”€ SettingsPage.vue
â”‚               â””â”€â”€ admin/
â”‚                   â”œâ”€â”€ AdminDashboardPage.vue
â”‚                   â”œâ”€â”€ AdminAccountsPage.vue
â”‚                   â”œâ”€â”€ AdminUsersPage.vue
â”‚                   â””â”€â”€ AdminActivityPage.vue
```

---

## 4. Sistema de Planes y CrÃ©ditos

### 4.1 Planes

| Plan | Precio | CrÃ©ditos/mes | Comportamiento | Estado |
|------|--------|-------------|----------------|--------|
| **Sin Plan** | Gratis | 0 | Puede ver catÃ¡logo, comprar crÃ©ditos individuales | Activo |
| **Early Bird** | $6/mes | 1,000 | 40% descuento vs Basic. Oferta de tiempo limitado. | Activo (ocultable vÃ­a `app_settings`) |
| **Basic** | $10/mes | 1,000 | Plan estÃ¡ndar | Activo |
| **Unlimited** | $30/mes | N/A | Sin crÃ©ditos, alquiler directo ilimitado (1 cuenta a la vez), sin compra de crÃ©ditos permitida | Activo |

### 4.2 Costos de Alquiler (por partidas â€” modelo feb 2026)

| Partidas | CrÃ©ditos | Costo/partida |
|----------|----------|---------------|
| 1 partida | 35 | 35 cr |
| 3 partidas | 95 | ~32 cr |
| 5 partidas | 150 | 30 cr |
| 10 partidas | 270 | 27 cr |

> Precios configurables en `app_settings` key `match_packages`.
> Con 1000 crÃ©ditos/mes â‰ˆ 28 partidas individuales o 37 en paquetes de 10.
> **Unlimited**: No aplica. Alquilan sin costo (1 cuenta a la vez, 999 partidas max).
> **Idle timeout**: Si no juega partida en 60 min (configurable), se libera la cuenta y se reembolsan crÃ©ditos proporcionales.
> **FÃ³rmula de reembolso**: `costo_por_partida Ã— partidas_restantes` donde `costo_por_partida = crÃ©ditos_gastados / partidas_totales`.

### 4.3 Reglas de CrÃ©ditos

- **CrÃ©ditos de suscripciÃ³n** (`subscription_credits`): Se **resetean** (no acumulan) al dÃ­a de renovaciÃ³n mensual.
- **CrÃ©ditos comprados** (`purchased_credits`): **SÃ­ acumulan**, nunca expiran, se conservan independientemente del plan.
- **Orden de consumo**: Primero se gastan crÃ©ditos de suscripciÃ³n (`subscription`), luego los comprados.
- **Unlimited â†’ otro plan**: Los crÃ©ditos comprados que tenÃ­a se conservan. Los de suscripciÃ³n del nuevo plan se suman.
- **Requisito para comprar crÃ©ditos**: Se debe tener un plan activo (early_bird o basic). Unlimited y sin plan no pueden comprar.
- **Cualquier plan â†’ Unlimited**: Deja de necesitar crÃ©ditos. Los comprados que tenÃ­a se quedan (pero no puede comprar mÃ¡s).
- **Cancelar plan** (â†’ `none`): `subscription_credits` se pone a 0. Los comprados se conservan.

### 4.4 Recarga Mensual (pg_cron)

La funciÃ³n `renew_expired_subscriptions()` corre **diariamente a las 00:05 UTC** y:
1. Busca perfiles con `plan_expires_at <= now()` y plan activo
2. Para `basic` / `early_bird`: resetea `subscription_credits` al valor del plan (1000), extiende `plan_expires_at` +30 dÃ­as
3. Para `unlimited`: solo extiende `plan_expires_at` +30 dÃ­as (no maneja crÃ©ditos)
4. Registra `credit_transaction` tipo `subscription_reset` para auditorÃ­a

### 4.5 Cambio de Plan (RPC)

El cambio de plan se realiza vÃ­a la funciÃ³n `change_user_plan()` (SECURITY DEFINER), que:
1. Valida que sea el propio usuario o un admin
2. Actualiza `plan_type`, `plan_expires_at`, `subscription_credits` segÃºn el nuevo plan
3. Registra `credit_transaction` (subscription_grant) y `activity_log` (plan_change)
4. Retorna el resultado con los crÃ©ditos otorgados

### 4.6 Ocultar Plan Early Bird

Cuando quieras dejar de ofrecer Early Bird a nuevos usuarios:

```sql
-- Actualizar app_settings para marcar early_bird como no visible
UPDATE app_settings
SET value = jsonb_set(value, '{early_bird,visible}', 'false')
WHERE key = 'plans';
```

En el frontend, filtrar `planOptions` por `visible: true` consultando `app_settings`. Los usuarios existentes con early_bird **conservan su plan y precio** â€” el cron sigue renovando normalmente.

> **TODO frontend**: Actualmente las plan cards estÃ¡n hardcodeadas en SettingsPage. Para la versiÃ³n de producciÃ³n, se deberÃ­an cargar dinÃ¡micamente desde `app_settings.plans` y filtrar por `visible`.

---

## 5. Base de Datos y Migraciones

### MigraciÃ³n 001: `001_initial_schema.sql`
- 8 tablas completas con tipos, relaciones y defaults
- 10+ enums (plan_type, user_role, account_status, rental_status, etc.)
- RLS policies para todas las tablas
- FunciÃ³n `is_admin()` helper
- FunciÃ³n `handle_new_user()` trigger para crear perfil automÃ¡ticamente al registrarse
- Triggers `updated_at` en todas las tablas relevantes
- Realtime habilitado para `accounts` y `rentals`
- Seed data: 3 credit_packages + app_settings (plans)

### MigraciÃ³n 002: `002_early_bird_pgcron.sql`
- `ALTER TYPE plan_type ADD VALUE 'early_bird'`
- ActualizaciÃ³n de `app_settings.plans` con early_bird + campo `visible`
- `CREATE EXTENSION pg_cron`
- FunciÃ³n `renew_expired_subscriptions()` (SECURITY DEFINER)
- Cron schedule: diario a las 00:05 UTC
- FunciÃ³n `change_user_plan()` (SECURITY DEFINER, RPC)

### MigraciÃ³n 003: `003_lemonsqueezy_integration.sql`
- `ls_customer_id`, `ls_subscription_id` columns en profiles
- `ls_variant_id` column en credit_packages
- ActualizaciÃ³n de `app_settings.plans` con campos `ls_variant_id`
- Function `activate_subscription()` (SECURITY DEFINER) â€” activa plan tras checkout de LS
- Function `handle_subscription_renewal()` (SECURITY DEFINER) â€” renueva crÃ©ditos mensual (webhook)
- Function `cancel_subscription()` (SECURITY DEFINER) â€” cancela plan
- Function `add_purchased_credits()` (SECURITY DEFINER) â€” agrega crÃ©ditos tras compra one-time

### MigraciÃ³n 004: `005_match_based_rentals.sql`
- `matches_total`, `matches_used`, `last_match_at` columns added to `rentals`
- `duration_minutes` and `expires_at` columns **dropped** (fully removed)
- `rental_matches` table for individual match logging
- RLS policies + realtime for `rental_matches`
- New enum values: `match_detected`, `idle_timeout`, `rental_completed`, `completed`
- Seed: `match_packages` and `idle_timeout_minutes` in `app_settings`

### Estado de ejecuciÃ³n
| MigraciÃ³n | Estado |
|-----------|--------|
| 001_initial_schema.sql | âœ… Ejecutada |
| 002_early_bird_pgcron.sql | âœ… Ejecutada (pg_cron puede estar activo pero no se usa â€” ver nota) |
| 003_lemonsqueezy_integration.sql | âœ… Ejecutada |
| 005_match_based_rentals.sql | â³ Pendiente de ejecutar |

> **Nota sobre migraciÃ³n 004**: Esta migraciÃ³n elimina (`DROP`) las columnas `duration_minutes` y `expires_at` de la tabla `rentals`. AsegÃºrate de no tener rentals activos con datos importantes en esas columnas antes de ejecutar.

> **Nota**: Si se creÃ³ un cron job de pg_cron en Supabase, se puede eliminar de forma segura. La renovaciÃ³n se maneja vÃ­a GitHub Actions + Edge Function `renew-subscriptions`. Para borrarlo: Supabase Dashboard â†’ Database â†’ Extensions â†’ buscar "pg_cron" â†’ Cron Jobs, o ejecutar `SELECT cron.unschedule('renew-expired-subscriptions');`.

---

## 6. Consideraciones TÃ©cnicas Importantes

### 6.1 pg_cron no se utiliza â€” GitHub Actions como alternativa

**DecisiÃ³n: Supabase Free tier.** Se implementÃ³ alternativa:

| Componente | FunciÃ³n |
|-----------|--------|
| **Edge Function `renew-subscriptions`** | Ejecuta `renew_expired_subscriptions()` vÃ­a service_role |
| **GitHub Actions workflow** | Cron diario a las 00:05 UTC que invoca la Edge Function |
| **LS webhooks** | Para usuarios con Lemon Squeezy, la renovaciÃ³n se maneja vÃ­a `subscription_payment_success` webhook |

La funciÃ³n `renew_expired_subscriptions()` de migration 002 sigue siendo necesaria para planes asignados manualmente por el admin (sin LS). Para usuarios LS, el webhook `subscription_payment_success` maneja la renovaciÃ³n directamente.

**Estado**: âœ… Desplegado y configurado. GitHub Actions secrets seteados.

> Si existe un cron job de pg_cron creado en Supabase, se puede borrar de forma segura ya que no se utiliza.

### 6.2 Seguridad del cambio de plan

Actualmente el cambio de plan pasa por la funciÃ³n RPC `change_user_plan()` con SECURITY DEFINER, lo cual es seguro â€” la lÃ³gica vive en el servidor y el usuario no puede manipular los crÃ©ditos directamente.

**Sin embargo**, las RLS policies actuales de `profiles` permiten que un usuario haga `UPDATE` de cualquier columna de su propio perfil (incluyendo `plan_type`, `subscription_credits`). Esto es un **riesgo de seguridad**:

**SoluciÃ³n recomendada para producciÃ³n**:
```sql
-- Restringir quÃ© columnas puede actualizar un usuario normal
DROP POLICY "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own display_name"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Crear una funciÃ³n SECURITY DEFINER para actualizar solo display_name
CREATE OR REPLACE FUNCTION update_own_profile(new_display_name text)
RETURNS void AS $$
BEGIN
  UPDATE profiles SET display_name = new_display_name WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

> **TODO**: Implementar restricciÃ³n de columnas en RLS antes de producciÃ³n. El cambio de plan ya estÃ¡ protegido vÃ­a RPC, pero el perfil general no.

### 6.3 Discord OAuth

El cÃ³digo estÃ¡ implementado pero requiere configuraciÃ³n manual:

1. **Discord Developer Portal** â†’ New Application â†’ OAuth2
2. Agregar redirect: `https://TU_PROJECT_REF.supabase.co/auth/v1/callback`
3. **Supabase Dashboard** â†’ Auth â†’ Providers â†’ Discord
4. Ingresar Client ID (numÃ©rico, el Application ID) y Client Secret
5. El Client ID **debe ser el ID numÃ©rico** de la aplicaciÃ³n Discord, NO el nombre

**Error conocido**: Si se configura mal el Client ID, Supabase devuelve "El valor X no es snowflake" â€” significa que el Client ID no es numÃ©rico.

### 6.4 Lemon Squeezy Integration Architecture

**Procesador de pagos**: Lemon Squeezy actÃºa como Merchant of Record (MoR), gestionando impuestos, facturaciÃ³n y cumplimiento. Soporta merchants desde Colombia con usuarios globales.

**API**: `https://api.lemonsqueezy.com/v1` â€” formato JSON:API.

**Flujo de suscripciÃ³n:**
1. Usuario clic en plan card (SettingsPage) â†’ llama Edge Function `create-checkout`
2. Edge Function crea Checkout via LS API (POST `/v1/checkouts`) â†’ devuelve URL
3. App abre URL en navegador externo vÃ­a `shell.openExternal`
4. Usuario completa pago en LS Checkout
5. LS envÃ­a webhook `subscription_created` â†’ Edge Function `ls-webhook`
6. Webhook llama `activate_subscription()` â†’ actualiza perfil (plan, crÃ©ditos, ls_subscription_id, ls_customer_id)
7. App detecta cambio vÃ­a polling cada 5s

**Flujo de compra de crÃ©ditos:**
1. Usuario clic "Comprar" en paquete (CreditsPage) â†’ `create-checkout` con `type: credit_package`
2. Pago one-time en LS
3. Webhook `order_created` â†’ llama `add_purchased_credits()` â†’ suma crÃ©ditos al perfil

**RenovaciÃ³n mensual:**
- LS cobra automÃ¡ticamente â†’ webhook `subscription_payment_success` (billing_reason=renewal) â†’ `handle_subscription_renewal()` â†’ reset subscription_credits

**CancelaciÃ³n:**
- Via Customer Portal (LS) â†’ webhook `subscription_cancelled` â†’ `cancel_subscription()`

**GestiÃ³n:**
- BotÃ³n "Gestionar suscripciÃ³n" abre LS Customer Portal (URL pre-firmada, vÃ¡lida 24h)

**VerificaciÃ³n de webhooks:**
- Header `X-Signature` con HMAC SHA-256 hex digest del body
- VerificaciÃ³n con `timingSafeEqual` para prevenir timing attacks

**Variables de entorno (Edge Functions):**
- `LEMONSQUEEZY_API_KEY` â€” API key de LS
- `LEMONSQUEEZY_STORE_ID` â€” Store ID numÃ©rico
- `LEMONSQUEEZY_WEBHOOK_SECRET` â€” Signing secret del webhook
- `LS_VARIANT_EARLY_BIRD`, `LS_VARIANT_BASIC`, `LS_VARIANT_UNLIMITED` â€” Variant IDs de suscripciones
- `CRON_SECRET` â€” Secret para autenticar GitHub Actions

### 6.5 Electron en producciÃ³n

El Main Process maneja:
- Ventana frameless con controles IPC custom
- IPC handlers `riot:login`, `riot:kill`, `dialog:openFile`, `shell:openExternal`
- **`before-quit` handler**: Al cerrar la app, se ejecuta `killRiotClient()` automÃ¡ticamente para asegurar que el Riot Client no quede abierto.

Pendiente para producciÃ³n:
- Auto-updates vÃ­a electron-updater + GitHub Releases
- Endurecimiento de secretos en memoria (borrado explÃ­cito post-login)

### 6.6 Auto-login LoL (estado actual)

Implementado y probado de extremo a extremo en entorno real:

- Flujo principal por Riot Local API (`lockfile` + `/rso-auth/*` + `/riot-client-auth/*`).
- Fallback automÃ¡tico (Camino B) por teclado simulado cuando Riot bloquea API (`captcha_not_allowed`/`auth_failure`).
- Progreso en tiempo real Main â†’ Renderer (`riot:login-progress`) para observabilidad.
- Modo producciÃ³n: credenciales solo desde Supabase Edge Function (`get-credentials`).
- Eliminadas rutas de credenciales hardcodeadas/override por variables de entorno de test.

Notas de seguridad actuales del fallback UI:

- Verifica foco en cada tecla; si se pierde foco, aborta.
- Si se pierde foco o falla `BlockInput`, se fuerza cierre de Riot Client para limpiar campos parciales.
- `BlockInput` activado por defecto en Camino B (`RIOT_UI_BLOCK_INPUT=1`), pero puede fallar sin privilegios elevados.

### 6.7 EncriptaciÃ³n de credenciales

Las credenciales de las cuentas de LoL (`encrypted_password` en tabla `accounts`) aÃºn **no tienen encriptaciÃ³n implementada**. Actualmente se almacenan en texto plano. Para producciÃ³n:
- Encriptar con AES-256-GCM antes de guardar
- Desencriptar solo en Edge Function o Main Process (nunca en el Renderer)
- La clave de encriptaciÃ³n debe estar en variables de entorno del servidor (Supabase secrets)

### 6.8 Riot API â€” AprobaciÃ³n y ConfiguraciÃ³n

Para que `check-rental-matches` funcione en producciÃ³n, se necesita una API Key de Riot Games:

| Paso | Detalle |
|------|--------|
| 1 | Crear cuenta en **[developer.riotgames.com](https://developer.riotgames.com)** |
| 2 | Aceptar los Terms of Service de Riot Developer |
| 3 | Obtener **Development Key** (expira cada 24h â€” solo para testing) |
| 4 | Solicitar **Personal Key** â€” dura indefinidamente, aprobaciÃ³n light |
| 5 | En el formulario de registro, describir la app como "match stats tracker for personal use" |
| 6 | Una vez aprobada, configurar como secret en Supabase: `RIOT_API_KEY` |

**Endpoints usados:**
- `GET /lol/match/v5/matches/by-puuid/{puuid}/ids` â€” Lista match IDs desde una fecha
- `GET /lol/match/v5/matches/{matchId}` â€” Detalle de una partida (campeÃ³n, win, duraciÃ³n)

**Rate limits (Personal Key):**
- 20 requests / 1 segundo
- 100 requests / 2 minutos

**Importante:** La Personal Key es suficiente para ~100 cuentas con polling cada 3 min. Para escalar a mÃ¡s, se necesita solicitar una Production Key (proceso mÃ¡s largo con revisiÃ³n de Riot).

---

## 7. Bugs Resueltos

| # | Bug | SoluciÃ³n | Fecha |
|---|-----|----------|-------|
| 1 | Admin sidebar siempre marcaba "Dashboard" activo | `isActive()` con exact match para `/` y `/admin` | Feb 2026 |
| 2 | BotÃ³n logout no funcionaba | `handleLogout()` async en vez de `.then()` chain | Feb 2026 |
| 3 | Flecha del dropdown de usuario no hacÃ­a nada | Implementado dropdown con settings + logout + click-away | Feb 2026 |
| 4 | Filtro Activity Log ilegible en dark mode | CSS para `select option` con background/color del tema | Feb 2026 |
| 5 | JetBrains Mono 404 (woff2 URL v20 rota) | Migrado a Google Fonts CSS link en `index.html` | Feb 2026 |
| 6 | SettingsPage mostraba datos de plan desactualizados | `auth.fetchProfile()` en `onMounted` | Feb 2026 |
| 7 | SesiÃ³n no persistÃ­a / errores de AbortController | `syncSession()` + `authUnsubscribe` + try/catch robusto (arreglado por el usuario) | Feb 2026 |

| 8 | Orden de crÃ©ditos corregido | Subscription first (era purchased first) | Feb 2026 |
| 9 | Plan requerido para comprar crÃ©ditos | ValidaciÃ³n en CreditsPage + Edge Function | Feb 2026 |
| 10 | Stripe no soporta Colombia para merchants | MigraciÃ³n a Paddle, luego a Lemon Squeezy | Feb 2026 |
| 11 | Paddle rechazÃ³ dominio GitHub Pages | MigraciÃ³n a Lemon Squeezy como procesador final | Feb 2026 |
| 12 | payment-result caracteres corruptos (UTF-8) | HTML entities + texto en inglÃ©s | Feb 2026 |
| 13 | ls-webhook module not found (deno.land/std) | Cambio a `node:crypto` y `node:buffer` imports | Feb 2026 |
| 14 | redirect_url sin status param | Incluir `?status=success` en redirect_url del checkout | Feb 2026 |
| 15 | Build .exe falla por symlinks (7-zip) | Habilitar Developer Mode en Windows | Feb 2026 |
| 16 | Auto-login API bloqueado por Riot (`captcha_not_allowed`) | Fallback Camino B por teclado simulado + validaciÃ³n de foco + detecciÃ³n de tokens | Feb 2026 |
| 17 | Flujo opaco de autologin (sin visibilidad de etapas) | Progreso IPC `riot:login-progress` + estado en MyRentalsPage | Feb 2026 |
| 18 | Riesgo de exposiciÃ³n parcial al perder foco durante tipeo | Abort por foco + cierre inmediato de Riot Client + `BlockInput` por defecto | Feb 2026 |
| 19 | Cierre de app no mataba Riot Client | `before-quit` handler en main process que ejecuta `killRiotClient()` automÃ¡ticamente | Feb 2026 |

---

El MVP es la versiÃ³n mÃ­nima funcional que se puede distribuir a los primeros usuarios (amigos). Incluye todo lo necesario para que paguen, alquilen cuentas y las usen.

### 8.1 Bloque A â€” Pagos (âœ… Completado)

| Tarea | Estado | Detalle |
|-------|--------|---------|
| IntegraciÃ³n procesador de pagos | âœ… | Lemon Squeezy (Stripe â†’ Paddle â†’ LS por restricciones de Colombia) |
| Webhooks vÃ­a Edge Function | âœ… | `ls-webhook` â€” procesa subscription_created, updated, cancelled, payment_success, order_created |
| Vincular pago con cambio de plan | âœ… | Checkout â†’ webhook â†’ activate_subscription() |
| Portal de gestiÃ³n | âœ… | Customer Portal de Lemon Squeezy (URL pre-firmada) |
| Cripto manual (admin) | âœ… | El admin puede ajustar crÃ©ditos manualmente desde el panel |
| Landing page + docs legales | âœ… | GitHub Pages para aprobaciÃ³n del procesador de pagos |
| Deploy Edge Functions | âœ… | 5 funciones desplegadas en Supabase |
| Secrets configurados | âœ… | Supabase Edge Functions + GitHub Actions |
| SuscripciÃ³n probada | âœ… | Checkout â†’ pago â†’ webhook â†’ plan activado â†’ email confirmaciÃ³n |

### 8.2 Bloque B â€” Auto-Login LoL (âœ… Implementado, en hardening)

| Tarea | Prioridad | Estimado | Detalle |
|-------|-----------|----------|---------|
| IPC handlers Main â†” Renderer | âœ… | â€” | `riot:login`, `riot:kill`, `riot:login-progress` |
| Auto-login por Riot Local API | âœ… | â€” | Flujo lockfile + sesiÃ³n RSO + login-token |
| Fallback UI (Camino B) | âœ… | â€” | Teclado simulado con validaciÃ³n de foco y `BlockInput` |
| BotÃ³n "Iniciar SesiÃ³n" en UI | âœ… | â€” | En MyRentalsPage para rental activo |
| Endurecer limpieza de secretos en memoria | ðŸ”´ Alta | 0.5-1 dÃ­a | Borrado explÃ­cito de buffers/strings sensibles tras uso |

### 8.3 Bloque C â€” Seguridad (CrÃ­tico â€” SIGUIENTE PASO)

| Tarea | Prioridad | Estimado | Detalle |
|-------|-----------|----------|---------|
| Restringir RLS de profiles | ðŸ”´ Alta | 0.5 dÃ­as | Solo permitir UPDATE de `display_name`, todo lo demÃ¡s vÃ­a SECURITY DEFINER |
| EncriptaciÃ³n de passwords de cuentas | ðŸ”´ Alta | 1 dÃ­a | AES-256-GCM en DB, decrypt solo server-side |
| Edge Function para decrypt credentials | ðŸ”´ Alta | 1 dÃ­a | Solo accesible con rental activo vÃ¡lido |

### 8.4 Bloque D â€” Estabilidad

| Tarea | Prioridad | Estimado | Detalle |
|-------|-----------|----------|---------|
| Heartbeat system | âœ… (pendiente deploy) | â€” | Ping cada 60s + sweep server-side (libera cuenta si ~3min sin heartbeat) |
| ExpiraciÃ³n de rentals (client-side) | âœ… Completado | â€” | Modelo por partidas: el servidor (`check-rental-matches`) gestiona completar rentals cuando se alcanzan las partidas. El cliente muestra progreso en tiempo real. No hay temporizador. |
| Global toast notifications | ðŸŸ¡ Media | 0.5 dÃ­as | Feedback visual para success/error en todas las acciones |
| Cargar plan visibility desde app_settings | ðŸŸ¢ Baja | 0.5 dÃ­as | Para poder ocultar early_bird sin deploy |

### 8.5 Bloque E â€” DistribuciÃ³n

| Tarea | Prioridad | Estimado | Detalle |
|-------|-----------|----------|---------|
| Build de producciÃ³n Windows (.exe) | âœ… Listo | â€” | `npm run build:win` genera instalador NSIS |
| Auto-updates (electron-updater) | ðŸŸ¡ Media | 1 dÃ­a | GitHub Releases como host |
| Smoke test completo | ðŸ”´ Alta | 1 dÃ­a | Registro â†’ login â†’ comprar plan â†’ alquilar â†’ auto-login â†’ liberar |

### EstimaciÃ³n restante MVP: ~5-8 dÃ­as de trabajo (Bloques C + D + E parcial)

---

## 9. Lo que Falta para el App Completa

MÃ¡s allÃ¡ del MVP, estas son las fases posteriores:

### Fase 2 â€” Core Features (3-4 semanas post-MVP)

| Feature | Detalle |
|---------|---------|
| **Riot API sync** | Edge Function cron que sincroniza elo/LP/stats de las ~100 cuentas cada hora. Personal Key del Developer Portal. |
| **Notificaciones in-app** | Alquiler por expirar (5min antes), crÃ©ditos bajos (<100), plan por vencer |
| **Dashboard mÃ©tricas admin** | GrÃ¡ficos: ingresos, alquileres/dÃ­a, usuarios activos, cuentas mÃ¡s usadas |
| **Onboarding flow** | Primera vez que abre el app â†’ tour guiado |
| **Mejoras UI** | Animaciones con @vueuse/motion, skeletons, empty states mejorados |
| **PayPal** | Si hay demanda entre los usuarios |

### Fase 3 â€” Polish (2-3 semanas)

| Feature | Detalle |
|---------|---------|
| **Testing E2E** | Playwright o similar para flujos crÃ­ticos |
| **Monitoreo / logging** | Sentry o similar para errores en producciÃ³n |
| **Backup automÃ¡tico** | Supabase backups (Pro tier) o export manual |
| **Rate limiting** | Evitar abuso de la API desde el cliente |
| **Audit trail completo** | Todos los eventos admin en activity_log |

### Fase 4 â€” ExpansiÃ³n (post-launch)

| Feature | Detalle |
|---------|---------|
| **Soporte multi-juego** | Valorant, TFT, etc. |
| **NOWPayments** | Crypto automatizado si escala a pÃºblico |
| **Landing page** | Website pÃºblico para atraer nuevos usuarios |
| **Sistema de referidos** | Invita amigos â†’ crÃ©ditos gratis |
| **App mÃ³vil (opcional)** | Monitor de rentals desde el telÃ©fono |

---

## 10. Acciones Pendientes del Usuario

### Completadas

| # | AcciÃ³n | Estado |
|---|--------|--------|
| 1 | Crear proyecto Supabase | âœ… |
| 2 | Ejecutar migraciÃ³n 001 | âœ… |
| 3 | Ejecutar migraciÃ³n 002 | âœ… |
| 4 | Ejecutar migraciÃ³n 003 (Lemon Squeezy) | âœ… |
| 5 | Crear `.env` con SUPABASE_URL y ANON_KEY | âœ… |
| 6 | Habilitar Auth email/password | âœ… |
| 7 | Crear cuenta en Lemon Squeezy | âœ… |
| 8 | Crear productos/variantes en LS (3 suscripciones) | âœ… |
| 9 | Configurar webhook en LS | âœ… |
| 10 | Deploy 5 Edge Functions | âœ… |
| 11 | Setear secrets en Supabase Edge Functions | âœ… |
| 12 | Setear secrets en GitHub Actions | âœ… |
| 13 | Generar build .exe de Windows | âœ… |
| 14 | Probar suscripciÃ³n (checkout â†’ pago â†’ plan activado) | âœ… |

### Pendientes

| # | AcciÃ³n | Detalle |
|---|--------|---------|
| 15 | **Probar compra de crÃ©ditos** | Verificar que los productos one-time en LS estÃ©n publicados y que `credit_packages.ls_variant_id` estÃ© seteado en la DB |
| 16 | **Promover usuario a admin** | `UPDATE profiles SET role = 'admin' WHERE id = 'TU-USER-ID';` |
| 17 | **Cargar cuentas LoL en la DB** | Via panel admin o SQL directo |
| 18 | **(Opcional) Borrar cron de pg_cron** | `SELECT cron.unschedule('renew-expired-subscriptions');` o desde Supabase Dashboard |

### Para Discord OAuth (dejado para el final)

| # | AcciÃ³n | Detalle |
|---|--------|---------|
| 19 | Crear aplicaciÃ³n en Discord Developer Portal | [discord.com/developers](https://discord.com/developers/applications) |
| 20 | Copiar Application ID (numÃ©rico) y Client Secret | |
| 21 | Agregar redirect URL | `https://sisitxrcjovkvfeqlkwx.supabase.co/auth/v1/callback` |
| 22 | Configurar en Supabase | Auth â†’ Providers â†’ Discord â†’ Client ID + Secret |

---

## 11. Riesgos y Deuda TÃ©cnica

### Riesgos Altos

| Riesgo | Impacto | MitigaciÃ³n |
|--------|---------|------------|
| **Sin pasarela de pago** | âœ… Resuelto | Lemon Squeezy integrado y funcionando (suscripciones probadas) |
| **RLS de profiles muy permisivo** | Un usuario tÃ©cnico podrÃ­a darse crÃ©ditos infinitos via SDK | Restringir RLS a solo `display_name`, forzar todo lo demÃ¡s vÃ­a SECURITY DEFINER |
| **Credenciales LoL parcialmente visibles si falla el bloqueo/foco en Camino B** | ExposiciÃ³n parcial local en la UI del cliente de Riot | Ejecutar con privilegios elevados para `BlockInput`, abort fail-closed y cierre inmediato del cliente (implementado), mÃ¡s limpieza de memoria pendiente |
| **Heartbeat no desplegado aÃºn** | Solo observabilidad admin; no afecta ciclo de vida de rentals | Deploy Edge Functions `heartbeat-ping`/`heartbeat-sweep` + workflow `heartbeat-sweep.yml`. El tracking real de rentals lo hace `check-rental-matches` |
| **check-rental-matches no desplegado aÃºn** | No se descontarÃ¡n partidas ni se aplicarÃ¡ idle timeout hasta deployar | Deploy Edge Function `check-rental-matches` + workflow `check-rental-matches.yml` + configurar `RIOT_API_KEY` en Supabase secrets (ver secciÃ³n 6.8) |
| **MigraciÃ³n 004 no ejecutada aÃºn** | Tabla `rental_matches` y columnas match-based no existen en DB. Columnas legacy `duration_minutes`/`expires_at` no se eliminarÃ¡n. | Ejecutar `005_match_based_rentals.sql` en Supabase SQL Editor |

### Riesgos Medios

| Riesgo | Impacto | MitigaciÃ³n |
|--------|---------|------------|
| pg_cron no disponible en Free tier | âœ… Resuelto | Edge Function + GitHub Actions como alternativa implementada y desplegada |
| **Discord OAuth mal configurado** | Usuarios no pueden loguear con Discord | Dejado para el final â€” documentaciÃ³n clara de configuraciÃ³n |
| **Sin auto-updates** | Los usuarios tendrÃ­an que descargar manualmente cada actualizaciÃ³n | electron-updater + GitHub Releases (Fase 2) |
| **Compra de crÃ©ditos con error CORS** | Usuarios no pueden comprar crÃ©ditos extra | Probablemente producto no publicado en LS o ls_variant_id faltante en DB |

### Deuda TÃ©cnica

| Item | Severidad | Detalle |
|------|-----------|---------|
| Plan cards hardcodeadas | Baja | DeberÃ­an cargarse dinÃ¡micamente desde `app_settings.plans` |
| Lint warnings en Sidebar | CosmÃ©tico | `pl-[9px]` â†’ `pl-2.25`, `bg-gradient-to-br` â†’ `bg-linear-to-br` (Tailwind v4) |
| `@theme` warning en CSS | CosmÃ©tico | Linter no reconoce Tailwind v4, funciona correctamente |
| Sin validaciÃ³n de pago en plan change | âœ… Resuelto | Plan change ahora pasa por Lemon Squeezy Checkout |
| Orden de consumo de crÃ©ditos | âœ… Resuelto | Subscription primero, purchased despuÃ©s |
| Documentos legales mencionan Paddle | Baja | Actualizar terms/privacy/refund para decir "Lemon Squeezy" |

---

> **Documento generado para AccountFlow v1.0.0**
> Ãšltima actualizaciÃ³n: 15 de febrero de 2026
> PrÃ³xima revisiÃ³n sugerida: despuÃ©s de ejecutar migraciÃ³n 004, deployar `check-rental-matches`, y configurar `RIOT_API_KEY` (ver secciÃ³n 6.8).
