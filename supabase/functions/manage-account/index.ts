// Supabase Edge Function: manage-account
// Admin CRUD for LoL accounts with AES-256-GCM password encryption
// Deploy: supabase functions deploy manage-account
//
// POST   → Create account (encrypts password)
// PUT    → Update account (re-encrypts password if provided)
// DELETE → Delete account

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

// ─── AES-256-GCM Encryption ───

async function getKey(): Promise<CryptoKey> {
  // Ensure exactly 32 bytes for AES-256
  const keyBytes = new TextEncoder().encode(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32))
  return crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

async function encryptPassword(plaintext: string): Promise<string> {
  const key = await getKey()
  const iv = crypto.getRandomValues(new Uint8Array(12)) // 96-bit IV for GCM
  const encoded = new TextEncoder().encode(plaintext)
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)

  // Combine IV + ciphertext → base64
  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length)
  combined.set(iv)
  combined.set(new Uint8Array(encrypted), iv.length)

  return btoa(String.fromCharCode(...combined))
}

// ─── Helpers ───

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function verifyAdmin(req: Request): Promise<{ userId: string } | Response> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ error: 'Unauthorized' }, 401)

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return jsonResponse({ error: 'Unauthorized' }, 401)

  // Check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return jsonResponse({ error: 'Forbidden: admin only' }, 403)
  }

  return { userId: user.id }
}

// ─── Handler ───

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Verify admin
  const authResult = await verifyAdmin(req)
  if (authResult instanceof Response) return authResult

  try {
    // ─── CREATE ───
    if (req.method === 'POST') {
      const body = await req.json()
      const { name, riot_username, riot_tag, password, server, elo, elo_division, lp, status, notes } = body

      if (!name || !riot_username || !riot_tag || !password) {
        return jsonResponse({ error: 'name, riot_username, riot_tag, and password are required' }, 400)
      }

      const encrypted = await encryptPassword(password)

      const { data, error } = await supabase
        .from('accounts')
        .insert({
          name,
          riot_username,
          riot_tag,
          encrypted_password: encrypted,
          server: server || 'LAN',
          elo: elo || 'Iron',
          elo_division: elo_division ?? null,
          lp: lp ?? 0,
          status: status || 'active',
          notes: notes || null
        })
        .select('id, name, riot_username, riot_tag, server, elo, elo_division, lp, status, is_banned, ban_type, current_rental_id, notes, created_at, updated_at')
        .single()

      if (error) return jsonResponse({ error: error.message }, 500)
      return jsonResponse({ success: true, account: data })
    }

    // ─── UPDATE ───
    if (req.method === 'PUT') {
      const body = await req.json()
      const { id, password, ...updates } = body

      if (!id) return jsonResponse({ error: 'id is required' }, 400)

      // If password provided, encrypt it
      if (password && password.trim() !== '') {
        updates.encrypted_password = await encryptPassword(password)
      }

      // Remove fields that shouldn't be updated directly
      delete updates.id
      delete updates.created_at
      delete updates.updated_at

      const { data, error } = await supabase
        .from('accounts')
        .update(updates)
        .eq('id', id)
        .select('id, name, riot_username, riot_tag, server, elo, elo_division, lp, status, is_banned, ban_type, current_rental_id, notes, created_at, updated_at')
        .single()

      if (error) return jsonResponse({ error: error.message }, 500)
      return jsonResponse({ success: true, account: data })
    }

    // ─── DELETE ───
    if (req.method === 'DELETE') {
      const body = await req.json()
      const { id } = body

      if (!id) return jsonResponse({ error: 'id is required' }, 400)

      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id)

      if (error) return jsonResponse({ error: error.message }, 500)
      return jsonResponse({ success: true })
    }

    return jsonResponse({ error: 'Method not allowed' }, 405)
  } catch (err) {
    console.error('manage-account error:', err)
    return jsonResponse({ error: (err as Error).message }, 500)
  }
})
