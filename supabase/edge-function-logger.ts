/**
 * Edge Function Logger — drop this into your edge functions' _shared/ folder.
 *
 * Usage in withErrorHandling or any edge function:
 *
 *   import { EdgeLogger } from "../_shared/edge-function-logger.ts"
 *
 *   const logger = new EdgeLogger("test-leaderboard", supabaseClient)
 *
 *   logger.info("STEP 1", "Supabase client initialized")
 *   logger.info("STEP 4", "Zod validation passed", { report_access_key: "..." })
 *   logger.error("STEP 6", "User not found", { key: "..." })
 *
 *   // At the end of the function (in withErrorHandling's finally block):
 *   await logger.flush()
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface LogEntry {
  event_id: string;
  function_name: string;
  level: string;
  message: string;
  timestamp: number; // microseconds
  execution_id: string;
  method: string | null;
  path: string | null;
  status_code: number | null;
  duration_ms: number | null;
  metadata: Record<string, unknown> | null;
}

export class EdgeLogger {
  private logs: LogEntry[] = [];
  private executionId: string;
  private startTime: number;

  constructor(
    private functionName: string,
    private supabase: SupabaseClient,
    private method?: string,
    private path?: string,
  ) {
    this.executionId = crypto.randomUUID();
    this.startTime = Date.now();
  }

  info(step: string, message: string, metadata?: Record<string, unknown>) {
    this.addLog("info", `${step}: ${message}`, metadata);
  }

  error(step: string, message: string, metadata?: Record<string, unknown>) {
    this.addLog("error", `${step}: ${message}`, metadata);
  }

  warn(step: string, message: string, metadata?: Record<string, unknown>) {
    this.addLog("warn", `${step}: ${message}`, metadata);
  }

  private addLog(level: string, message: string, metadata?: Record<string, unknown>) {
    // Also console.log so it appears in Supabase's built-in log viewer
    const prefix = level === "error" ? "❌" : level === "warn" ? "⚠️" : "✅";
    console.log(`${prefix} [${this.functionName}] ${message}`);

    this.logs.push({
      event_id: crypto.randomUUID(),
      function_name: this.functionName,
      level,
      message,
      timestamp: Date.now() * 1000, // microseconds
      execution_id: this.executionId,
      method: this.method ?? null,
      path: this.path ?? null,
      status_code: null,
      duration_ms: null,
      metadata: metadata ?? null,
    });
  }

  /**
   * Call at the end of the function to write all logs to the DB in one batch.
   * Sets duration_ms on the last log entry.
   */
  async flush(statusCode?: number) {
    if (this.logs.length === 0) return;

    const durationMs = Date.now() - this.startTime;

    // Add a summary log entry
    this.logs.push({
      event_id: crypto.randomUUID(),
      function_name: this.functionName,
      level: (statusCode ?? 200) >= 400 ? "error" : "info",
      message: `[END] ${this.functionName} completed in ${durationMs}ms (status: ${statusCode ?? 200})`,
      timestamp: Date.now() * 1000,
      execution_id: this.executionId,
      method: this.method ?? null,
      path: this.path ?? null,
      status_code: statusCode ?? 200,
      duration_ms: durationMs,
      metadata: null,
    });

    try {
      const { error } = await this.supabase.rpc("insert_edge_function_logs", {
        logs: this.logs,
      });
      if (error) {
        console.error("Failed to flush logs to DB:", error.message);
      }
    } catch (err) {
      console.error("Failed to flush logs to DB:", err);
    }
  }
}
