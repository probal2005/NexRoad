import { test } from "@playwright/test"
import assert from "node:assert/strict"
import fs from "node:fs"

const id = '00000000-0000-0000-0000-000000000001'

test("Customer chat and payment recovery", async ({ page, baseURL: base }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  const account = {id,aud:'authenticated',role:'authenticated',email:'fixture@example.com',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()}
  const token = [JSON.stringify({alg:'HS256'}), JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+3600}), 'fixture'].map(v=>Buffer.from(v).toString('base64url')).join('.')
  await page.route('**/auth/v1/token?*', route => route.fulfill({json:{access_token:token,refresh_token:'fixture',expires_in:3600,token_type:'bearer',user:account}}))
  let socket, channelTopic
  await page.routeWebSocket('**/realtime/v1/websocket?*', ws => ws.onMessage(raw => {
    if(typeof raw!=='string') return
    const [joinRef,ref,topic,event,payload] = JSON.parse(raw)
    if(event==='phx_join') {
      assert.equal(topic,'realtime:nexroad:user:'+id)
      assert.equal(payload.config.private,true)
      socket=ws
      channelTopic=topic
    }
    if(['phx_join','phx_leave','heartbeat','access_token'].includes(event))
      ws.send(JSON.stringify([joinRef,ref,topic,'phx_reply',{status:'ok',response:{}}]))
  }))
  const broadcast = (scope) => socket.send(JSON.stringify([null,null,channelTopic,'broadcast',{type:'broadcast',event:'changed',payload:{scope}}]))
  const booking='test-booking'
  const quote = {currency:'INR',service:'fuel',base_inr:100,service_inr:40,distance_km:5,distance_rate_inr:8,distance_inr:40,distance_basis:'simulated_approach',fuel_type:'petrol',fuel_litres:3,fuel_unit_inr:100,fuel_inr:300,total_inr:480}
  let paymentStatus='pending', firstMessageId, through=0
  const payments=[]
  const messages=[{id:1,sender_role:'technician',body:'Fuel delivered safely',created_at:account.created_at}]
  await page.route('**/rest/v1/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const table = url.pathname.split('/').at(-1)
    if(table==='user_profiles') return route.fulfill({json:[{id,role:'user',full_name:'Fixture Customer'}]})
    if(table==='account_access_allowed') return route.fulfill({json:true})
    if(table==='service_categories') return route.fulfill({json:[{id:'fuel',slug:'fuel',name:'Fuel delivery',is_active:true}]})
    if(table==='service_requests') return route.fulfill({json:url.searchParams.get('request_status').includes('completed') ? [{
      id:booking,category_id:'fuel',request_status:'completed',service_location:'Sector 17, Chandigarh',latitude:30.7333,longitude:76.7794,assigned_technician_id:'fixture-tech',
      requested_at:account.created_at,payment_status:paymentStatus,payment_method:'online',booking_price_snapshots:{quote,booking_final_charges:{total_inr:480}},
    }] : []})
    if(table==='booking_chat_unread') {
      const unread=messages.filter(row=>row.sender_role==='technician'&&row.id>through).length
      return route.fulfill({json:unread?[{request_id:booking,unread_count:unread}]:[]})
    }
    if(table==='booking_chat_messages'){
      assert.equal(url.searchParams.get('request_id'),'eq.'+booking)
      return route.fulfill({json:[...messages].reverse()})
    }
    if(table==='mark_booking_chat_read') {
      const {p_request_id,p_through_id}=request.postDataJSON()
      assert.equal(p_request_id,booking)
      through=Math.max(through,p_through_id)
      return route.fulfill({json:true})
    }
    if(table==='send_booking_chat') {
      const {p_request_id,p_client_id,p_body}=request.postDataJSON()
      assert.equal(p_request_id,booking)
      assert.equal(p_body,'Thanks for the help')
      if(!firstMessageId) {
        firstMessageId=p_client_id
        return route.fulfill({status:500,json:{message:'Fixture transport failure'}})
      }
      assert.equal(p_client_id,firstMessageId)
      messages.push({id:2,sender_role:'customer',body:p_body,created_at:account.created_at})
      return route.fulfill({json:2})
    }
    if(table==='booking_payment_attempts') return route.fulfill({json:[...payments].reverse()})
    if(table==='simulate_booking_payment') {
      const {p_request_id,p_attempt_id,p_method,p_succeeds}=request.postDataJSON()
      assert.equal(p_request_id,booking)
      assert.equal(p_method,'online')
      assert.equal(p_succeeds,payments.length===1)
      paymentStatus=p_succeeds?'paid':'failed'
      payments.push({id:p_attempt_id,request_id:booking,method:p_method,result:paymentStatus,amount_inr:480,created_at:account.created_at})
      return route.fulfill({json:paymentStatus})
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
  await page.getByRole('button',{name:'Booking chat · 1 unread',exact:true}).click()
  await page.getByText('Fuel delivered safely',{exact:true}).waitFor()
  await page.getByRole('button',{name:'Hide booking chat',exact:true}).waitFor()
  assert.equal(through,1)
  await page.getByLabel('Message',{exact:true}).fill('Thanks for the help')
  await page.getByRole('button',{name:'Send message'}).click()
  await page.getByText('Could not send your message. Try again.',{exact:true}).waitFor()
  await page.getByRole('button',{name:'Send message'}).click()
  await page.getByText('Thanks for the help',{exact:true}).waitFor()
  messages.push({id:3,sender_role:'technician',body:'Glad I could help',created_at:account.created_at})
  broadcast('chat')
  await page.getByText('Glad I could help',{exact:true}).waitFor({timeout:5000})
  await page.waitForFunction(()=>document.querySelector('button[aria-expanded=true]')!==null)

  await page.getByRole('button',{name:'Payments and receipts',exact:true}).click()
  await page.getByRole('button',{name:'Simulate payment failure',exact:true}).click()
  await page.getByText('Simulated payment failed. You can retry.',{exact:true}).waitFor()
  await page.getByRole('button',{name:'Simulate successful payment',exact:true}).click()
  await page.getByText('Simulated payment confirmed.',{exact:true}).waitFor()
  const ready = page.waitForEvent('download')
  await page.getByRole('button',{name:'Download receipt',exact:true}).click()
  const download = await ready
  const receipt = fs.readFileSync(await download.path(),'utf8')
  assert.ok(download.suggestedFilename().startsWith('nexroad-receipt-'))
  assert.match(receipt,/480\.00/)
  assert.match(receipt,/No money was collected/)
  assert.equal(payments.length,2)
  assert.deepEqual(errors,[])
})
