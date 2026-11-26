import assert from 'node:assert/strict'

const origin = new URL(process.env.NEXROAD_TEST_BASE_URL || 'https://nexroad.vercel.app')
assert.equal(origin.protocol, 'https:')
assert.equal(origin.href, origin.origin + '/')

async function request(path, contentType) {
  const response = await fetch(new URL(path, origin), {
    redirect: 'error',
    signal: AbortSignal.timeout(15_000),
  })
  assert.equal(response.status, 200, path)
  assert.match(response.headers.get('content-type') ?? '', contentType, path)
  return response
}

const publicRoutes = ['/', '/about', '/services', '/how-it-works', '/contact']
const privateRoutes = ['/login', '/register', '/dashboard', '/technician/dashboard', '/admin/dashboard', '/demo/customer']
for (const path of [...publicRoutes, ...privateRoutes]) {
  const response = await request(path, /^text\/html\b/)
  assert.match(response.headers.get('content-security-policy') ?? '', /frame-ancestors 'none'/, path)
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff', path)
  const robots = response.headers.get('x-robots-tag') ?? ''
  assert.equal(/\bnoindex\b/.test(robots), privateRoutes.includes(path), path)
  assert.match(await response.text(), /<div id="root">/, path)
}

const home = await (await request('/', /^text\/html\b/)).text()
const entry = home.match(/<script type="module"[^>]* src="(\/assets\/[^"]+\.js)"/)?.[1]
assert.ok(entry, 'Homepage JavaScript entry')
const script = await request(entry, /javascript/)
assert.match(script.headers.get('cache-control') ?? '', /\bimmutable\b/)
await script.body?.cancel()

const production = 'https://nexroad.vercel.app'
const sitemap = await (await request('/sitemap.xml', /xml/)).text()
assert.deepEqual([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]).sort(),
  publicRoutes.map((path) => production + path).sort())
const robots = await (await request('/robots.txt', /^text\/plain\b/)).text()
assert.ok(robots.includes('Sitemap: ' + production + '/sitemap.xml'))

console.log('Production routes, security headers, asset caching, robots and sitemap passed.')
