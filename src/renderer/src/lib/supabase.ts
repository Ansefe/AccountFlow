import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? ''
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? ''

const DEFAULT_TIMEOUT_MS = 20_000

const fetchWithTimeout: typeof fetch = async (input, init) => {
	const controller = new AbortController()
	const timeoutMs = DEFAULT_TIMEOUT_MS
	const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

	if (init?.signal) {
		if (init.signal.aborted) {
			controller.abort()
		} else {
			init.signal.addEventListener('abort', () => controller.abort(), { once: true })
		}
	}

	try {
		const response = await fetch(input, {
			...init,
			signal: controller.signal
		})
		return response
	} finally {
		window.clearTimeout(timeoutId)
	}
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
	auth: {
		persistSession: true,
		autoRefreshToken: true,
		detectSessionInUrl: true,
		storage: window.localStorage
	},
	global: {
		fetch: fetchWithTimeout
	}
})
