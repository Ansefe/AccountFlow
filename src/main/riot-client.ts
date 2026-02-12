/**
 * Riot Client automation module.
 *
 * Uses the Riot Client's **local REST API** (lockfile approach) instead of
 * keyboard simulation. This is 100% reliable regardless of window focus,
 * user interaction, or CEF rendering state.
 *
 * How it works:
 * 1. Launch RiotClientServices.exe
 * 2. Wait for the lockfile at %LOCALAPPDATA%\Riot Games\Riot Client\Config\lockfile
 * 3. Parse lockfile → get local API port + auth password
 * 4. PUT credentials to https://127.0.0.1:{port}/rso-auth/v1/session/credentials
 *
 * Credentials are fetched from the Edge Function in the Main Process,
 * so they NEVER touch the renderer / DevTools.
 */

import { execSync, spawn } from 'child_process'
import { existsSync, readFileSync, unlinkSync } from 'fs'
import { dirname, join } from 'path'
import https from 'https'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RIOT_PROCESSES = [
  'RiotClientServices.exe',
  'RiotClientUx.exe',
  'RiotClientUxRender.exe'
]

const LOL_PROCESSES = [
  'LeagueClient.exe',
  'LeagueClientUx.exe',
  'LeagueClientUxRender.exe',
  'League of Legends.exe'
]

function getLockfileCandidatePaths(): string[] {
  const localAppData =
    process.env.LOCALAPPDATA ||
    (process.env.USERPROFILE ? join(process.env.USERPROFILE, 'AppData', 'Local') : '')

  // Known locations can vary slightly between installs.
  const candidates: string[] = []
  if (localAppData) {
    candidates.push(join(localAppData, 'Riot Games', 'Riot Client', 'Config', 'lockfile'))
    candidates.push(join(localAppData, 'Riot Games', 'Riot Client', 'lockfile'))
  }
  return candidates
}

function lockfileCandidatesDebug(): string {
  const candidates = getLockfileCandidatePaths()
  const statuses = candidates.map((p) => `${p}=${existsSync(p) ? 'exists' : 'missing'}`)
  return statuses.join(' | ')
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

// ---------------------------------------------------------------------------
// Lockfile
// ---------------------------------------------------------------------------

interface LockfileData {
  port: number
  password: string
  path: string
}

/** Read and parse the Riot Client lockfile */
function readLockfile(): LockfileData | null {
  for (const lockfilePath of getLockfileCandidatePaths()) {
    try {
      const content = readFileSync(lockfilePath, 'utf-8')
      const parts = content.split(':')
      // Format: name:pid:port:password:protocol
      if (parts.length >= 5) {
        const port = parseInt(parts[2], 10)
        const password = parts[3]
        if (Number.isFinite(port) && port > 0 && password) {
          return { port, password, path: lockfilePath }
        }
      }
    } catch {
      // try next path
    }
  }
  return null
}

/** Wait until the lockfile appears */
async function waitForLockfile(timeoutMs = 30_000): Promise<LockfileData | null> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const data = readLockfile()
    if (data) return data
    await sleep(1000)
  }
  return null
}

/** Delete the lockfile (used before fresh launch) */
function deleteLockfile(): void {
  for (const lockfilePath of getLockfileCandidatePaths()) {
    try {
      if (existsSync(lockfilePath)) unlinkSync(lockfilePath)
    } catch {
      /* might be locked, that's ok */
    }
  }
}

// ---------------------------------------------------------------------------
// Riot Client local HTTPS API
// ---------------------------------------------------------------------------

/** Make an HTTPS request to the Riot Client local API */
function riotApiRequest(
  port: number,
  riotPassword: string,
  method: string,
  path: string,
  body?: object,
  timeoutMs = 8000
): Promise<{ status: number; data: unknown }> {
  return new Promise((resolve) => {
    const auth = Buffer.from(`riot:${riotPassword}`).toString('base64')
    const bodyStr = body ? JSON.stringify(body) : undefined

    const headers: Record<string, string | number> = {
      Authorization: `Basic ${auth}`,
      Accept: 'application/json'
    }

    if (bodyStr) {
      headers['Content-Type'] = 'application/json'
      headers['Content-Length'] = Buffer.byteLength(bodyStr)
    } else {
      // Some endpoints (notably login triggers) are picky and expect an explicit 0 length.
      if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
        headers['Content-Length'] = 0
      }
    }

    const req = https.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers,
        rejectUnauthorized: false // Riot Client uses a self-signed cert
      },
      (res) => {
        let raw = ''
        res.on('data', (chunk) => (raw += chunk))
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 0, data: JSON.parse(raw) })
          } catch {
            resolve({ status: res.statusCode || 0, data: raw })
          }
        })
      }
    )

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`timeout after ${timeoutMs}ms`))
    })

    req.on('error', (err) => {
      // Normalize network errors as a resolved response so callers don't hang.
      resolve({ status: 0, data: err instanceof Error ? err.message : String(err) })
    })
    if (bodyStr) req.write(bodyStr)
    req.end()
  })
}

