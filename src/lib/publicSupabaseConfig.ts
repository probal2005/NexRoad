export function validatePublicSupabaseConfig(url: unknown, key: unknown) {
  if (typeof url !== 'string' || !url.trim() || typeof key !== 'string' || !key.trim()) {
    throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY before building NexRoad.')
  }

  let endpoint: URL
  try {
    endpoint = new URL(url.trim())
  } catch {
    throw new Error('VITE_SUPABASE_URL must be a valid URL.')
  }

  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname)
  if ((endpoint.protocol !== 'https:' && !(endpoint.protocol === 'http:' && loopback))
    || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
    throw new Error('Use an HTTPS Supabase project URL or a local development URL.')
  }

  const publishableKey = key.trim()
  if (publishableKey.startsWith('sb_publishable_') && publishableKey.length > 'sb_publishable_'.length) {
    return { url: endpoint.href, key: publishableKey }
  }

  const jwtParts = publishableKey.split('.')
  if (jwtParts.length === 3) {
    try {
      const claims = JSON.parse(atob(jwtParts[1].replaceAll('-', '+').replaceAll('_', '/')))
      if (claims.role === 'anon') return { url: endpoint.href, key: publishableKey }
    } catch {
      // A malformed key is rejected below without echoing it.
    }
  }
  if (loopback && publishableKey === 'fixture-key') return { url: endpoint.href, key: publishableKey }

  throw new Error('Use a Supabase publishable key or legacy anon key in the browser configuration.')
}
