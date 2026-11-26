#!/usr/bin/env bash
set -euo pipefail
root=$(cd "$(dirname "$0")/../.." && pwd)
logs=$(mktemp -d)
NEXROAD_TEST_CONTAINER=$(docker run --rm -d -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17)
export NEXROAD_TEST_CONTAINER
trap 'docker stop "$NEXROAD_TEST_CONTAINER" >/dev/null; rm -rf "$logs"' EXIT
db() { docker exec -i "$NEXROAD_TEST_CONTAINER" psql -X -U postgres -v ON_ERROR_STOP=1 "$@"; }
for attempt in {1..30}; do
  if docker exec "$NEXROAD_TEST_CONTAINER" pg_isready -U postgres -h 127.0.0.1 >/dev/null; then break; fi
  sleep 1
done
db < "$root/tests/database/baseline.sql" > "$logs/baseline"
db > "$logs/realtime" <<'SQL'
create schema realtime;
create table realtime.messages(topic text, extension text, event text, payload jsonb, private boolean);
alter table realtime.messages enable row level security;
grant usage on schema realtime to authenticated, anon;
grant select, insert on realtime.messages to authenticated, anon;
create function realtime.topic() returns text language sql stable as
$$ select current_setting('realtime.topic', true) $$;
create function realtime.send(payload jsonb, event text, topic text, private boolean)
returns void language sql as
$$ insert into realtime.messages values (topic, 'broadcast', event, payload, private) $$;
SQL
for migration in "$root"/supabase/migrations/*.sql; do
  db < "$migration" > "$logs/migration"
  if [[ "$migration" == *_automated_booking_matching.sql ]]; then
    db < "$root/tests/database/phase9-test.sql" > "$logs/matching"
    docker exec "$NEXROAD_TEST_CONTAINER" createdb -U postgres -T postgres phase9_races
    (cd "$logs" && bash "$root/tests/database/booking-races.sh")
    db > "$logs/service-types" <<'SQL'
insert into public.service_categories (slug, name) values ('mechanical', 'Mechanical Assistance') on conflict (slug) do nothing;
update public.user_profiles set role='admin' where id='00000000-0000-0000-0000-000000000012';
SQL
  fi
done
db < "$root/tests/database/phase13-test.sql"
echo 'Migration replay, role isolation, booking concurrency, payments and chat passed.'
