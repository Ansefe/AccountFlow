// Supabase Edge Function: get-credentials
// Returns decrypted LoL account credentials ONLY if the user has an active rental
// Deploy: supabase functions deploy get-credentials
//
// POST { rental_id: string }
// Returns: { riot_username, riot_tag, login_username, password, server }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

// ─── AES-256-GCM Decryption ───

async function getKey(): Promise<CryptoKey> {
  const keyBytes = new TextEncoder().encode(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32))
  return crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt'])
}

async function decryptPassword(ciphertext: string): Promise<string> {
  const key = await getKey()
  const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const data = combined.slice(12)
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)
  return new TextDecoder().decode(decrypted)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const body = await req.json()
    const { rental_id } = body

    if (!rental_id) {
      return new Response(JSON.stringify({ error: 'rental_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verify the rental belongs to this user AND is currently active
    const { data: rental, error: rentalError } = await supabase
      .from('rentals')
      .select('id, user_id, account_id, status')
      .eq('id', rental_id)
      .single()

    if (rentalError || !rental) {
      return new Response(JSON.stringify({ error: 'Rental not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Security checks
    if (rental.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'This rental does not belong to you' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (rental.status !== 'active') {
      return new Response(JSON.stringify({ error: 'Rental is not active' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Fetch account public fields
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id, riot_username, riot_tag, encrypted_password, server')
      .eq('id', rental.account_id)
      .single()

    if (accountError || !account) {
      return new Response(JSON.stringify({ error: 'Account not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Prefer credentials from dedicated table (login_username + encrypted_password)
    const { data: credsRow } = await supabase
      .from('account_credentials')
      .select('login_username, encrypted_password')
      .eq('account_id', rental.account_id)
      .maybeSingle()

    const encryptedPassword = credsRow?.encrypted_password || account.encrypted_password

    // Decrypt password
    let password: string
    try {
      password = await decryptPassword(encryptedPassword)
    } catch {
      // If decryption fails, might be a legacy plain-text password
      console.warn('Decryption failed, returning raw value (legacy account)')
      password = encryptedPassword
    }

    // Log credential access
    await supabase.from('activity_log').insert({
      user_id: user.id,
      event_type: 'account_login_launched',
      metadata: {
        rental_id,
        account_id: rental.account_id
      }
    })

    return new Response(JSON.stringify({
      riot_username: account.riot_username,
      riot_tag: account.riot_tag,
      login_username: credsRow?.login_username || null,
      password,
      server: account.server
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('get-credentials error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
