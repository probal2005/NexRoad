set -eu
db() { docker exec -i "$NEXROAD_TEST_CONTAINER" psql -X -U postgres -d phase9_races -v ON_ERROR_STOP=1 "$@"; }

accept() {
  offer=$(db -Atqc "select id from public.request_offers where request_id='20000000-0000-0000-0000-00000000000$1' and technician_id='00000000-0000-0000-0000-00000000000$2'" < /dev/null)
  test -n "$offer"
  db <<SQL
begin;
set local statement_timeout='8s';
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-00000000000$2';
select public.accept_request_offer('$offer');
select pg_sleep(1.3);
commit;
SQL
}

race() {
  label=$1
  shift
  accept "$1" "$2" > "$label-phase9-winner.log" 2>&1 &
  winner=$!
  attempts=0
  until db -Atqc "select exists(select 1 from pg_stat_activity where query='select pg_sleep(1.3);' and wait_event='PgSleep')" < /dev/null | grep -qx t; do
    attempts=$((attempts+1))
    test "$attempts" -lt 20
    sleep .05
  done
  if accept "$3" "$4" > "$label-phase9-loser.log" 2>&1; then
    echo 'Unexpected second acceptance'
    exit 1
  fi
  wait "$winner"
  grep -q 'Request accepted successfully' "$label-phase9-winner.log"
  grep -q "$5" "$label-phase9-loser.log"
  echo "$label passed"
}

db -qc "update public.request_offers set expires_at=now()+interval '1 minute'
  where request_id='20000000-0000-0000-0000-000000000003';
  update public.technician_locations set updated_at=now() where right(technician_id::text,2)::int between 2 and 7;" < /dev/null

race same-booking 3 2 3 3 'Request is no longer available'

db <<'SQL'
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
insert into public.service_requests(id,customer_id,category_id,service_location,latitude,longitude)
select ('20000000-0000-0000-0000-00000000000'||n)::uuid, auth.uid(),
 '10000000-0000-0000-0000-000000000001','Chandigarh',30.7333,76.7794 from generate_series(5,6)n;
SQL

race same-technician 5 4 6 4 'Technician is not currently eligible'
db <<'SQL'
do $$ begin
  if (select count(*) from public.service_requests where assigned_technician_id='00000000-0000-0000-0000-000000000004'
      and request_status='accepted') <> 1
    or exists(select 1 from public.request_offers where request_id='20000000-0000-0000-0000-000000000003' and offer_status='offered')
    or exists(select 1 from public.request_offers where request_id in ('20000000-0000-0000-0000-000000000005','20000000-0000-0000-0000-000000000006')
      and technician_id='00000000-0000-0000-0000-000000000002') then
    raise exception 'Race state or busy-technician exclusion failed';
  end if;
end $$;
SQL
