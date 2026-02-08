# AccountFlow — Documento de Progreso

> Última actualización: 8 de febrero de 2026

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
| **Build** | Limpio, 0 errores, ~1789 módulos |
| **Fase actual** | Fase 1 completa + Stripe integrado + correcciones post-MVP |
| **Páginas** | 11 (Login, Register, Dashboard, Accounts, MyRentals, Credits, Settings, Admin ×4) |
| **Stores** | 4 (auth, accounts, rentals, admin) |
| **Rutas** | 11 con guards de auth y admin |
| **Migraciones SQL** | 3 (001_initial_schema + 002_early_bird_pgcron + 003_stripe_integration) |
| **Edge Functions** | 5 (create-checkout, stripe-webhook, customer-portal, renew-subscriptions, payment-result) |

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
- [x] Recarga mensual automática vía `pg_cron` (función `renew_expired_subscriptions()`)
- [x] Unlimited: sin créditos, alquiler ilimitado (1 cuenta a la vez), sin compra de créditos
- [x] Early Bird: $6/mes, 1000 créditos, badge "40% OFF · Tiempo limitado"
- [x] Plan cards en SettingsPage con feedback visual

#### Pagos y Stripe
- [x] Integración Stripe Checkout para suscripciones (early_bird, basic, unlimited)
- [x] Integración Stripe Checkout para compra de créditos (paquetes)
- [x] Edge Function `create-checkout` (crea sesiones de Stripe Checkout)
- [x] Edge Function `stripe-webhook` (procesa eventos: checkout.session.completed, invoice.paid, customer.subscription.deleted, invoice.payment_failed)
- [x] Edge Function `customer-portal` (URL del portal de facturación Stripe)
- [x] Edge Function `payment-result` (página HTML de resultado post-pago)
- [x] Edge Function `renew-subscriptions` (alternativa a pg_cron para Free tier)
- [x] GitHub Actions workflow `renew-subscriptions.yml` (cron diario 00:05 UTC)
- [x] SQL migration 003: funciones server-side (activate_subscription, handle_subscription_renewal, cancel_subscription, add_purchased_credits)
- [x] IPC `shell:openExternal` para abrir URLs de Stripe en el navegador
- [x] Stripe Customer Portal para gestionar/cancelar suscripción
- [x] Polling de perfil cada 5s en SettingsPage y CreditsPage (detectar cambios post-pago)
- [x] Validación: requiere plan activo para comprar créditos
- [x] Validación: Unlimited no puede comprar créditos
- [x] Columnas `stripe_subscription_id` en profiles, `stripe_price_id` en credit_packages

#### Reglas de Negocio Corregidas
- [x] Orden de créditos: subscription se gasta primero, luego purchased
- [x] Unlimited: sin créditos, alquiler directo ilimitado ($30/mes pago con Stripe)
- [x] Requiere plan activo para comprar créditos extra

#### Base de Datos
- [x] 8 tablas: profiles, accounts, rentals, credit_transactions, payments, credit_packages, activity_log, app_settings
- [x] Todos los enums definidos
- [x] RLS policies para todas las tablas
- [x] Triggers para `updated_at` y `handle_new_user`
- [x] Seed data para credit_packages y app_settings
- [x] Migración 002: pg_cron + early_bird + change_user_plan RPC

#### UI/UX
- [x] Sidebar con navegación, plan badge (incluye Unlimited ∞), dropdown de usuario
- [x] Active state correcto en sidebar para rutas admin
- [x] Header con breadcrumbs y balance de créditos
- [x] TitleBar custom (minimizar, maximizar, cerrar)
- [x] Dropdowns con colores legibles en dark mode
- [x] Layout glassmorphism en login/register

### ⚠️ Parcialmente Implementado
- [ ] Discord OAuth — Código listo, pero requiere configuración manual en Discord Developer Portal + Supabase
- [ ] Stripe — Código completo (Edge Functions + frontend), requiere configuración manual:
  - Crear productos/precios en Stripe Dashboard
  - Configurar webhook endpoint
  - Setear secrets en Supabase (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_*)
  - Actualizar `stripe_price_id` en credit_packages
- [ ] Riot Client path — Campo existe en Settings, pero no se guarda ni se utiliza aún
- [ ] pg_cron alternativa — Edge Function + GitHub Actions listos, requieren setear secrets en GitHub repo

### ❌ No Implementado Aún
- [ ] Auto-login LoL (nut.js)
- [ ] Heartbeat system
- [ ] Riot API sync
- [ ] Auto-updates (electron-updater)
- [ ] Notificaciones in-app

---

## 3. Arquitectura Implementada

