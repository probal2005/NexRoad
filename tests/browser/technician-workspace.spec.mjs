import { expect, test } from '@playwright/test'
import assert from 'node:assert/strict'

test.use({ permissions: ['geolocation'], geolocation: { latitude: 30.72, longitude: 76.75 } })

test('technician updates rates, availability and service reports', async ({ page, baseURL: base }) => {
  const role = 'technician'
  const dashboard = '/technician/dashboard'
  const heading = 'Technician Dashboard'
  const id = '00000000-0000-0000-0000-000000000001'
  const account = { id, aud: 'authenticated', role: 'authenticated', email: 'fixture@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() }
  const token = [JSON.stringify({ alg: 'HS256' }), JSON.stringify({ sub: id, exp: Math.floor(Date.now() / 1000) + 3600 }), 'fixture'].map(v => Buffer.from(v).toString('base64url')).join('.')
  await page.route('**/auth/v1/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/logout')) return route.fulfill({ status: 204 })
    if (path.endsWith('/user')) return route.fulfill({ json: account })
    assert.ok(path.endsWith('/token'), path)
    await route.fulfill({ json: { access_token: token, refresh_token: 'fixture', expires_in: 3600, token_type: 'bearer', user: account } })
  })
  await page.route('**/rest/v1/**', route => route.fulfill({json:[]}))
  await page.route('**/rest/v1/user_profiles?*', async route => {
    await route.fulfill({ json: [{ id, role, full_name: 'Fixture Account', phone: null, avatar_url: null, created_at: account.created_at, updated_at: account.created_at }] })
  })
  const writes = []
  let availability = null
  await page.route('**/rest/v1/technician_applications?*', route => {
    assert.equal(new URL(route.request().url()).searchParams.get('user_id'), 'eq.' + id)
    return route.fulfill({json:[{status:role === 'technician' ? 'approved' : 'pending'}]})
  })
  await page.route('**/rest/v1/technician_availability?*', route => {
    if (['POST','PATCH'].includes(route.request().method())) {
      const data = route.request().postDataJSON()
      if (route.request().method() === 'POST') assert.equal(data.technician_id,id)
      writes.push(data)
      availability = {accepting_requests:false, location_sharing:false, ...availability, ...data}
      return route.fulfill({json:availability})
    }
    assert.equal(new URL(route.request().url()).searchParams.get('technician_id'),'eq.'+id)
    return route.fulfill({json:availability ? [availability] : []})
  })
  const serviceWrites = []
  const serviceRows = [{
    category_id:'towing', base_price:200, service_charge:50, per_km_charge:8, is_active:true,
  }]
  let rejectFirstSave = true
  await page.route('**/rest/v1/service_categories?*', route => route.fulfill({json:[
    {id:'fuel', name:'Fuel delivery'}, {id:'towing',name:'Towing'},
  ]}))
  await page.route('**/rest/v1/technician_services?*', route => {
    const request = route.request()
    const url = new URL(request.url())
    if (request.method() === 'GET') {
      assert.equal(url.searchParams.get('technician_id'), 'eq.' + id)
      return route.fulfill({json:serviceRows})
    }
    assert.equal(url.searchParams.get('on_conflict'),'technician_id,category_id')
    const record = request.postDataJSON()
    assert.equal(record.technician_id,id)
    if (rejectFirstSave) {
      rejectFirstSave = false
      return route.fulfill({status:500,json:{message:'Fixture save failure'}})
    }
    serviceWrites.push(record)
    const index = serviceRows.findIndex(row => row.category_id === record.category_id)
    if (index === -1) serviceRows.push(record)
    else serviceRows[index] = record
    return route.fulfill({json:record})
  })
  let liveFixes = 0
  let jobStatus = null
  let submitted = false
  const offers = [{id:'offer-1',estimated_distance_km:3,expires_at:new Date(Date.now()+600000).toISOString()},
    {id:'offer-2',estimated_distance_km:4,expires_at:new Date(Date.now()+600000).toISOString()}]
  await page.route('**/rest/v1/rpc/update_shared_technician_location', route => {
    assert.deepEqual(route.request().postDataJSON(),{p_latitude:30.72,p_longitude:76.75})
    liveFixes++
    return route.fulfill({json:'updated'})
  })
  await page.route('**/rest/v1/rpc/share_technician_location', route => {
    assert.deepEqual(route.request().postDataJSON(),{p_latitude:30.72,p_longitude:76.75})
    availability.location_sharing = true
    return route.fulfill({json:true})
  })
  await page.route('**/rest/v1/rpc/technician_matching_offers', route => route.fulfill({json:offers.map(offer=>({...offer,service:'Mechanical assistance'}))}))
  await page.route('**/rest/v1/rpc/account_access_allowed', route => route.fulfill({json:true}))
  await page.route('**/rest/v1/service_requests?*', route => route.fulfill({json:jobStatus && jobStatus !== 'completed' ? [{
    id:'job-1',request_status:jobStatus,service_location:'Sector 17',latitude:30.72,longitude:76.75,
    issue_description:'Engine will not start',booking_service_workflow:submitted?{submitted_at:new Date().toISOString()}:null,service_categories:{slug:'mechanical',name:'Mechanical assistance'},
  }] : []}))
  await page.route('**/rest/v1/rpc/technician_performance', route => route.fulfill({json:{
    completed_jobs:jobStatus === 'completed' ? 1 : 0,rated_jobs:0,average_rating:null,
    simulated_earnings:jobStatus === 'completed' ? 175 : null,
  }}))
  await page.route('**/rest/v1/rpc/decline_technician_offer', route => {
    assert.equal(route.request().postDataJSON().p_offer_id,'offer-2')
    offers.pop()
    return route.fulfill({json:true})
  })
  await page.route('**/rest/v1/rpc/accept_request_offer', route => {
    assert.equal(route.request().postDataJSON().p_offer_id,'offer-1')
    offers.pop()
    jobStatus = 'accepted'
    return route.fulfill({json:{success:true}})
  })
  await page.route('**/rest/v1/rpc/advance_technician_job', route => {
    const {p_request_id,p_status,p_outcome} = route.request().postDataJSON()
    assert.equal(p_request_id,'job-1')
    assert.equal(p_status,{accepted:'technician_arriving',technician_arriving:'in_progress',in_progress:'completed'}[jobStatus])
    jobStatus = p_status
    return route.fulfill({json:true})
  })
  await page.route('**/rest/v1/rpc/submit_technician_service', route => {
    assert.deepEqual(route.request().postDataJSON(),{
      p_request_id:'job-1',p_report:{summary:'Repaired engine roadside',fuel_litres:null,drop_off:null,mechanical_outcome:'roadside_repair'},
    })
    submitted = true
    return route.fulfill({json:true})
  })
  await page.goto(base + '/admin/dashboard')
  await page.waitForURL('**/login', { timeout: 8000 })
  await page.locator('input[name=email]').fill(account.email)
  await page.locator('input[name=password]').fill('local-fixture-password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.waitForURL(base + dashboard, { timeout: 8000 })
  await page.getByRole('heading', { name: heading, exact: true }).waitFor()

  await page.getByText('Approved', {exact:true}).waitFor()
  const fuel = page.getByRole('form',{name:'Fuel delivery'})
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(page.getByRole('link', { name: 'View jobs' })).toBeVisible()
    assert.equal(await fuel.evaluate(form => form.scrollWidth > form.clientWidth), false)
  }
  await page.getByRole('link', { name: 'Set availability' }).click()
  await expect(page).toHaveURL(base + dashboard + '#availability')
  const towing = page.getByRole('form',{name:'Towing'})
  assert.equal(await towing.locator('[name=base_price]').inputValue(),'200')
  await fuel.getByLabel('Offer this service').check()
  await fuel.locator('[name=base_price]').fill('150.25')
  await fuel.locator('[name=service_charge]').fill('25')
  await fuel.locator('[name=per_km_charge]').fill('5.5')
  await fuel.getByRole('button',{name:'Save service'}).click()
  await fuel.getByText('Could not save these rates. Please try again.').waitFor()
  assert.equal(await fuel.locator('[name=base_price]').inputValue(),'150.25')
  await fuel.getByRole('button',{name:'Save service'}).click()
  await fuel.getByText('Listed',{exact:true}).waitFor()
  await towing.getByLabel('Offer this service').uncheck()
  await towing.getByRole('button',{name:'Save service'}).click()
  await towing.getByText('Not listed',{exact:true}).waitFor()
  assert.deepEqual(serviceWrites,[
    {technician_id:id, category_id:'fuel',base_price:150.25,service_charge:25,per_km_charge:5.5,is_active:true},
    {technician_id:id, category_id:'towing',base_price:200,service_charge:50,per_km_charge:8,is_active:false},
  ])
  await page.reload()
  await fuel.getByText('Listed',{exact:true}).waitFor()
  await towing.getByText('Not listed',{exact:true}).waitFor()
  await page.getByRole('button',{name:'Go online'}).click()
  await page.getByText('Online',{exact:true}).waitFor()
  await page.clock.install()
  await page.getByRole('button',{name:'Start live location sharing'}).click()
  await page.getByText('Live location sharing is running.',{exact:true}).waitFor()
  await page.clock.fastForward(16000)
  await page.waitForTimeout(300)
  assert.equal(liveFixes,1)
  await expect(page.locator('#availability dl')).toContainText('Location sharingOn')
  await page.getByRole('button',{name:'Accept incoming requests'}).click()
  await page.getByText(/Accepting requests/).waitFor()
  await page.getByRole('button',{name:'Stop sharing'}).click()
  await expect(page.locator('#availability dl')).toContainText('Location sharingOff')
  await page.clock.fastForward(16000)
  assert.equal(liveFixes,1)
  await page.getByRole('heading',{name:'Mechanical assistance offer'}).first().waitFor()
  await page.getByRole('button',{name:'Decline offer'}).last().click()
  await page.waitForFunction(() => [...document.querySelectorAll('button')].filter(b=>b.textContent === 'Accept offer').length === 1)
  await page.getByRole('button',{name:'Accept offer'}).click()
  await page.getByRole('link',{name:'Open pickup directions'}).waitFor()
  await page.getByRole('button',{name:'Start travelling'}).click()
  await page.getByRole('button',{name:'Start service'}).click()
  await page.getByLabel('Mechanical outcome').selectOption('roadside_repair')
  const report = page.getByRole('form', { name: 'Service report' })
  await page.setViewportSize({ width: 320, height: 900 })
  assert.equal(await report.evaluate(form => form.scrollWidth > form.clientWidth), false)
  await page.getByLabel('Service summary').fill('   ')
  await page.getByRole('button', { name: 'Send service report' }).click()
  await expect(report.getByRole('alert')).toHaveText('Enter at least three characters describing the work completed.')
  await page.getByLabel('Service summary').fill('Repaired engine roadside')
  await page.getByRole('button',{name:'Send service report'}).click()
  await page.getByText('Awaiting customer confirmation',{exact:true}).waitFor()
  assert.equal(jobStatus,'in_progress')
  jobStatus='completed'
  await page.getByRole('button',{name:'Refresh jobs'}).click()
  await page.getByText(/175.00/).waitFor()
  await page.getByRole('button',{name:'Go offline'}).click()
  await page.getByText('Offline',{exact:true}).waitFor()
  assert.deepEqual(writes,[
    {technician_id:id,is_online:true},
    {accepting_requests:true},
    {location_sharing:false,accepting_requests:false},
    {technician_id:id,is_online:false,accepting_requests:false,location_sharing:false},
  ])
})