async function tryGetApiIndex(port: number, riotPassword: string): Promise<{
  rootStatus?: number
  helpStatus?: number
  swaggerStatus?: number
  openapiStatus?: number
  swaggerPaths?: string[]
}> {
  const out: {
    rootStatus?: number
    helpStatus?: number
    swaggerStatus?: number
    openapiStatus?: number
    swaggerPaths?: string[]
  } = {}

  const root = await riotApiRequest(port, riotPassword, 'GET', '/')
  out.rootStatus = root.status

  const help = await riotApiRequest(port, riotPassword, 'GET', '/help')
  out.helpStatus = help.status

  const swagger = await riotApiRequest(port, riotPassword, 'GET', '/swagger/v2/swagger.json')
  out.swaggerStatus = swagger.status
  if (swagger.status >= 200 && swagger.status < 400 && swagger.data && typeof swagger.data === 'object') {
    const pathsObj = (swagger.data as Record<string, unknown>)['paths']
    if (pathsObj && typeof pathsObj === 'object') {
      const paths = Object.keys(pathsObj as Record<string, unknown>)
      out.swaggerPaths = paths
    }
  }

  const openapi = await riotApiRequest(port, riotPassword, 'GET', '/openapi.json')
  out.openapiStatus = openapi.status

  return out
}

async function waitForRiotClientAuthorization(
  port: number,
  riotPassword: string,
  timeoutMs: number
): Promise<{ ok: boolean; last?: { status: number; data: unknown } }> {
  const hasAnyToken = (data: unknown): boolean => {
    if (!data || typeof data !== 'object') return false
    const obj = data as Record<string, unknown>

    const accessToken = obj['accessToken']
    if (accessToken && typeof accessToken === 'object') {
      const at = accessToken as Record<string, unknown>
      if (typeof at['token'] === 'string' && at['token'].length > 0) return true
      if (typeof at['access_token'] === 'string' && at['access_token'].length > 0) return true
    }

    if (typeof obj['access_token'] === 'string' && (obj['access_token'] as string).length > 0) return true
    if (typeof obj['id_token'] === 'string' && (obj['id_token'] as string).length > 0) return true
    if (typeof obj['entitlements_token'] === 'string' && (obj['entitlements_token'] as string).length > 0) return true

    return false
  }

  const deadline = Date.now() + timeoutMs
  let last: { status: number; data: unknown } | undefined

  while (Date.now() < deadline) {
    const auth = await riotApiRequest(port, riotPassword, 'GET', '/riot-client-auth/v1/authorization', undefined, 8000)
    last = auth
    if (auth.status >= 200 && auth.status < 400 && hasAnyToken(auth.data)) return { ok: true, last: auth }

    // Fallback: some builds expose tokens only via rso-auth authorization.
    const rsoAuth = await riotApiRequest(port, riotPassword, 'GET', '/rso-auth/v1/authorization', undefined, 8000)
    if (rsoAuth.status >= 200 && rsoAuth.status < 400 && hasAnyToken(rsoAuth.data)) {
      return { ok: true, last: rsoAuth }
    }

    await sleep(1000)
  }

  return { ok: false, last }
}

async function waitForLocalApiReady(
  port: number,
  riotPassword: string,
  timeoutMs: number
): Promise<{ ok: boolean; last?: { status: number; data: unknown }; hint?: string }> {
  const deadline = Date.now() + timeoutMs
  let last: { status: number; data: unknown } | undefined

  while (Date.now() < deadline) {
    const help = await riotApiRequest(port, riotPassword, 'GET', '/help', undefined, 6000)
    last = help
    if (help.status !== 0) return { ok: true, last: help }
    await sleep(1000)
  }

  const index = await tryGetApiIndex(port, riotPassword).catch(() => ({} as any))
  const hint = `index(root=${index.rootStatus ?? '?'} help=${index.helpStatus ?? '?'} swagger=${index.swaggerStatus ?? '?'} openapi=${index.openapiStatus ?? '?'})`
  return { ok: false, last, hint }
}

