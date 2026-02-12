const fs = require('fs')
const https = require('https')
const path = require('path')

function readLockfile() {
  const localAppData =
    process.env.LOCALAPPDATA ||
    (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Local') : '')

  const candidates = []
  if (localAppData) {
    candidates.push(path.join(localAppData, 'Riot Games', 'Riot Client', 'Config', 'lockfile'))
    candidates.push(path.join(localAppData, 'Riot Games', 'Riot Client', 'lockfile'))
  }

  for (const p of candidates) {
    try {
      const content = fs.readFileSync(p, 'utf8')
      const parts = content.split(':')
      if (parts.length >= 5) {
        const port = parseInt(parts[2], 10)
        const password = parts[3]
        if (Number.isFinite(port) && port > 0 && password) return { port, password, path: p }
      }
    } catch {
      // ignore
    }
  }
  return null
}

function req({ port, password, method, reqPath, body, timeoutMs = 8000 }) {
  return new Promise((resolve) => {
    const auth = Buffer.from(`riot:${password}`).toString('base64')
    const data = body ? JSON.stringify(body) : undefined

    const headers = {
      Authorization: `Basic ${auth}`,
      Accept: 'application/json'
    }

    if (data) {
      headers['Content-Type'] = 'application/json'
      headers['Content-Length'] = Buffer.byteLength(data)
    } else if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      headers['Content-Length'] = 0
    }

    const r = https.request(
      {
        hostname: '127.0.0.1',
        port,
        path: reqPath,
        method,
        headers,
        rejectUnauthorized: false
      },
      (res) => {
        let raw = ''
        res.on('data', (c) => (raw += c))
        res.on('end', () => {
          let parsed = raw
          try {
            parsed = raw ? JSON.parse(raw) : raw
          } catch {
            // keep raw
          }
          resolve({ status: res.statusCode || 0, data: parsed })
        })
      }
    )

    r.on('error', (e) => resolve({ status: 0, data: String(e && e.message ? e.message : e) }))
    r.setTimeout(timeoutMs, () => {
      r.destroy(new Error(`timeout after ${timeoutMs}ms`))
    })

    if (data) r.write(data)
    r.end()
  })
}

function shortJson(value, max = 360) {
  const s = JSON.stringify(value)
  return s.length > max ? s.slice(0, max) + '…' : s
}

function fullDef(name, def) {
  console.log(`\nDEF ${name} (full):`)
  console.log(JSON.stringify(def, null, 2))
  if (def && def.required) console.log('required:', def.required)
}

async function main() {
  const lf = readLockfile()
  if (!lf) {
    console.error('No lockfile found')
    process.exit(1)
  }

  console.log('lockfile:', lf.path)
  console.log('port:', lf.port)

  const sw = await req({
    port: lf.port,
    password: lf.password,
    method: 'GET',
    reqPath: '/swagger/v2/swagger.json',
    timeoutMs: 12000
  })
  if (!(sw.status >= 200 && sw.status < 400)) {
    console.error('Swagger fetch failed', sw.status)
    console.error(sw.data)
    process.exit(2)
  }

  const swagger = sw.data
  const pick = (p) => (swagger && swagger.paths ? swagger.paths[p] : undefined)

  const defs = (swagger && swagger.definitions) || {}
  const defsToInspect = [
    'RsoAuthSessionCredentials',
    'RsoAuthSessionResponse',
    'RsoAuthSessionLoginToken',
    'RsoAuthSessionMultifactor',
    'RsoAuthAuthenticationTypeEnum',
    'RsoAuthenticatorV1LoginRequest',
    'RsoAuthenticatorAuthenticationTypeEnum',
    'RsoAuthenticatorV1WebAuthenticationUrlRequest',
    'RsoAuthenticatorV1WebAuthenticationMethod',
    'RsoAuthenticatorV1DisplayMode',
    'RsoAuthenticatorV1RiotIdentityAuthStartInput',
    'RsoAuthenticatorV1RiotIdentityAuthCompleteInput',
    'RsoAuthenticatorV1AuthenticationResponse',
    'RsoAuthenticatorV1SuccessResponseDetails',
    'RsoAuthenticatorV1AuthResponseDetails',
    'RsoAuthenticatorV1MultifactorResponseDetails',
    'RsoAuthenticatorV1Captcha',
    'RiotClientAuthApiAuthorization',
    'RiotClientAuthApiUserInfo',
    'PlayerSessionLifecycleRiotIdentityLoginRequest'
  ]

  const pathsToInspect = [
    '/rso-auth/v1/session',
    '/rso-auth/v1/session/credentials',
    '/rso-auth/v1/session/login-token',
    '/rso-auth/v1/session/multifactor',
    '/rso-auth/v1/authorization',
    '/rso-authenticator/v1/login',
    '/rso-authenticator/v1/login-token',
    '/rso-authenticator/v1/web-authentication-url',
    '/rso-authenticator/v1/authentication/riot-identity/start',
    '/rso-authenticator/v1/authentication/riot-identity/complete',
    '/player-session-lifecycle/v1/riot-identity-login',
    '/riot-login/v1/status',
    '/riot-login/v1/persistence',
    '/riot-login/v1/config',
    '/riot-client-auth/v1/authorization',
    '/riot-client-auth/v1/userinfo'
  ]

  for (const p of pathsToInspect) {
    const entry = pick(p)
    if (!entry) {
      console.log(`\nPATH ${p} => (not in swagger)`)
      continue
    }

    console.log(`\nPATH ${p}`)
    for (const method of Object.keys(entry)) {
      const op = entry[method]
      if (!op || typeof op !== 'object') continue
      const summary = op.summary || op.operationId || ''
      console.log(' ', method.toUpperCase(), summary)

      const params = Array.isArray(op.parameters) ? op.parameters : []
      const bodyParam = params.find((x) => x && x.in === 'body')
      if (bodyParam) {
        console.log('   body schema:', shortJson(bodyParam.schema || {}))
      }

      const okResp = op.responses && (op.responses['200'] || op.responses['201'])
      if (okResp && okResp.schema) {
        console.log('   ok schema:', shortJson(okResp.schema))
      }
    }
  }

  console.log('\n--- Definitions (selected) ---')
  for (const name of defsToInspect) {
    const def = defs[name]
    if (!def) {
      console.log(`DEF ${name} => (missing)`)
      continue
    }
    console.log(`DEF ${name}:`, shortJson(def, 900))
  }

  // Print full details for the auth flows we may need to implement.
  const fullNames = [
    'RsoAuthenticatorV1RiotIdentityAuthStartInput',
    'RsoAuthenticatorV1RiotIdentityAuthCompleteInput',
    'RsoAuthenticatorV1AuthenticationResponse',
    'PlayerSessionLifecycleRiotIdentityLoginRequest'
  ]
  for (const n of fullNames) {
    const def = defs[n]
    if (def) fullDef(n, def)
  }

  const allPaths = Object.keys((swagger && swagger.paths) || {})
  const loginLike = allPaths
    .filter(
      (p) =>
        p.includes('session/login') || p.includes('riot-identity-login') || p.includes('/login')
    )
    .slice(0, 80)
  console.log('\nSample login-like paths:', loginLike)
}

main().catch((e) => {
  console.error(e)
  process.exit(99)
})
