begin;

create index if not exists booking_chat_reads_user_idx
  on nexroad_private.booking_chat_reads (user_id);
create index if not exists customer_complaints_customer_idx
  on nexroad_private.customer_complaints (customer_id);
create index if not exists customer_complaints_request_idx
  on nexroad_private.customer_complaints (request_id);
create index if not exists service_requests_vehicle_customer_idx
  on public.service_requests (vehicle_id, customer_id);
create index if not exists service_requests_customer_recent_idx
  on public.service_requests (customer_id, requested_at desc, id);

commit;
