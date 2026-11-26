import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('public pages fit a mobile viewport and update search metadata', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  for (const route of ['/', '/services', '/about', '/contact']) {
    const response = await page.goto(route)
    expect(response?.ok()).toBe(true)
    await expect(page.getByRole('main')).toBeVisible()
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', new RegExp(route === '/' ? '/$' : route + '$'))
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  }
  await page.goto('/admin/dashboard')
  await expect(page).toHaveURL(/\/login(?:\?|$)/)
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', /noindex/)
})

test('login screen passes automated accessibility checks', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('button', { name: /sign in|log in/i }).first()).toBeVisible()
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(violations.map(({ id, nodes }) => ({ id, elements: nodes.map(({ target }) => target) }))).toEqual([])
})
