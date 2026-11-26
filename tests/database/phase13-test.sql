begin;
insert into auth.users(id) values('00000000-0000-0000-0000-000000000013');
do $test$
declare
  customer constant uuid := '00000000-0000-0000-0000-000000000001';
  technician constant uuid := '00000000-0000-0000-0000-000000000002';
  unrelated constant uuid := '00000000-0000-0000-0000-000000000013';
  administrator constant uuid := '00000000-0000-0000-0000-000000000012';
  booking uuid := gen_random_uuid();
  failed uuid := gen_random_uuid();
  paid uuid := gen_random_uuid();
  client_message uuid := gen_random_uuid();
  offer uuid;
  message_id bigint;
  reply_id bigint;
  input jsonb := '{"category_id":"10000000-0000-0000-0000-000000000001","service_location":"Chandigarh","latitude":30.7333,"longitude":76.7794,"fuel_type":"petrol","fuel_litres":3,"payment_method":"online"}';
  quote jsonb;
  amount numeric;
begin
  update public.technician_locations set latitude=30.7333,longitude=76.7794 where technician_id=technician;
  update public.technician_availability set is_online=true,accepting_requests=true,location_sharing=true where technician_id=technician;
  perform set_config('request.jwt.claim.sub',customer::text,true);
  execute 'set local role authenticated';
  quote:=public.quote_booking(input);
  amount:=(quote->>'total_inr')::numeric;
  if public.create_priced_booking(booking,input,quote) is distinct from booking then raise exception 'Checkout failed'; end if;
  if (select payment_method from public.service_requests where id=booking) <> 'online'
    or public.simulate_booking_payment(booking,paid,'online',true) is not null
    or public.send_booking_chat(booking,client_message,'Hello') is not null then
    raise exception 'Early payment/chat or method selection failed';
  end if;
  perform set_config('request.jwt.claim.sub',technician::text,true);
  select id into offer from public.request_offers where request_id=booking and technician_id=technician;
  if not coalesce((public.accept_request_offer(offer)->>'success')::boolean,false) then raise exception 'Accept failed'; end if;
  perform set_config('request.jwt.claim.sub',customer::text,true);
  message_id:=public.send_booking_chat(booking,client_message,'  Please call on arrival  ');
  if message_id is null or public.send_booking_chat(booking,client_message,'Please call on arrival') is distinct from message_id
    or public.send_booking_chat(booking,client_message,'Different body') is not null then raise exception 'Chat idempotency failed'; end if;
  if exists(select 1 from public.booking_chat_unread()) then raise exception 'Own message counted as unread'; end if;
  perform set_config('request.jwt.claim.sub',technician::text,true);
  if not exists(select 1 from public.booking_chat_unread() where request_id=booking and unread_count=1)
    or not exists(select 1 from public.booking_chat_messages where request_id=booking and sender_role='customer' and body='Please call on arrival') then
    raise exception 'Technician unread or role failed';
  end if;
  if not public.mark_booking_chat_read(booking,message_id) or public.mark_booking_chat_read(booking,999999999) then raise exception 'Read receipt validation failed'; end if;
  if exists(select 1 from public.booking_chat_unread() where request_id=booking) then raise exception 'Unread did not clear'; end if;
  reply_id:=public.send_booking_chat(booking,gen_random_uuid(),'On my way');
  if reply_id is null or not public.advance_technician_job(booking,'technician_arriving')
    or not public.advance_technician_job(booking,'in_progress')
    or not public.submit_technician_service(booking,'{"summary":"Fuel delivered","fuel_litres":3}') then raise exception 'Technician workflow failed'; end if;

  perform set_config('request.jwt.claim.sub',unrelated::text,true);
  if exists(select 1 from public.booking_chat_messages where request_id=booking)
    or public.send_booking_chat(booking,gen_random_uuid(),'Cross-booking message') is not null or public.mark_booking_chat_read(booking,reply_id) then
    raise exception 'Non-participant chat access';
  end if;
  perform set_config('request.jwt.claim.sub',administrator::text,true);
  if exists(select 1 from public.booking_chat_messages where request_id=booking) then raise exception 'Administrator read private chat'; end if;
  perform set_config('request.jwt.claim.sub',customer::text,true);
  if not exists(select 1 from public.booking_chat_unread() where request_id=booking and unread_count=1)
    or not public.confirm_customer_service(booking) then raise exception 'Customer unread or confirmation failed'; end if;

  if public.simulate_booking_payment(booking,failed,'online',false) is distinct from 'failed'
    or public.simulate_booking_payment(booking,failed,'online',false) is distinct from 'failed'
    or public.simulate_booking_payment(booking,failed,'online',true) is not null
    or public.simulate_booking_payment(booking,gen_random_uuid(),'cash',false) is not null then
    raise exception 'Payment failure and retry validation failed';
  end if;
  if public.simulate_booking_payment(booking,paid,'online',true) is distinct from 'paid'
    or public.simulate_booking_payment(booking,gen_random_uuid(),'cash',true) is distinct from 'already_paid' then
    raise exception 'Payment success or duplicate protection failed';
  end if;
  if (select count(*) from public.booking_payment_attempts where request_id=booking and amount_inr=amount)<>2
    or (select payment_status from public.service_requests where id=booking)<>'paid' then
    raise exception 'Payment history or amount mismatch';
  end if;
  perform set_config('realtime.topic','nexroad:user:'||customer,true);
  if not exists(select 1 from realtime.messages where payload->>'scope'='chat' and private)
    or not exists(select 1 from realtime.messages where payload->>'scope'='payment' and private) then raise exception 'Expected live signals missing'; end if;
  perform set_config('request.jwt.claim.sub',technician::text,true);
  if exists(select 1 from public.booking_payment_attempts where request_id=booking)
    or (select simulated_earnings from public.technician_performance()) is distinct from amount then
    raise exception 'Payment privacy or earnings mismatch';
  end if;
  execute 'reset role';
end;
$test$;
rollback;
