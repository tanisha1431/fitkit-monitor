-- Create function_logs table
create table if not exists function_logs (
  id            bigserial primary key,
  function_name text not null,
  user_id       uuid references users(id) on delete set null,
  org_id        uuid references organizations(id) on delete set null,
  boot_ms       int,
  duration_ms   int,
  cache_hit     boolean,
  status        text not null check (status in ('success', 'failed')),
  error_step    text,
  error_message text,
  metadata      jsonb,
  created_at    timestamptz not null default now()
);

-- Indexes for common query patterns
create index on function_logs (created_at desc);
create index on function_logs (function_name, created_at desc);
create index on function_logs (status, created_at desc);
create index on function_logs (org_id, created_at desc);
create index on function_logs (function_name, status, created_at desc);

-- pg_cron: delete rows older than 30 days (runs every night at midnight)
select cron.schedule(
  'cleanup-function-logs',
  '0 0 * * *',
  $$ delete from function_logs where created_at < now() - interval '30 days' $$
);

-- Comment
comment on table function_logs is
  'One row per edge function invocation. Written by withErrorHandling wrapper. Rotated by pg_cron.';