function formatSessionState(data: unknown): {
  type?: string
  error?: string
  message: string
} {
  if (!data || typeof data !== 'object') return { message: String(data) }
  const obj = data as Record<string, unknown>
  const type = typeof obj['type'] === 'string' ? (obj['type'] as string) : undefined
  const error = typeof obj['error'] === 'string' ? (obj['error'] as string) : undefined

  const mf = obj['multifactor']
  const mfObj = mf && typeof mf === 'object' ? (mf as Record<string, unknown>) : null
  const mfMethod = mfObj && typeof mfObj['method'] === 'string' ? (mfObj['method'] as string) : undefined
  const mfMethods = mfObj && Array.isArray(mfObj['methods']) ? (mfObj['methods'] as unknown[]) : undefined

  const parts: string[] = []
  if (type) parts.push(`type=${type}`)
  if (error) parts.push(`error=${error}`)
  if (mfMethod) parts.push(`mfa.method=${mfMethod}`)
  if (mfMethods && mfMethods.length) parts.push(`mfa.methods=${mfMethods.length}`)

  return { type, error, message: parts.join(' ') || 'unknown session state' }
}

function extractMessage(data: unknown): string {
  if (typeof data === 'string') return data
  if (!data || typeof data !== 'object') return String(data)
  const obj = data as Record<string, unknown>
  if (typeof obj.message === 'string') return obj.message
  if (typeof obj.error === 'string') return obj.error
  return ''
}

function isNoPreviousRsoSession(resp: { status: number; data: unknown } | undefined | null): boolean {
  if (!resp) return false
  if (resp.status !== 400) return false
  const msg = extractMessage(resp.data)
  return typeof msg === 'string' && msg.toLowerCase().includes('no previous rso session found')
}

function safeJson(data: unknown, max = 900): string {
  try {
    const s = typeof data === 'string' ? data : JSON.stringify(data)
    return s.length > max ? s.slice(0, max) + '…' : s
  } catch {
    return '<unserializable>'
  }
}

async function tryUiKeyboardLogin(params: {
  username: string
  password: string
  blockInput: boolean
  timeoutMs: number
}): Promise<{ ok: boolean; detail?: string }> {
  const { username, password, blockInput, timeoutMs } = params

  const psScript = `
Add-Type -AssemblyName System.Windows.Forms

Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class Win32Input {
  [DllImport("user32.dll")] public static extern bool BlockInput(bool fBlockIt);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
}
"@

function Get-ActiveWindowTitle {
  $h = [Win32Input]::GetForegroundWindow()
  if ($h -eq [IntPtr]::Zero) { return '' }
  $sb = New-Object System.Text.StringBuilder 512
  [void][Win32Input]::GetWindowText($h, $sb, $sb.Capacity)
  return $sb.ToString()
}

function Escape-SendKeyChar([char]$c) {
  switch ($c) {
    '+' { return '{+}' }
    '^' { return '{^}' }
    '%' { return '{%}' }
    '~' { return '{~}' }
    '(' { return '{(}' }
    ')' { return '{)}' }
    '[' { return '{[}' }
    ']' { return '{]}' }
    '{' { return '{{}' }
    '}' { return '{}}' }
    default { return [string]$c }
  }
}

function Assert-RiotFocus {
  $title = Get-ActiveWindowTitle
  if ($title -notlike '*Riot Client*' -and $title -notlike '*League of Legends*') {
    throw "focus_lost:$title"
  }
}

function Send-Text([string]$text) {
  foreach ($ch in $text.ToCharArray()) {
    Assert-RiotFocus
    $escaped = Escape-SendKeyChar $ch
    [System.Windows.Forms.SendKeys]::SendWait($escaped)
    Start-Sleep -Milliseconds 14
  }
}

function Clear-CurrentField {
  Assert-RiotFocus
  [System.Windows.Forms.SendKeys]::SendWait('^a')
  Start-Sleep -Milliseconds 40
  [System.Windows.Forms.SendKeys]::SendWait('{DEL}')
  Start-Sleep -Milliseconds 40
}

try {
  $inputRaw = [Console]::In.ReadToEnd()
  $payload = $inputRaw | ConvertFrom-Json
  $username = [string]$payload.username
  $password = [string]$payload.password
  $shouldBlock = [bool]$payload.blockInput
} catch {
  throw 'invalid_input_payload'
}

if ([string]::IsNullOrWhiteSpace($username) -or [string]::IsNullOrWhiteSpace($password)) {
  throw 'missing_credentials'
}

$wshell = New-Object -ComObject WScript.Shell
$activated = $false
for ($i = 0; $i -lt 25; $i++) {
  if ($wshell.AppActivate('Riot Client')) { $activated = $true; break }
  if ($wshell.AppActivate('League of Legends')) { $activated = $true; break }
  Start-Sleep -Milliseconds 350
}

if (-not $activated) {
  throw 'riot_window_not_found'
}

Start-Sleep -Milliseconds 350

$blocked = $false
if ($shouldBlock) {
  try {
    $ok = [Win32Input]::BlockInput($true)
    if (-not $ok) {
      throw 'block_input_failed'
    }
    $blocked = $true
  } catch {
    throw 'block_input_failed'
  }
}

try {
  Assert-RiotFocus
  # Limpieza preventiva de usuario
  Clear-CurrentField
  Send-Text $username
  [System.Windows.Forms.SendKeys]::SendWait('{TAB}')
  Start-Sleep -Milliseconds 90
  # Limpieza preventiva de password
  Clear-CurrentField
  Send-Text $password
  [System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
  Write-Output 'ok'
} finally {
  if ($blocked) {
    try { [void][Win32Input]::BlockInput($false) } catch {}
  }
}
`

  return await new Promise((resolve) => {
    const child = spawn(
      'powershell',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
      {
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe']
      }
    )

    let stdout = ''
    let stderr = ''

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    try {
      const payload = JSON.stringify({ username, password, blockInput })
      child.stdin?.write(payload)
      child.stdin?.end()
    } catch {
      /* noop */
    }

    const timer = setTimeout(() => {
      try {
        child.kill('SIGTERM')
      } catch {
        /* noop */
      }
      resolve({ ok: false, detail: `ui_timeout_${timeoutMs}ms` })
    }, timeoutMs)

    child.on('error', (err) => {
      clearTimeout(timer)
      resolve({ ok: false, detail: `ui_spawn_error:${err.message}` })
    })

    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0 && stdout.toLowerCase().includes('ok')) {
        resolve({ ok: true })
        return
      }

      const detail = (stderr || stdout || `exit_code_${code ?? 'unknown'}`).trim()
      const normalized = detail.replace(/\s+/g, ' ')
      if (normalized.toLowerCase().includes('focus_lost:')) {
        resolve({ ok: false, detail: `focus_lost (${normalized.slice(0, 300)})` })
        return
      }
      resolve({ ok: false, detail: normalized.slice(0, 900) })
    })
  })
}

