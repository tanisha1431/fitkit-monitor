-- RPC function that edge functions call to batch-insert their logs.
-- Call from edge functions:
--   await supabase.rpc('insert_edge_function_logs', { logs: [...] })

create or replace function insert_edge_function_logs(logs jsonb)
returns void
language plpgsql
security definer
as $$
begin
  insert into edge_function_logs (
    event_id, function_name, level, message, timestamp,
    execution_id, method, path, status_code, duration_ms, metadata
  )
  select
    (log->>'event_id'),
    (log->>'function_name'),
    coalesce(log->>'level', 'info'),
    (log->>'message'),
    to_timestamp((log->>'timestamp')::bigint / 1000000.0),
    (log->>'execution_id'),
    (log->>'method'),
    (log->>'path'),
    (log->>'status_code')::int,
    (log->>'duration_ms')::int,
    (log->'metadata')::jsonb
  from jsonb_array_elements(logs) as log
  on conflict (event_id) do nothing;
end;
$$;
