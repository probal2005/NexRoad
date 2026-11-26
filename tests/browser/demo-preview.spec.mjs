import { test } from "@playwright/test"
import assert from "node:assert/strict"


test("Demo preserves role isolation and avoids backend writes", async ({ page, baseURL: base }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const backendCalls = []
  const errors = []
  page.on('request', r => { if (/\/(auth|rest)\/v1\//.test(r.url())) backendCalls.push(new URL(r.url()).pathname) })
  page.on('pageerror', e => errors.push(e.message))
  for (const [role, action, done] of [
    ['Customer', 'Send sample request', 'Request received'],
    ['Technician', 'Accept sample offer', 'Offer accepted'],
    ['Admin', 'Approve sample application', 'Application approved'],
  ]) {
    await page.goto(base + '/login')
    await page.getByRole('link',{name:'Open Demo ' + role}).click()
    await page.waitForURL(base + '/demo/' + role.toLowerCase())
    await page.getByRole('heading',{name:role + ' demo'}).waitFor()
    await page.getByRole('button',{name:action}).click()
    await page.getByText(done,{exact:true}).waitFor()
    await page.getByRole('button',{name:'Reset sample'}).click()
    await page.getByRole('button',{name:action}).waitFor()
    await page.getByRole('link',{name:'Back to sign in'}).click()
    await page.waitForURL(base + '/login')
    assert.equal(await page.locator('[name=password]').inputValue(),'')
  }
  await page.goto(base + '/admin/dashboard')
  await page.waitForURL(base + '/login')
  assert.deepEqual(backendCalls,[])
  assert.deepEqual(errors,[])
})
