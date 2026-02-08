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
| **Build** | Limpio, 0 errores, ~1788 módulos |
| **Fase actual** | Fase 1 completa + correcciones post-MVP en curso |
| **Páginas** | 11 (Login, Register, Dashboard, Accounts, MyRentals, Credits, Settings, Admin ×4) |
| **Stores** | 4 (auth, accounts, rentals, admin) |
| **Rutas** | 11 con guards de auth y admin |
| **Migraciones SQL** | 2 (001_initial_schema + 002_early_bird_pgcron) |

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
- [ ] Pagos — UI de paquetes de créditos existe, pero sin integración de pasarela (Stripe pendiente)
- [ ] Riot Client path — Campo existe en Settings, pero no se guarda ni se utiliza aún

### ❌ No Implementado Aún
- [ ] Auto-login LoL (nut.js)
- [ ] Heartbeat system
- [ ] Stripe integration
- [ ] Riot API sync
- [ ] Auto-updates (electron-updater)
- [ ] Notificaciones in-app
- [ ] Edge Functions de Supabase

---

## 3. Arquitectura Implementada

```
accountflow/
├── docs/
│   ├── plan.md                          # Plan original del proyecto
│   ├── ui-spec.md                       # Especificación UI/UX
│   └── progress.md                      # Este documento
│
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql       # Schema completo (8 tablas, RLS, triggers, seed)
│       └── 002_early_bird_pgcron.sql    # early_bird enum, pg_cron, change_user_plan RPC
│
├── src/
│   ├── main/index.ts                    # Electron Main Process (frameless window)
│   ├── preload/index.ts                 # contextBridge + IPC tipado
│   └── renderer/
│       ├── index.html                   # CSP + Google Fonts
│       └── src/
│           ├── main.ts                  # Entry: Pinia + Router + auth.initialize()
│           ├── App.vue                  # Router view
│           ├── assets/main.css          # Tailwind + theme CSS variables
│           ├── lib/
│           │   ├── supabase.ts          # Cliente Supabase con fetchWithTimeout
│           │   └── utils.ts             # cn() helper
│           ├── types/database.ts        # Tipos TS del schema
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
- **Orden de consumo**: Primero se gastan créditos comprados (`purchased`), luego los de suscripción.
- **Unlimited → otro plan**: Los créditos comprados que tenía se conservan. Los de suscripción del nuevo plan se suman.
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

### Estado de ejecución
| Migración | Estado |
|-----------|--------|
| 001_initial_schema.sql | ⚠️ Pendiente de ejecutar por el usuario en Supabase SQL Editor |
| 002_early_bird_pgcron.sql | ⚠️ Pendiente de ejecutar por el usuario en Supabase SQL Editor |

---

## 6. Consideraciones Técnicas Importantes

### 6.1 pg_cron requiere Supabase Pro ($25/mes)

**Problema**: `CREATE EXTENSION pg_cron` solo está disponible en Supabase **Pro plan** ($25/mes) o superior. En el Free tier, la migración 002 fallará en esa línea.

**Alternativas si estás en Free tier**:

| Alternativa | Costo | Complejidad | Fiabilidad |
|-------------|-------|-------------|------------|
| **Supabase Edge Function + cron externo** | $0 | Media | Alta |
| **GitHub Actions cron** | $0 | Baja | Alta |
| **cron-job.org** | $0 | Baja | Media |
| **Cliente (app abierta)** | $0 | Baja | ❌ Baja — depende del usuario |

**Recomendación**: Crear una **Supabase Edge Function** `renew-subscriptions` que ejecute la misma lógica SQL, y invocarla con un **GitHub Actions workflow** programado diariamente:

```yaml
# .github/workflows/renew-subscriptions.yml
name: Renew Subscriptions
on:
  schedule:
    - cron: '5 0 * * *' # 00:05 UTC diario
jobs:
  renew:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -X POST \
            'https://TU_PROJECT.supabase.co/functions/v1/renew-subscriptions' \
            -H 'Authorization: Bearer TU_SERVICE_ROLE_KEY'