```
accountflow/
├── docs/
│   ├── plan.md                          # Plan original del proyecto
│   ├── ui-spec.md                       # Especificación UI/UX
│   └── progress.md                      # Este documento
│
├── .github/
│   └── workflows/
│       └── renew-subscriptions.yml      # Cron diario — alternativa a pg_cron
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql       # Schema completo (8 tablas, RLS, triggers, seed)
│   │   ├── 002_early_bird_pgcron.sql    # early_bird enum, pg_cron, change_user_plan RPC
│   │   └── 003_stripe_integration.sql   # Stripe columns, server-side functions
│   └── functions/
│       ├── create-checkout/index.ts     # Crea sesiones de Stripe Checkout
│       ├── stripe-webhook/index.ts      # Procesa webhooks de Stripe
│       ├── customer-portal/index.ts     # URL del portal de facturación
│       ├── renew-subscriptions/index.ts # Renueva suscripciones expiradas
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
│           │   ├── stripe.ts            # Helpers: checkoutSubscription, checkoutCreditPackage, openCustomerPortal
│           │   └── utils.ts             # cn() helper
│           ├── types/database.ts        # Tipos TS del schema (actualizado con stripe fields)
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

### Migración 003: `003_stripe_integration.sql`
- `stripe_subscription_id` column en profiles
- `stripe_price_id` column en credit_packages
- Actualización de `app_settings.plans` con campos `stripe_price_id`
- Function `activate_subscription()` (SECURITY DEFINER) — activa plan tras checkout
- Function `handle_subscription_renewal()` (SECURITY DEFINER) — renueva créditos mensual
- Function `cancel_subscription()` (SECURITY DEFINER) — cancela plan
- Function `add_purchased_credits()` (SECURITY DEFINER) — agrega créditos tras compra

### Estado de ejecución
| Migración | Estado |
|-----------|--------|
| 001_initial_schema.sql | ⚠️ Pendiente de ejecutar por el usuario en Supabase SQL Editor |
| 002_early_bird_pgcron.sql | ⚠️ Pendiente — **comentar las líneas de pg_cron** (CREATE EXTENSION y cron.schedule) si estás en Free tier |
| 003_stripe_integration.sql | ⚠️ Pendiente de ejecutar por el usuario en Supabase SQL Editor |

---

## 6. Consideraciones Técnicas Importantes

### 6.1 pg_cron requiere Supabase Pro ($25/mes)

**Decisión: Supabase Free tier.** Se implementó alternativa:

| Componente | Función |
|-----------|--------|
| **Edge Function `renew-subscriptions`** | Ejecuta `renew_expired_subscriptions()` vía service_role |
| **GitHub Actions workflow** | Cron diario a las 00:05 UTC que invoca la Edge Function |
| **Stripe webhooks** | Para usuarios con Stripe, la renovación se maneja vía `invoice.paid` webhook |

La función `renew_expired_subscriptions()` de migration 002 sigue siendo necesaria para planes asignados manualmente por el admin (sin Stripe). Para usuarios Stripe, el webhook `invoice.paid` maneja la renovación directamente.

**Setup requerido:**
1. Deploy Edge Functions: `supabase functions deploy renew-subscriptions --no-verify-jwt`
2. Setear secret: `supabase secrets set CRON_SECRET=tu-secret-random`
3. GitHub repo secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

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

### 6.4 Stripe Integration Architecture

**Flujo de suscripción:**
1. Usuario clic en plan card (SettingsPage) → llama Edge Function `create-checkout`
2. Edge Function crea Stripe Checkout Session → devuelve URL
3. App abre URL en navegador externo vía `shell.openExternal`
4. Usuario completa pago en Stripe
5. Stripe envía webhook `checkout.session.completed` → Edge Function `stripe-webhook`
6. Webhook llama `activate_subscription()` → actualiza perfil (plan, créditos, stripe_subscription_id)
7. App detecta cambio via polling cada 5s

**Flujo de compra de créditos:**
1. Usuario clic "Comprar" en paquete (CreditsPage) → `create-checkout` con `type: credit_package`
2. Pago one-time en Stripe
3. Webhook llama `add_purchased_credits()` → suma créditos al perfil

**Renovación mensual:**
- Stripe cobra automáticamente → webhook `invoice.paid` → `handle_subscription_renewal()` → reset subscription_credits

**Cancelación:**
- Via Customer Portal (Stripe) o directo en la app → webhook `customer.subscription.deleted` → `cancel_subscription()`

**Gestión:**
- Botón "Gestionar suscripción" abre Stripe Customer Portal (cambiar método de pago, cancelar, etc.)

### 6.5 Electron en producción

El Main Process actual solo maneja la ventana frameless. Para producción necesita:
- IPC handlers para nut.js (auto-login)
- Process monitor para detectar cierre del Riot Client
- Heartbeat hacia Supabase
- Auto-updates vía electron-updater + GitHub Releases
- `before-quit` handler para limpiar rentals activos

### 6.5 Encriptación de credenciales

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

---

El MVP es la versión mínima funcional que se puede distribuir a los primeros usuarios (amigos). Incluye todo lo necesario para que paguen, alquilen cuentas y las usen.

### 8.1 Bloque A — Pagos (Crítico)

| Tarea | Prioridad | Estimado | Detalle |
|-------|-----------|----------|---------|
| Integración Stripe Checkout | 🔴 Alta | 3-4 días | Suscripciones (early_bird, basic, unlimited) + compra de créditos |
| Stripe Webhooks vía Edge Function | 🔴 Alta | 1-2 días | `stripe-webhook` Edge Function: procesar `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted` |
| Vincular pago con cambio de plan | 🔴 Alta | 1 día | Actualmente el cambio de plan es "gratis" (sin validar pago). Con Stripe: primero se paga, el webhook actualiza el plan |
| Portal de facturación Stripe | 🟡 Media | 0.5 días | Para que el usuario cancele/actualice suscripción desde Stripe |
| Cripto manual (admin) | 🟢 Baja | Ya existe | El admin ya puede ajustar créditos manualmente desde el panel |

### 8.2 Bloque B — Auto-Login LoL (Crítico)

| Tarea | Prioridad | Estimado | Detalle |
|-------|-----------|----------|---------|
| IPC handlers Main ↔ Renderer | 🔴 Alta | 1 día | Canales tipados para solicitar login/cierre |
| nut.js auto-login | 🔴 Alta | 2-3 días | Detectar/abrir Riot Client, esperar ventana login, escribir credenciales |
| Cierre automático del cliente | 🔴 Alta | 0.5 días | `taskkill` Riot Client al expirar rental o cerrar app |
| Desencriptación de credenciales | 🔴 Alta | 1 día | AES-256 decrypt en Main Process, limpieza de memoria |
| Botón "Iniciar Sesión" en UI | 🟡 Media | 0.5 días | En MyRentalsPage, para el rental activo |

### 8.3 Bloque C — Seguridad (Crítico)

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
| Edge Function o alternativa para pg_cron | 🟡 Media | 1 día | Si no se usa Supabase Pro |
| Cargar plan visibility desde app_settings | 🟢 Baja | 0.5 días | Para poder ocultar early_bird sin deploy |

### 8.5 Bloque E — Distribución

| Tarea | Prioridad | Estimado | Detalle |
|-------|-----------|----------|---------|
| Build de producción Windows (.exe) | 🔴 Alta | 0.5 días | `electron-builder --win` |
| Auto-updates (electron-updater) | 🟡 Media | 1 día | GitHub Releases como host |
| Smoke test completo | 🔴 Alta | 1 día | Registro → login → comprar plan → alquilar → auto-login → liberar |

### Estimación total MVP: ~15-20 días de trabajo

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

Estas acciones requieren intervención manual y no pueden ser automatizadas por Cascade:

### Inmediatas (antes de poder probar)

| # | Acción | Detalle |
|---|--------|---------|
| 1 | **Crear proyecto Supabase** | [supabase.com](https://supabase.com) → New Project |
| 2 | **Ejecutar migración 001** | SQL Editor → pegar contenido de `supabase/migrations/001_initial_schema.sql` → Run |
| 3 | **Ejecutar migración 002** | SQL Editor → pegar `002_early_bird_pgcron.sql`. **IMPORTANTE**: Comentar `CREATE EXTENSION IF NOT EXISTS pg_cron;` y las líneas de `cron.schedule` (estás en Free tier). Las funciones `renew_expired_subscriptions()` y `change_user_plan()` SÍ se crean. |
| 4 | **Ejecutar migración 003** | SQL Editor → pegar `003_stripe_integration.sql` → Run |
| 5 | **Crear `.env`** | Copiar `.env.example` → renombrar a `.env` → llenar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` |
| 6 | **Probar login** | `npm run dev` → registrar usuario → verificar que se crea el perfil |
| 7 | **Promover a admin** | `UPDATE profiles SET role = 'admin' WHERE id = 'TU-USER-ID';` |

