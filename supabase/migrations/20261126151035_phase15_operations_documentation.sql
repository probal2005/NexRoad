begin;

comment on function public.accept_request_offer(uuid) is
  'Accepts an eligible offer atomically. Request and technician locks serialize acceptance and prevent simultaneous active assignments.';

comment on function public.create_priced_booking(uuid, jsonb, jsonb) is
  'Creates a booking with its server-verified INR quote. The request UUID makes client retries idempotent.';

comment on function nexroad_private.can_receive_live_topic(text) is
  'Authorizes a private dashboard topic for the current non-suspended account. Broadcasts carry refresh hints.';

comment on function public.simulate_booking_payment(uuid, uuid, text, boolean) is
  'Records an idempotent simulated payment attempt on an owned completed booking. Uses the stored charge and never collects money.';

commit;
