import { expect, test } from "@playwright/test"
import assert from "node:assert/strict"

const id = '00000000-0000-0000-0000-000000000005'
const applicant = '00000000-0000-0000-0000-000000000006'

test("Admin operations and route isolation", async ({ page, baseURL: base }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  let role = 'admin'
  let suspended = false
  const account = {id,aud:'authenticated',role:'authenticated',email:'fixture@example.com',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()}
  const token = [JSON.stringify({alg:'HS256'}), JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+3600}), 'fixture'].map(v=>Buffer.from(v).toString('base64url')).join('.')
  await page.route('**/auth/v1/token?*', route => route.fulfill({json:{access_token:token,refresh_token:'fixture',expires_in:3600,token_type:'bearer',user:account}}))
  await page.route('**/auth/v1/logout?*', route => route.fulfill({status:204}))
  await page.route('**/rest/v1/user_profiles?*', route => route.fulfill({json:[{id,role,full_name:'Fixture Account'}]}))
  await page.route('**/rest/v1/rpc/account_access_allowed', route => route.fulfill({json:!suspended}))
  await page.route('https://tile.openstreetmap.org/**', route => route.fulfill({status:204}))
  const state = {
    accounts:[{id:applicant,full_name:'Fixture Applicant', email:'applicant@example.com',role:'user',suspended:false,application_status:'pending',application_note:'Fixture note'}],
    categories:[{id:'cat-1',name:'Fuel delivery',is_active:true,base_price:null,service_charge:null,per_km_charge:null}],
    bookings:[{id:'req-1',service:'Fuel delivery',request_status:'matching',payment_status:'pending',payment_method:'cash',requested_at:account.created_at}],
    locations:[{id:'tech-1',full_name:'Sample Technician',latitude:30.72,longitude:76.76,updated_at:account.created_at}],
    complaints:[{id:'complaint-1',request_id:'req-1',message:'Fixture complaint',status:'open',created_at:account.created_at}],
    audit:[],
    settings:{support_email:null,matching_radius_km:15},
    statistics:{customers:2,technicians:1,pending_applications:1,bookings:1,request_statuses:{matching:1},payment_statuses:{pending:1}},
  }
  let overviewCalls = 0
  await page.route('**/rest/v1/rpc/admin_overview', route => {
    overviewCalls++
    assert.equal(role,'admin')
    return route.fulfill({json:state})
  })
  const actions = []
  await page.route('**/rest/v1/rpc/admin_update', route => {
    const {p_action,p_target,p_values} = route.request().postDataJSON()
    actions.push(p_action)
    if (['approve_application','suspend_account','reactivate_account'].includes(p_action)) assert.equal(p_target,applicant)
    if(p_action === 'approve_application') Object.assign(state.accounts[0],{role:'technician',application_status:'approved'})
    if(p_action === 'suspend_account') state.accounts[0].suspended = true
    if(p_action === 'reactivate_account') state.accounts[0].suspended = false
    if(p_action === 'resolve_complaint') state.complaints[0].status = 'resolved'
    if(p_action === 'update_price') {
      assert.deepEqual(p_values,{base_price:175,service_charge:0,per_km_charge:0})
      Object.assign(state.categories[0],p_values)
    }
    if(p_action === 'update_settings') {
      assert.deepEqual(p_values,{support_email:'support@example.com',matching_radius_km:21})
      state.settings = p_values
    }
    state.audit.unshift({id:actions.length,actor_id:id,action:p_action,target_id:p_target,created_at:account.created_at})
    return route.fulfill({json:true})
  })
  async function confirm(button) {
    await page.getByRole('button',{name:button,exact:true}).click()
    await page.getByRole('alertdialog').getByRole('button',{name:'Confirm',exact:true}).click()
  }
  await page.goto(base+'/admin/dashboard')
  await page.waitForURL('**/login')
  await page.locator('[name=email]').fill(account.email)
  await page.locator('[name=password]').fill('test-fixture-password')
  await page.getByRole('button',{name:'Sign in',exact:true}).click()
  await page.waitForURL('**/admin/dashboard')
  await page.getByRole('heading',{name:'Bookings and simulated payments'}).waitFor()
  const approve = page.getByRole('button', { name: 'Approve', exact: true })
  const dialog = page.getByRole('alertdialog')
  await approve.focus()
  await page.keyboard.press('Enter')
  await expect(dialog.getByRole('button', { name: 'Close dialog' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(approve).toBeFocused()
  await confirm('Approve')
  await page.getByText(/Application approved/).waitFor()
  await confirm('Suspend')
  await page.getByRole('button',{name:'Reactivate',exact:true}).waitFor()
  await confirm('Reactivate')
  await page.getByRole('button',{name:'Suspend',exact:true}).waitFor()
  await page.getByLabel('Base rate (₹)').fill('175')
  await page.getByRole('button',{name:'Save default rates'}).click()
  await page.getByText('update price',{exact:false}).waitFor()
  await page.getByRole('button',{name:'Show map'}).click()
  await page.locator('.leaflet-overlay-pane path').waitFor()
  await page.getByRole('button',{name:'Resolve complaint'}).click()
  await page.getByRole('button',{name:'Reopen complaint'}).waitFor()
  await page.getByLabel('Support email').fill('support@example.com')
  await page.getByLabel('Default matching radius (km)').fill('21')
  await page.getByRole('button',{name:'Save settings'}).click()
  await page.getByText('update settings',{exact:false}).waitFor()
  assert.deepEqual(actions,['approve_application','suspend_account','reactivate_account','update_price','resolve_complaint','update_settings'])
  const calls = overviewCalls
  role = 'user'
  await page.goto(base+'/admin/dashboard')
  await page.waitForURL('**/unauthorized')
  assert.equal(overviewCalls,calls)
  suspended = true
  await page.goto(base+'/dashboard')
  await page.getByRole('heading',{name:'Account suspended'}).waitFor()
  assert.deepEqual(errors,[])
})