### Para Stripe

| # | Acción | Detalle |
|---|--------|--------|
| 8 | **Crear cuenta Stripe** | [stripe.com](https://stripe.com) |
| 9 | **Crear productos en Stripe** | 3 suscripciones: Early Bird ($6/mes), Basic ($10/mes), Unlimited ($30/mes). 3 paquetes one-time: Starter ($5), Popular ($10), Pro ($22) |
| 10 | **Copiar Price IDs** | Cada producto tiene un `price_id` (ej: `price_1Abc...`) |
| 11 | **Deploy Edge Functions** | `supabase functions deploy create-checkout`, `stripe-webhook --no-verify-jwt`, `customer-portal`, `renew-subscriptions --no-verify-jwt`, `payment-result --no-verify-jwt` |
| 12 | **Setear secrets en Supabase** | `supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx STRIPE_WEBHOOK_SECRET=whsec_xxx STRIPE_PRICE_EARLY_BIRD=price_xxx STRIPE_PRICE_BASIC=price_xxx STRIPE_PRICE_UNLIMITED=price_xxx CRON_SECRET=tu-secret` |
| 13 | **Configurar webhook en Stripe** | Endpoint: `https://TU_PROJECT.supabase.co/functions/v1/stripe-webhook`. Eventos: `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`, `invoice.payment_failed` |
| 14 | **Actualizar credit_packages** | `UPDATE credit_packages SET stripe_price_id = 'price_xxx' WHERE name = 'Starter';` (repetir para cada paquete) |
| 15 | **Configurar Customer Portal** | Stripe Dashboard → Settings → Customer Portal → Habilitar cancelación y cambio de plan |

### Para GitHub Actions (cron de renovación)

| # | Acción | Detalle |
|---|--------|--------|
| 16 | **Push repo a GitHub** | El workflow `.github/workflows/renew-subscriptions.yml` ya está creado |
| 17 | **Setear secrets en GitHub** | Settings → Secrets → `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` |

### Para Discord OAuth

| # | Acción | Detalle |
|---|--------|---------|
| 18 | Crear aplicación en Discord Developer Portal | [discord.com/developers](https://discord.com/developers/applications) |
| 19 | Copiar Application ID (numérico) y Client Secret | |
| 20 | Agregar redirect URL | `https://TU_PROJECT_REF.supabase.co/auth/v1/callback` |
| 21 | Configurar en Supabase | Auth → Providers → Discord → Client ID + Secret |

### Decisión requerida

| # | Decisión | Estado |
|---|----------|--------|
| ~14~ | ~¿Supabase Free o Pro?~ | ✅ **Free** — alternativa a pg_cron implementada |
| ~15~ | ~¿Cuántos créditos Unlimited?~ | ✅ **Cero** — $30/mes = alquiler ilimitado sin créditos |
| 16 | **¿Credenciales LoL ya están en la DB?** | Pendiente — para planificar encriptación AES-256 |

---

## 11. Riesgos y Deuda Técnica

### Riesgos Altos

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| **Sin pasarela de pago** | ✅ Resuelto | Stripe integrado (código completo, pendiente configuración) |
| **RLS de profiles muy permisivo** | Un usuario técnico podría darse créditos infinitos via SDK | Restringir RLS a solo `display_name`, forzar todo lo demás vía SECURITY DEFINER |
| **Credenciales LoL sin encriptar** | Si la DB se compromete, se exponen todas las cuentas | Implementar AES-256-GCM antes de cargar datos reales |
| **Sin heartbeat** | Un usuario puede cerrar el app y mantener la cuenta lockeada indefinidamente | Implementar heartbeat + auto-release |

### Riesgos Medios

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| pg_cron no disponible en Free tier | ✅ Resuelto | Edge Function + GitHub Actions como alternativa implementada |
| **Discord OAuth mal configurado** | Usuarios no pueden loguear con Discord | Documentación clara de configuración (sección 10) |
| **Sin auto-updates** | Los usuarios tendrían que descargar manualmente cada actualización | electron-updater + GitHub Releases (Fase 2) |

### Deuda Técnica

| Item | Severidad | Detalle |
|------|-----------|---------|
| Plan cards hardcodeadas | Baja | Deberían cargarse dinámicamente desde `app_settings.plans` |
| Lint warnings en Sidebar | Cosmético | `pl-[9px]` → `pl-2.25`, `bg-gradient-to-br` → `bg-linear-to-br` (Tailwind v4) |
| `@theme` warning en CSS | Cosmético | Linter no reconoce Tailwind v4, funciona correctamente |
| Sin validación de pago en plan change | ✅ Resuelto | Plan change ahora pasa por Stripe Checkout. Admin puede cambiar planes vía RPC directamente. |
| Orden de consumo de créditos | ✅ Resuelto | Subscription primero, purchased después. |

---

> **Documento generado para AccountFlow v1.0.0**
> Próxima revisión sugerida: después de implementar Stripe y auto-login.