```

Esto da el mismo resultado que pg_cron a costo $0. **Pendiente de implementar si se decide no usar Pro tier.**

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

### 6.4 Electron en producción

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

---

## 8. Lo que Falta para el MVP

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
| 3 | **Ejecutar migración 002** | SQL Editor → pegar `002_early_bird_pgcron.sql`. **Nota**: si estás en Free tier, comenta la línea `CREATE EXTENSION IF NOT EXISTS pg_cron;` y todo lo relacionado al cron schedule (líneas de `cron.schedule`). La función `renew_expired_subscriptions()` y `change_user_plan()` sí se pueden crear. |
| 4 | **Crear `.env`** | Copiar `.env.example` → renombrar a `.env` → llenar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` |
| 5 | **Probar login** | `npm run dev` → registrar usuario → verificar que se crea el perfil |
| 6 | **Promover a admin** | `UPDATE profiles SET role = 'admin' WHERE id = 'TU-USER-ID';` |

### Para Discord OAuth

| # | Acción | Detalle |
|---|--------|---------|
| 7 | Crear aplicación en Discord Developer Portal | [discord.com/developers](https://discord.com/developers/applications) |
| 8 | Copiar Application ID (numérico) y Client Secret | |
| 9 | Agregar redirect URL | `https://TU_PROJECT_REF.supabase.co/auth/v1/callback` |
| 10 | Configurar en Supabase | Auth → Providers → Discord → Client ID + Secret |

### Para Stripe (cuando se implemente)

| # | Acción | Detalle |
|---|--------|---------|
| 11 | Crear cuenta Stripe | [stripe.com](https://stripe.com) |
| 12 | Crear productos/precios | 3 suscripciones (early_bird $6, basic $10, unlimited $30) + paquetes de créditos |
| 13 | Configurar webhook endpoint | Apuntar a la Edge Function cuando se cree |

### Decisión requerida

| # | Decisión | Opciones |
|---|----------|----------|
| 14 | **¿Supabase Free o Pro?** | Free ($0, necesita alternativa a pg_cron) vs Pro ($25/mes, pg_cron nativo + backups + más storage) |
| 15 | **¿Cuántos créditos Unlimited?** | Actualmente Unlimited no tiene créditos en absoluto. ¿Confirmas o quieres que tenga algún número simbólico? |
| 16 | **¿Credenciales LoL ya están en la DB?** | Si sí, ¿en qué formato? Para planificar la migración a encriptado |

---

## 11. Riesgos y Deuda Técnica

### Riesgos Altos

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| **Sin pasarela de pago** | No se puede cobrar | Implementar Stripe es el siguiente paso crítico |
| **RLS de profiles muy permisivo** | Un usuario técnico podría darse créditos infinitos via SDK | Restringir RLS a solo `display_name`, forzar todo lo demás vía SECURITY DEFINER |
| **Credenciales LoL sin encriptar** | Si la DB se compromete, se exponen todas las cuentas | Implementar AES-256-GCM antes de cargar datos reales |
| **Sin heartbeat** | Un usuario puede cerrar el app y mantener la cuenta lockeada indefinidamente | Implementar heartbeat + auto-release |

### Riesgos Medios

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| **pg_cron no disponible en Free tier** | Las suscripciones no se renuevan automáticamente | Edge Function + GitHub Actions como alternativa |
| **Discord OAuth mal configurado** | Usuarios no pueden loguear con Discord | Documentación clara de configuración (sección 10) |
| **Sin auto-updates** | Los usuarios tendrían que descargar manualmente cada actualización | electron-updater + GitHub Releases (Fase 2) |

### Deuda Técnica

| Item | Severidad | Detalle |
|------|-----------|---------|
| Plan cards hardcodeadas | Baja | Deberían cargarse dinámicamente desde `app_settings.plans` |
| Lint warnings en Sidebar | Cosmético | `pl-[9px]` → `pl-2.25`, `bg-gradient-to-br` → `bg-linear-to-br` (Tailwind v4) |
| `@theme` warning en CSS | Cosmético | Linter no reconoce Tailwind v4, funciona correctamente |
| Sin validación de pago en plan change | Alta | Actualmente el cambio de plan es "gratis". Stripe webhook debe validar el pago |
| Orden de consumo de créditos | Media | El código deduce `purchased` primero, pero el plan original dice `subscription` primero. **Verificar con el usuario cuál prefiere.** |

---

> **Documento generado para AccountFlow v1.0.0**
> Próxima revisión sugerida: después de implementar Stripe y auto-login.
