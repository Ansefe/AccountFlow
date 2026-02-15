// Supabase Edge Function: admin-manage-users
// Admin operations on user accounts (delete, etc.)
// Deploy: supabase functions deploy admin-manage-users --no-verify-jwt
//
// POST (action: 'delete') → Delete user from auth + cascade profile

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const authResult = await verifyAdmin(req)
  if (authResult instanceof Response) return authResult
  const adminId = (authResult as { userId: string }).userId

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const body = await req.json()

    // ── Delete user ──
    if (body.action === 'delete') {
      const { userId } = body
      if (!userId) return jsonResponse({ error: 'userId is required' }, 400)

      // Prevent self-deletion
      if (userId === adminId) {
        return jsonResponse({ error: 'No puedes eliminar tu propia cuenta' }, 400)
      }

      // Check user has no active rentals
      const { data: activeRentals } = await supabase
        .from('rentals')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(1)

      if (activeRentals && activeRentals.length > 0) {
        return jsonResponse({ error: 'El usuario tiene rentas activas. Libéralas primero.' }, 400)
      }

      // Delete from auth (cascades to profile via FK or trigger)
      const { error: deleteErr } = await supabase.auth.admin.deleteUser(userId)
      if (deleteErr) return jsonResponse({ error: deleteErr.message }, 500)

      // Also clean up profile explicitly in case no cascade
      await supabase.from('profiles').delete().eq('id', userId)

      return jsonResponse({ success: true })
    }

    return jsonResponse({ error: 'Unknown action' }, 400)
  } catch (err) {
    console.error('admin-manage-users error:', err)
    return jsonResponse({ error: (err as Error).message }, 500)
  }
})
