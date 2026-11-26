import { test } from "@playwright/test"
import assert from "node:assert/strict"

const id = '00000000-0000-0000-0000-000000000001';

test("Live tracking disconnect and recovery", async ({ page, baseURL: base }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  const account = {id,aud:'authenticated',role:'authenticated',email:'fixture@example.com',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()}
  const token = [JSON.stringify({alg:'HS256'}), JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+3600}), 'fixture'].map(v=>Buffer.from(v).toString('base64url')).join('.')
  await page.route('**/auth/v1/token?*', route => route.fulfill({json:{access_token:token,refresh_token:'fixture',expires_in:3600,token_type:'bearer',user:account}}))
  await page.route('https://tile.openstreetmap.org/**', route => route.fulfill({status:204}))
  let joinCount=0, leaves=0, socket, channelTopic
  await page.routeWebSocket('**/realtime/v1/websocket?*', ws => {
    ws.onMessage(raw => {
      if(typeof raw !== 'string') return
      const msg=JSON.parse(raw)
      const [joinRef, ref, topic, event, payload] = msg
      if(event==='phx_join') {
        assert.equal(topic,'realtime:nexroad:user:'+id)
        assert.equal(payload.config.private,true)
        socket=ws
        channelTopic=topic
        joinCount++
      }
      if(event==='phx_leave') leaves++
      if(['phx_join','phx_leave','heartbeat','access_token'].includes(event))
        ws.send(JSON.stringify([joinRef,ref,topic,'phx_reply',{status:'ok',response:{}}]))
    })
  })
  function broadcast(scope) {
    socket.send(JSON.stringify([null,null,channelTopic,'broadcast',{type:'broadcast',event:'changed',payload:{scope}}]))
  }
  let sharedLocation=null
  let status='technician_arriving'
  const parent = 'parent-fixture'
  const workflow = {departed_at:new Date().toISOString(),arrived_at:null,submitted_at:null,confirmed_at:null,followup_request_id:null}
  const quote = {currency:'INR',service:'towing',base_inr:350,service_inr:75,distance_km:2,distance_rate_inr:25,distance_inr:50,
    distance_basis:'straight_line',fuel_type:null,fuel_litres:null,fuel_unit_inr:null,fuel_inr:0,total_inr:475}
  await page.route('**/rest/v1/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const table = url.pathname.split('/').at(-1)
    if(table==='user_profiles') return route.fulfill({json:[{id,role:'user',full_name:'Fixture Customer'}]})
    if(table==='customer_booking_location') {
      assert.deepEqual(request.postDataJSON(),{p_request_id:parent})
      return route.fulfill({json:sharedLocation})
    }
    if(table==='account_access_allowed') return route.fulfill({json:true})
    if(table==='service_categories') return route.fulfill({json:[{id:'mech',slug:'mechanical',name:'Mechanical assistance',is_active:true},{id:'tow',slug:'towing',name:'Towing',is_active:true}]})
    if(table==='service_requests') return route.fulfill({json:url.searchParams.get('request_status').includes(status) ? [{
      id:parent,category_id:'mech',request_status:status,service_location:'Sector 17, Chandigarh',latitude:30.7333,longitude:76.7794,
      requested_at:account.created_at,payment_status:'pending',payment_method:'cash',service_outcome:status==='completed'?'towing_required':null,
      booking_service_workflow:workflow,
    }] : []})
    if(table==='request_activity_history') {
      if(url.searchParams.get('request_id')) assert.equal(url.searchParams.get('request_id'),'eq.'+parent)
      return route.fulfill({json:[{id:1,request_id:parent,new_status:'technician_arriving',created_at:account.created_at}]})
    }
    if(table==='confirm_customer_service') {
      assert.deepEqual(request.postDataJSON(),{p_request_id:parent})
      assert.equal(status,'in_progress')
      status='completed'
      workflow.confirmed_at=new Date().toISOString()
      return route.fulfill({json:true})
    }
    if(table==='quote_booking') {
      const {p_input:input}=request.postDataJSON()
      assert.equal(input.category_id,'tow')
      assert.equal(input.latitude,30.7333)
      assert.equal(input.destination,'Sector 22 garage')
      return route.fulfill({json:quote})
    }
    if(table==='create_towing_followup') {
      const body=request.postDataJSON()
      assert.equal(body.p_parent_request_id,parent)
      assert.deepEqual(body.p_expected_quote,quote)
      workflow.followup_request_id=body.p_request_id
      return route.fulfill({json:body.p_request_id})
    }
    return route.fulfill({json:[]})
  })
  await page.goto(base+'/dashboard')
  await page.waitForURL('**/login')
  await page.locator('[name=email]').fill(account.email)
  await page.locator('[name=password]').fill('test-fixture-password')
  await page.getByRole('button',{name:'Sign in',exact:true}).click()
  await page.waitForURL('**/dashboard')
  await page.getByText('Live updates on',{exact:true}).waitFor()
  assert.ok(joinCount>=1)
  await page.getByRole('button',{name:'Show technician map'}).click()
  await page.locator('.leaflet-overlay-pane path').first().waitFor()
  sharedLocation={latitude:30.734,longitude:76.78,updated_at:new Date().toISOString()}
  broadcast('location')
  await page.getByText('Shared technician location',{exact:true}).waitFor()
  const marker = page.locator('.leaflet-overlay-pane path').last()
  const original = await marker.getAttribute('d')
  sharedLocation={...sharedLocation,latitude:30.737}
  broadcast('location')
  await page.waitForFunction(previous => document.querySelector('.leaflet-overlay-pane path:last-child')?.getAttribute('d') !== previous, original)
  socket.close({code:1011,reason:'fixture disconnect'})
  await page.getByText(/Live connection interrupted/).waitFor()
  await page.getByText('Live updates on',{exact:true}).waitFor()
  assert.ok(joinCount>=2)
  await page.getByRole('button',{name:'View service timeline'}).click()
  await page.getByText('Technician travelling',{exact:true}).waitFor()
  status='in_progress'
  Object.assign(workflow,{summary:'Engine needs a tow',mechanical_outcome:'towing_required',submitted_at:new Date().toISOString()})
  broadcast('booking')
  await page.getByText('Engine needs a tow',{exact:true}).waitFor()
  await page.getByRole('button',{name:'Confirm service',exact:true}).click()
  await page.getByRole('button',{name:'Book follow-up towing'}).click()
  assert.equal(await page.getByLabel('Pickup address or landmark').inputValue(),'Sector 17, Chandigarh')
  assert.equal(await page.locator('[name=service-category]').inputValue(),'tow')
  await page.getByLabel('Tow destination').fill('Sector 22 garage')
  await page.getByLabel('Drop-off latitude').fill('30.72')
  await page.getByLabel('Drop-off longitude').fill('76.76')
  await page.getByRole('button',{name:'Review price'}).click()
  await page.getByRole('alertdialog').getByRole('button',{name:'Send request'}).click()
  await page.getByText(/A follow-up tow is already booked/).waitFor()
  await page.getByRole('link',{name:'Technician application'}).click()
  await page.waitForURL('**/technician/application')
  assert.ok(leaves>=1)
  assert.deepEqual(errors,[])
})
