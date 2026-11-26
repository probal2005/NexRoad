import { expect, test } from "@playwright/test"
import assert from "node:assert/strict"

const roles = [
  ['user', '/dashboard', 'User Dashboard'],
  ['technician', '/technician/dashboard', 'Technician Dashboard'],
  ['admin', '/admin/dashboard', 'Admin Dashboard'],
]

for (const [role, dashboard, heading] of roles) {
  test(`${role} sign-in, session reload, route denial and sign-out`, async ({ page, baseURL: base }) => {
    const id = '00000000-0000-0000-0000-000000000001'
    const account = { id, aud: 'authenticated', role: 'authenticated', email: `demo.${role}@example.com`, app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() }
    const token = [JSON.stringify({ alg: 'HS256' }), JSON.stringify({ sub: id, exp: Math.floor(Date.now() / 1000) + 3600 }), 'fixture'].map(v => Buffer.from(v).toString('base64url')).join('.')
    await page.route('**/auth/v1/**', async route => {
      const path = new URL(route.request().url()).pathname
      if (path.endsWith('/logout')) return route.fulfill({ status: 204 })
      if (path.endsWith('/user')) return route.fulfill({ json: account })
      assert.ok(path.endsWith('/token'), path)
      assert.equal(route.request().postDataJSON().email, account.email)
      await route.fulfill({ json: { access_token: token, refresh_token: 'fixture', expires_in: 3600, token_type: 'bearer', user: account } })
    })
    await page.route('**/rest/v1/**', route => route.fulfill({ json: [] }))
    await page.route('**/rest/v1/technician_applications?*', route =>
      route.fulfill({ json: [{ user_id: id, status: 'approved' }] }))
    await page.route('**/rest/v1/rpc/admin_overview', route => route.fulfill({ json: {
      accounts: [], categories: [], bookings: [], locations: [], complaints: [], audit: [],
      settings: { support_email: '', matching_radius_km: 10 },
      statistics: { customers: 0, technicians: 0, pending_applications: 0, bookings: 0, request_statuses: {}, payment_statuses: {} },
    } }))
    await page.routeWebSocket('**/realtime/v1/websocket?*', () => {})
    await page.route('**/rest/v1/user_profiles?*', async route => {
      await route.fulfill({ json: [{ id, role, full_name: 'Fixture Account', phone: null, avatar_url: null, created_at: account.created_at, updated_at: account.created_at }] })
    })
    await page.goto(base + '/admin/dashboard')
    await page.waitForURL('**/login', { timeout: 8000 })
    await page.locator('input[name=email]').fill(account.email)
    assert.equal(await page.locator('input[name=password]').inputValue(), '')
    await page.locator('input[name=password]').fill('local-fixture-password')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.waitForURL(base + dashboard, { timeout: 8000 })
    await page.getByRole('heading', { name: heading, exact: true }).waitFor()
    const section = {
      user: ['Request assistance', '#request-assistance'],
      technician: ['Offers and jobs', '#technician-jobs'],
      admin: ['Overview', '#overview'],
    }[role]
    const sectionLink = page.getByRole('navigation', { name: 'Dashboard sections' })
      .getByRole('link', { name: section[0], exact: true })
    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await expect(sectionLink).toBeVisible()
      await expect(page.locator(section[1])).toBeVisible()
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    }
    await sectionLink.click()
    await expect(page).toHaveURL(base + dashboard + section[1])
    if (role === 'user') {
      await expect(page.locator('main img[fetchpriority="high"]')).toBeVisible()
      assert.ok(await page.locator('main img[fetchpriority="high"]').evaluate((image) => image.complete && image.naturalWidth > 0))
      await page.getByRole('link', { name: 'Track requests' }).click()
      await expect(page).toHaveURL(base + dashboard + '#active-requests')
      const startRequest = page.getByRole('link', { name: 'Start a request' })
      await expect(startRequest).toHaveCSS('color', 'rgb(16, 28, 44)')
      await startRequest.click()
      await expect(page).toHaveURL(base + dashboard + '#request-assistance')
    }
    await page.reload()
    await page.getByRole('heading', { name: heading, exact: true }).waitFor()
    await page.goto(base + (role === 'admin' ? '/dashboard' : '/admin/dashboard'))
    await page.waitForURL('**/unauthorized', { timeout: 8000 })
    await page.getByRole('link', { name: 'Go to my dashboard' }).click()
    await page.waitForURL(base + dashboard)
    await page.getByRole('button', { name: 'Sign out' }).click()
    await page.waitForURL('**/login')
  })
}
