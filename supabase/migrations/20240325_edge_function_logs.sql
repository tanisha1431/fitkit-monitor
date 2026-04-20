-- Store raw edge function logs pulled from Supabase Management API
-- Supabase only retains logs for 5 days; this table preserves them long-term
create table if not exists edge_function_logs (
  id            bigserial primary key,
  event_id      text unique,              -- dedupe key from Supabase log event
  function_name text not null,
  level         text,                     -- info, warn, error, debug
  message       text,
  timestamp     timestamptz not null,
  execution_id  text,                     -- groups logs from same invocation
  method        text,                     -- HTTP method
  path          text,                     -- request path
  status_code   int,
  duration_ms   int,
  region        text,
  metadata      jsonb,                    -- full raw log event
  created_at    timestamptz not null default now()
);

-- Indexes for common queries
create index on edge_function_logs (timestamp desc);
create index on edge_function_logs (function_name, timestamp desc);
create index on edge_function_logs (level, timestamp desc);
create index on edge_function_logs (execution_id);

-- pg_cron: delete rows older than 90 days (runs every night at midnight)
select cron.schedule(
  'cleanup-edge-function-logs',
  '0 0 * * *',
  $$ delete from edge_function_logs where timestamp < now() - interval '90 days' $$
);

comment on table edge_function_logs is
  'Raw edge function logs pulled from Supabase Management API. Retained for 90 days (vs 5 days in Supabase).';