async function tryRiotIdentityLoginToken(params: {
  port: number
  riotPassword: string
  username: string
  password: string
}): Promise<{ ok: boolean; loginToken?: string; detail?: string; type?: 'captcha' | 'mfa' | 'error' }> {
  const { port, riotPassword, username, password } = params

  // Ensure there's an authorization context
  await riotApiRequest(port, riotPassword, 'GET', '/rso-auth/v1/authorization', undefined, 8000)

  await riotApiRequest(
    port,
    riotPassword,
    'POST',
    '/rso-authenticator/v1/authentication/riot-identity/start',
    { productId: 'league_of_legends', language: 'es_ES', state: 'accountflow' },
    12000
  )

  const completeRes = await riotApiRequest(
    port,
    riotPassword,
    'POST',
    '/rso-authenticator/v1/authentication/riot-identity/complete',
    { username, password, remember: false, language: 'es_ES' },
    12000
  )

  if (!(completeRes.status >= 200 && completeRes.status < 400) || !completeRes.data || typeof completeRes.data !== 'object') {
    return { ok: false, type: 'error', detail: `riot-identity/complete status=${completeRes.status} data=${safeJson(completeRes.data, 900)}` }
  }

  const obj = completeRes.data as Record<string, unknown>

  const captcha = obj['captcha']
  if (captcha && typeof captcha === 'object') {
    const cObj = captcha as Record<string, unknown>
    const t = typeof cObj['type'] === 'string' ? (cObj['type'] as string) : ''
    if (t && t !== 'none') {
      const hcaptcha = cObj['hcaptcha']
      const hObj = hcaptcha && typeof hcaptcha === 'object' ? (hcaptcha as Record<string, unknown>) : null
      const key = hObj && typeof hObj['key'] === 'string' ? (hObj['key'] as string) : ''
      const err = typeof obj['error'] === 'string' ? (obj['error'] as string) : ''
      const cluster = typeof obj['cluster'] === 'string' ? (obj['cluster'] as string) : ''
      const country = typeof obj['country'] === 'string' ? (obj['country'] as string) : ''
      const detail = `type=${t}${key ? ` key=${key}` : ''}${err ? ` error=${err}` : ''}${cluster ? ` cluster=${cluster}` : ''}${country ? ` country=${country}` : ''}`
      return { ok: false, type: 'captcha', detail }
    }
  }

  const mf = obj['multifactor']
  if (mf && typeof mf === 'object') {
    return { ok: false, type: 'mfa', detail: safeJson(completeRes.data, 1200) }
  }

  const success = obj['success']
  if (success && typeof success === 'object') {
    const sObj = success as Record<string, unknown>
    const loginToken = typeof sObj['login_token'] === 'string' ? (sObj['login_token'] as string) : ''
    if (loginToken) return { ok: true, loginToken }
  }

  const err = typeof obj['error'] === 'string' ? (obj['error'] as string) : ''
  return { ok: false, type: 'error', detail: err ? err : safeJson(completeRes.data, 1200) }
}


// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Launch the Riot Client from the configured path */
function launchRiotClient(exePath: string): boolean {
  if (!existsSync(exePath)) return false
  const child = spawn(exePath, ['--launch-product=league_of_legends', '--launch-patchline=live'], {
    cwd: dirname(exePath),
    detached: true,
    stdio: 'ignore'
  })
  child.unref()
  return true
}

/**
 * Full login flow via the Riot Client local API.
 *
 * 1. Fetch decrypted credentials from the Edge Function (in Main Process — never in renderer)
 * 2. Kill any existing Riot Client
 * 3. Launch RiotClientServices.exe
 * 4. Wait for lockfile → get local API port + auth
 * 5. Submit credentials via REST API
 *
 * This approach is immune to user interference (no keyboard/mouse simulation).
 */
export async function loginToRiotClient(params: {
  rentalId: string
  supabaseUrl: string
  anonKey: string
  accessToken: string
  riotClientPath: string
  onProgress?: (message: string) => void
}): Promise<{ success: boolean; error?: string }> {
  const { rentalId, supabaseUrl, anonKey, accessToken, riotClientPath, onProgress } = params

  const FLOW_TIMEOUT_MS = 210_000

  const progress = (message: string): void => {
    const line = `[AutoLogin][Step] ${message}`
    console.log(line)
    try {
      onProgress?.(message)
    } catch {
      /* noop */
    }
  }

  const flow = async (): Promise<{ success: boolean; error?: string }> => {
    progress('Iniciando flujo')
    // ── 1. Fetch credentials from Edge Function (server-side) ──

    const creds: {
      riot_username: string
      riot_tag?: string
      login_username: string | null
      password: string
      server?: string | null
    } = {
      riot_username: '',
      login_username: null,
      password: ''
    }

    const credSource = 'supabase'

    progress('Credenciales: solicitando a Supabase')
    const credRes = await fetch(`${supabaseUrl}/functions/v1/get-credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        apikey: anonKey
      },
      body: JSON.stringify({ rental_id: rentalId })
    })

    if (!credRes.ok) {
      const raw = await credRes.text().catch(() => '')
      let parsed: { error?: string } | null = null
      try {
        parsed = raw ? (JSON.parse(raw) as { error?: string }) : null
      } catch {
        parsed = null
      }

      return {
        success: false,
        error:
          parsed?.error ||
          `AutoLogin(API): fallo obteniendo credenciales (HTTP ${credRes.status}). Body: ${raw || '<empty>'}`
      }
    }

    const fromApi = (await credRes.json()) as Partial<typeof creds> & { password?: string }
    progress('Credenciales: recibidas desde Supabase')
    creds.riot_username = String(fromApi.riot_username || '')
    creds.riot_tag = typeof fromApi.riot_tag === 'string' ? fromApi.riot_tag : undefined
    creds.login_username = typeof fromApi.login_username === 'string' ? fromApi.login_username : null
    creds.password = String(fromApi.password || '')
    creds.server = typeof fromApi.server === 'string' ? fromApi.server : null

    const loginUsername = (creds.login_username || '').trim() || (creds.riot_username || '').trim()
    if (!loginUsername) {
      return {
        success: false,
        error: 'AutoLogin(API): faltan credenciales. Configura `login_username` en Supabase.'
      }
    }

    const uiFallbackEnabled = (process.env.RIOT_UI_FALLBACK_DISABLED || '').trim() !== '1'
    const uiBlockInput = (process.env.RIOT_UI_BLOCK_INPUT || '1').trim() !== '0'

    // ── 2. Kill existing Riot Client ──
    progress('Cerrando cliente Riot previo')
    await killRiotClient()
    await sleep(2000)

    // Remove stale lockfile
    deleteLockfile()
    await sleep(500)

    // ── 3. Launch Riot Client ──
    if (!existsSync(riotClientPath)) {
      return {
        success: false,
        error: `AutoLogin(API): RiotClientServices.exe no encontrado. Ruta: ${riotClientPath}`
      }
    }

    launchRiotClient(riotClientPath)
    progress('Riot Client lanzado')

    // ── 4. Wait for lockfile ──
    const lockfile = await waitForLockfile(45_000)
    if (!lockfile) {
      return {
        success: false,
        error: `AutoLogin(API): Riot Client no generó lockfile (timeout). Candidatos: ${lockfileCandidatesDebug()}`
      }
    }
    progress('Lockfile detectado')

    // Give the API a moment to be fully ready
    await sleep(2000)

    // Wait for the local API to actually accept connections (lockfile can appear before HTTPS is ready).
    const ready = await waitForLocalApiReady(lockfile.port, lockfile.password, 30_000)
    if (!ready.ok) {
      const detail = ready.last?.data ? String(ready.last.data) : ''
      return {
        success: false,
        error:
          `AutoLogin(API): no se pudo conectar a la API local (status ${ready.last?.status ?? 0}). ` +
          `Port=${lockfile.port}. Lockfile=${lockfile.path}. ` +
          (detail ? `Detail: ${detail}. ` : '') +
          (ready.hint ? `${ready.hint}` : '')
      }
    }
    progress('API local disponible')

    // Quick reachability probe (helps diagnose “opened client but nothing happens”)
    const probe = await riotApiRequest(lockfile.port, lockfile.password, 'GET', '/rso-auth/v1/session', undefined, 8000)
    if (probe.status === 0 || probe.status >= 500) {
      const detail = probe.data ? String(probe.data) : ''
      return {
        success: false,
        error:
          `AutoLogin(API): no se pudo conectar a la API local (status ${probe.status}). ` +
          `Port=${lockfile.port}. Lockfile=${lockfile.path}. ` +
          (detail ? `Detail: ${detail}` : '')
      }
    }

    // ── 5. Submit credentials via local API ──
    // Swagger indicates this endpoint is PUT (not POST) for credentials.
    const credPayload: Record<string, unknown> = {
      username: loginUsername,
      password: creds.password,
      persistLogin: false
    }
    if (typeof creds.server === 'string' && creds.server.length) {
      // Optional; some environments may use this to preselect region.
      credPayload.region = creds.server
    }

    const credResult = await riotApiRequest(
      lockfile.port,
      lockfile.password,
      'PUT',
      '/rso-auth/v1/session/credentials',
      credPayload,
      12000
    )
    progress(`Credenciales enviadas por API (status=${credResult.status})`)

    // Some Riot builds require bootstrapping an RSO session before credentials can be set.
    // If we got the known 400, attempt the bootstrap flow instead of failing fast.
    if (isNoPreviousRsoSession(credResult)) {
      progress('No hay sesión RSO previa; intentando bootstrap')
      const tokenAttempt = await tryRiotIdentityLoginToken({
        port: lockfile.port,
        riotPassword: lockfile.password,
        username: loginUsername,
        password: creds.password
      })

      if (tokenAttempt.ok && tokenAttempt.loginToken) {
        progress('Bootstrap OK; enviando login-token')
        const loginTokenRes = await riotApiRequest(
          lockfile.port,
          lockfile.password,
          'PUT',
          '/rso-auth/v1/session/login-token',
          {
            login_token: tokenAttempt.loginToken,
            authentication_type: 'RiotAuth',
            persist_login: false
          },
          12000
        )

        if (loginTokenRes.status >= 200 && loginTokenRes.status < 400) {
          progress('Login-token aceptado; esperando autorización')
          const after = await waitForRiotClientAuthorization(lockfile.port, lockfile.password, 90_000)
          if (after.ok) return { success: true }
        }
      }

      if (tokenAttempt.type === 'captcha') {
        progress('Riot bloqueó API (captcha_not_allowed); ejecutando Camino B UI')
        if (uiFallbackEnabled) {
          const ui = await tryUiKeyboardLogin({
            username: loginUsername,
            password: creds.password,
            blockInput: uiBlockInput,
            timeoutMs: 45_000
          })

          if (ui.ok) {
            progress('Camino B UI ejecutado; esperando autorización')
            const afterUi = await waitForRiotClientAuthorization(lockfile.port, lockfile.password, 120_000)
            if (afterUi.ok) return { success: true }
          }

          if (ui.detail?.includes('focus_lost') || ui.detail?.includes('block_input_failed')) {
            await killRiotClient()
          }

          return {
            success: false,
            error:
              'AutoLogin(API): Riot bloqueó el flujo API con captcha_not_allowed. ' +
              'Se intentó Camino B (teclado simulado sobre Riot Client) pero no se completó el login. ' +
              `Source=${credSource} Username=${loginUsername} Detail=${tokenAttempt.detail || ''}` +
              (ui.detail ? ` | UIFallback: ${ui.detail}` : '') +
              (ui.detail?.includes('block_input_failed')
                ? ' | Nota: no se pudo activar BlockInput (normalmente requiere ejecutar la app con privilegios elevados).'
                : '') +
              (ui.detail?.includes('focus_lost')
                ? ' | Nota: no cambies de ventana durante el autologin; si quieres, activa bloqueo de input con RIOT_UI_BLOCK_INPUT=1.'
                : '')
          }
        }

        return {
          success: false,
          error:
            'AutoLogin(API): Riot requiere captcha para iniciar sesión (hCaptcha). ' +
            'El fallback UI está deshabilitado (`RIOT_UI_FALLBACK_DISABLED=1`). ' +
            `Source=${credSource} Username=${loginUsername} Detail=${tokenAttempt.detail || ''}`
        }
      }

      if (tokenAttempt.type === 'mfa') {
        return {
          success: false,
          error:
            'AutoLogin(API): La cuenta requiere verificación multifactor (MFA); no se puede completar automáticamente. ' +
            `Source=${credSource} Username=${loginUsername} Detail=${tokenAttempt.detail || ''}`
        }
      }

      return {
        success: false,
        error:
          `AutoLogin(API): no se pudo inicializar la sesión RSO automáticamente. ` +
          `Source=${credSource} Username=${loginUsername} ` +
          `Bootstrap=${tokenAttempt.detail || 'n/a'}`
      }
    }

    if (!credResult || !(credResult.status >= 200 && credResult.status < 400)) {
      const apiData = credResult?.data as { error?: string; message?: string } | undefined
      const apiError = apiData?.error || apiData?.message || JSON.stringify(credResult?.data)
      return {
        success: false,
        error: `AutoLogin(API): no se pudieron enviar credenciales (${credResult?.status ?? 0}). ${apiError}`
      }
    }

    // Check session state for early hints (but don't fail fast; some flows need a login-token step).
    const sessionAfterCreds = await riotApiRequest(lockfile.port, lockfile.password, 'GET', '/rso-auth/v1/session', undefined, 8000)
    const stateAfterCreds =
      sessionAfterCreds.status >= 200 && sessionAfterCreds.status < 400 ? formatSessionState(sessionAfterCreds.data) : null



    // Some Riot builds auto-complete after setting credentials.
    const autoAuth = await waitForRiotClientAuthorization(lockfile.port, lockfile.password, 10_000)
    if (autoAuth.ok) return { success: true }

    // ── 6. Complete login via login-token flow (supported by swagger) ──
    // 1) Request a login token from rso-authenticator
    // 2) Provide it to rso-auth session
    const tokenRes = await riotApiRequest(
      lockfile.port,
      lockfile.password,
      'POST',
      '/rso-authenticator/v1/login-token',
      undefined,
      12000
    )

    const token = typeof tokenRes.data === 'string' ? tokenRes.data : ''
    if (tokenRes.status >= 200 && tokenRes.status < 400 && token && token.length > 0) {
      progress('Token obtenido; enviando login-token final')
      const loginTokenRes = await riotApiRequest(
        lockfile.port,
        lockfile.password,
        'PUT',
        '/rso-auth/v1/session/login-token',
        {
          login_token: token,
          authentication_type: 'RiotAuth',
          persist_login: false
        },
        12000
      )

      if (loginTokenRes.status >= 200 && loginTokenRes.status < 400) {
        progress('Esperando autorización final')
        const after = await waitForRiotClientAuthorization(lockfile.port, lockfile.password, 90_000)
        if (after.ok) return { success: true }
      }
    }

    // MFA / additional verification required – cannot be bypassed safely.
    if (stateAfterCreds?.type && stateAfterCreds.type.toLowerCase().includes('multifactor')) {
      return {
        success: false,
        error:
          'AutoLogin(API): La cuenta requiere verificación multifactor (MFA). ' +
          'Ese flujo no se puede completar de forma automática sin interacción del usuario.' +
          ` Session: ${stateAfterCreds.message}`
      }
    }

    // If we still have auth_failure, surface it as a likely credentials/captcha issue.
    if (stateAfterCreds?.error === 'auth_failure') {
      if (uiFallbackEnabled) {
        const ui = await tryUiKeyboardLogin({
          username: loginUsername,
          password: creds.password,
          blockInput: uiBlockInput,
          timeoutMs: 45_000
        })

        if (ui.ok) {
          const afterUi = await waitForRiotClientAuthorization(lockfile.port, lockfile.password, 120_000)
          if (afterUi.ok) return { success: true }
        }

        if (ui.detail?.includes('focus_lost') || ui.detail?.includes('block_input_failed')) {
          await killRiotClient()
        }

        const sessionStr = safeJson(sessionAfterCreds?.data, 900)
        return {
          success: false,
          error:
            'AutoLogin(API): auth_failure en API y Camino B (teclado simulado) tampoco completó login. ' +
            `Source=${credSource} Username=${loginUsername}` +
            (ui.detail ? ` | UIFallback: ${ui.detail}` : '') +
            (ui.detail?.includes('block_input_failed')
              ? ' | Nota: BlockInput falló (ejecuta la app como administrador o desactiva bloqueo bajo tu propio riesgo).'
              : '') +
            (ui.detail?.includes('focus_lost')
              ? ' | Nota: se perdió foco de Riot Client durante el tipeo.'
              : '') +
            ` | sessionRaw(status=${sessionAfterCreds.status}): ${sessionStr}`
        }
      }

      const credResStr = safeJson(credResult?.data, 700)
      const sessionStr = safeJson(sessionAfterCreds?.data, 900)
      return {
        success: false,
        error:
          'AutoLogin(API): Riot rechazó las credenciales (auth_failure). ' +
          'Si el usuario/password son correctos, esto suele indicar captcha/validación adicional requerida por Riot, o que `riot_username` no es el usuario/email real de login.' +
          ` Source=${credSource} Username=${loginUsername} Session: ${stateAfterCreds.message}` +
          ` | credentialsResp(status=${credResult?.status ?? 0}): ${credResStr}` +
          ` | sessionRaw(status=${sessionAfterCreds.status}): ${sessionStr}`
      }
    }

    const index = await tryGetApiIndex(lockfile.port, lockfile.password).catch(() => ({} as any))
    const swaggerHint = Array.isArray(index.swaggerPaths)
      ? index.swaggerPaths
          .filter((p) => p.includes('rso-auth') || p.includes('rso-authenticator') || p.includes('riot-client-auth') || p.includes('login') || p.includes('session'))
          .slice(0, 25)
      : []

    const sessionSnap = await riotApiRequest(lockfile.port, lockfile.password, 'GET', '/rso-auth/v1/session', undefined, 8000)
    const authSnap = await riotApiRequest(lockfile.port, lockfile.password, 'GET', '/riot-client-auth/v1/authorization', undefined, 8000)
    const snapStr = (() => {
      try {
        const s = typeof sessionSnap.data === 'string' ? sessionSnap.data : JSON.stringify(sessionSnap.data)
        return s.length > 900 ? s.slice(0, 900) + '…' : s
      } catch {
        return '<unserializable>'
      }
    })()

    const indexStr = `index(root=${index.rootStatus ?? '?'} help=${index.helpStatus ?? '?'} swagger=${index.swaggerStatus ?? '?'} openapi=${index.openapiStatus ?? '?'})`

    const authSnapStr = (() => {
      try {
        const s = typeof authSnap.data === 'string' ? authSnap.data : JSON.stringify(authSnap.data)
        return s.length > 700 ? s.slice(0, 700) + '…' : s
      } catch {
        return '<unserializable>'
      }
    })()

    const tokenErrData = tokenRes?.data as { error?: string; message?: string } | undefined
    const tokenErr = tokenErrData?.error || tokenErrData?.message || JSON.stringify(tokenRes?.data || {})

    const fullError =
      `AutoLogin(API): credenciales enviadas pero login no completó. ` +
      `login-token(status=${tokenRes?.status ?? 0}): ${tokenErr}` +
      ` | ${indexStr}` +
      ` | session(status=${sessionSnap.status}): ${snapStr}` +
      ` | riot-client-auth(status=${authSnap.status}): ${authSnapStr}` +
      (swaggerHint.length ? ` | swagger(paths): ${swaggerHint.join(', ')}` : '')

    // Importante: esto se imprime en el terminal donde corre Electron (Main process).
    // Útil si el renderer/DevTools llega a truncar el texto.
    console.error('[AutoLogin][Main]', fullError)

    return { success: false, error: fullError }
  }

  try {
    return await Promise.race([
      flow(),
      (async () => {
        await sleep(FLOW_TIMEOUT_MS)
        return { success: false, error: `AutoLogin(API): timeout global (${Math.round(FLOW_TIMEOUT_MS / 1000)}s)` }
      })()
    ])
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `AutoLogin(API): error inesperado. ${msg}` }
  }
}

/** Kill all Riot Client and League of Legends processes */
export async function killRiotClient(): Promise<{
  success: boolean
  error?: string
}> {
  try {
    for (const proc of [...RIOT_PROCESSES, ...LOL_PROCESSES]) {
      try {
        execSync(`taskkill /F /IM "${proc}"`, { stdio: 'ignore' })
      } catch {
        /* process not found — that's fine */
      }
    }
    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: msg }
  }
}
