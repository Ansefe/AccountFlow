# Scripts y Comandos Útiles — AccountFlow

Referencia rápida de comandos que necesitarás frecuentemente.

---

## 📦 Desarrollo

```bash
# Iniciar en modo desarrollo
npm run dev

# Build de producción (solo compilar, sin generar .exe)
npm run build

# Generar .exe instalador para Windows
npm run build:win
```

> **Importante**: Usar siempre **Node 22 LTS** (`nvm use 22`). Node 24 causa `spawn UNKNOWN`.

---

## 🚀 Publicar Nueva Versión (Auto-Update)

```bash
# 1. Cambiar version en package.json (e.g. "1.0.0" → "1.0.1")
# 2. Commit
git add -A
git commit -m "v1.0.1 - descripción del cambio"

# 3. Crear tag y push (esto dispara el build automático)
git tag v1.0.1
git push origin main --tags

# O en un solo comando:
git tag v1.0.1 && git push origin main --tags
```

GitHub Actions compilará el .exe y lo subirá como Release.
Los usuarios recibirán la actualización automáticamente al abrir la app.

---

## 🔐 Supabase — Secrets

```bash
# Ver secrets actuales
npx supabase secrets list

# Configurar un nuevo secret
npx supabase secrets set RIOT_API_KEY=RGAPI-xxxxx-xxxx-xxxx

# Configurar múltiples secrets a la vez
npx supabase secrets set RIOT_API_KEY=xxx ENCRYPTION_KEY=yyy

# Borrar un secret
npx supabase secrets unset RIOT_API_KEY
```

---

## ☁️ Supabase — Edge Functions

```bash
# Deployar una función específica
npx supabase functions deploy check-rental-matches
npx supabase functions deploy get-credentials
npx supabase functions deploy heartbeat-ping

# Deployar TODAS las funciones
npx supabase functions deploy

# Ver logs de una función en tiempo real
npx supabase functions logs check-rental-matches --tail

# Probar una función localmente
npx supabase functions serve check-rental-matches
```

---

## 🗄️ Supabase — Migraciones SQL

```bash
# Las migraciones se ejecutan manualmente en:
# https://supabase.com/dashboard/project/sisitxrcjovkvfeqlkwx/sql

# Archivos de migración:
# supabase/migrations/001_initial_schema.sql        ✅ Ejecutada
# supabase/migrations/002_early_bird_pgcron.sql      ✅ Ejecutada
# supabase/migrations/003_lemonsqueezy_integration.sql ✅ Ejecutada
# supabase/migrations/003_account_credentials.sql    ✅ Ejecutada
# supabase/migrations/004_security_hardening.sql     ⏳ Pendiente
# supabase/migrations/005_match_based_rentals.sql    ✅ Ejecutada
```

---

## 🔑 GitHub Actions — Secrets

Los secrets se configuran en: `GitHub Repo → Settings → Secrets and variables → Actions`

| Secret | Descripción |
|--------|------------|
| `SUPABASE_URL` | URL del proyecto Supabase (https://sisitxrcjovkvfeqlkwx.supabase.co) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role Key de Supabase (Settings → API → service_role) |
| `GH_TOKEN` | Se genera automáticamente por GitHub Actions, no necesita configuración |

Para verificar que están configurados:
`GitHub → Repo → Settings → Secrets → Actions` — deben aparecer los 2 secrets.

---

## 👤 Admin — Comandos SQL Útiles

```sql
-- Promover usuario a admin
UPDATE profiles SET role = 'admin' WHERE id = 'USER-UUID-HERE';

-- Ver todos los usuarios con su plan
SELECT id, display_name, role, plan_type, subscription_credits, purchased_credits
FROM profiles ORDER BY created_at DESC;

-- Ver alquileres activos
SELECT r.id, r.user_id, r.account_id, r.matches_used, r.matches_total, r.status, r.started_at
FROM rentals r WHERE r.status = 'active';

-- Forzar liberación de un alquiler
UPDATE rentals SET status = 'force_released', ended_at = now() WHERE id = 'RENTAL-UUID';
UPDATE accounts SET current_rental_id = NULL WHERE current_rental_id = 'RENTAL-UUID';

-- Cambiar precios de paquetes de partidas
UPDATE app_settings
SET value = '{"1": 35, "3": 95, "5": 150, "10": 270}', updated_at = now()
WHERE key = 'match_packages';

-- Cambiar idle timeout (minutos)
UPDATE app_settings SET value = '60', updated_at = now() WHERE key = 'idle_timeout_minutes';
```

---

## 🎮 Riot API

```bash
# La API Key se obtiene en: https://developer.riotgames.com
# Development Key: expira cada 24h (testing)
# Personal Key: permanente (solicitar aprobación)

# Configurar en Supabase:
npx supabase secrets set RIOT_API_KEY=RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

---

## 🛠️ Node Version Manager

```bash
# Ver versiones instaladas
nvm list

# Cambiar a Node 22 (requerido para este proyecto)
nvm use 22

# Instalar Node 22 si no lo tienes
nvm install 22
```

---

## 📋 Git — Comandos Frecuentes

```bash
# Ver estado
git status

# Commit rápido
git add -A && git commit -m "mensaje"

# Push
git push origin main

# Ver tags existentes
git tag -l

# Borrar un tag (si te equivocaste)
git tag -d v1.0.1
git push origin --delete v1.0.1
```
