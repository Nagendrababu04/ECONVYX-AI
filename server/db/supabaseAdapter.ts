// ECONVYX AI — Supabase Persistence Adapter
// Syncs the in-memory DatabaseSchema with Supabase PostgreSQL tables.
// Loads all data on startup; writes changes back on save().

import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient.js';
import type { DatabaseSchema } from './database.js';

// Mapping: in-memory property name → Supabase table name
const TABLE_MAP: Record<keyof DatabaseSchema, string> = {
  users: 'users',
  businessWorkspaces: 'business_workspaces',
  workspaceMembers: 'workspace_members',
  customers: 'customers',
  suppliers: 'suppliers',
  documents: 'documents',
  invoices: 'invoices',
  bills: 'bills',
  purchaseOrders: 'purchase_orders',
  goodsReceiptNotes: 'goods_receipt_notes',
  payments: 'payments',
  paymentAllocations: 'payment_allocations',
  bankTransactions: 'bank_transactions',
  verificationCases: 'verification_cases',
  cashFlowScenarios: 'cash_flow_scenarios',
  reminders: 'reminders',
  auditLogs: 'audit_logs',
  notifications: 'notifications',
  passwordResetTokens: 'password_reset_tokens',
};

// Column name mapping: camelCase → snake_case for Supabase
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function rowToSnake(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[toSnakeCase(key)] = value;
  }
  return result;
}

function rowToCamel(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[toCamelCase(key)] = value;
  }
  return result;
}

/**
 * Load all data from Supabase tables into memory.
 * Returns a partial DatabaseSchema with whatever tables exist and have data.
 */
export async function loadFromSupabase(): Promise<Partial<DatabaseSchema>> {
  if (!isSupabaseConfigured()) return {};

  const supabase = getSupabaseClient();
  if (!supabase) return {};

  const result: Partial<DatabaseSchema> = {};

  for (const [schemaKey, tableName] of Object.entries(TABLE_MAP)) {
    try {
      const { data, error } = await supabase.from(tableName).select('*');
      if (error) {
        // Table may not exist yet — skip gracefully
        console.warn(`[Supabase] Could not load table "${tableName}": ${error.message}`);
        continue;
      }
      if (data && data.length > 0) {
        (result as any)[schemaKey] = data.map((row: any) => rowToCamel(row));
      }
    } catch (err: any) {
      console.warn(`[Supabase] Error loading table "${tableName}":`, err.message);
    }
  }

  console.log(`[Supabase] Loaded data from ${Object.keys(result).length} tables.`);
  return result;
}

/**
 * Persist the entire in-memory schema to Supabase using upsert.
 * This is called on every save() when Supabase is configured.
 * Uses fire-and-forget async to not block the synchronous save() call path.
 */
export async function saveToSupabase(data: DatabaseSchema): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = getSupabaseClient();
  if (!supabase) return;

  for (const [schemaKey, tableName] of Object.entries(TABLE_MAP)) {
    const records = (data as any)[schemaKey];
    if (!records || !Array.isArray(records) || records.length === 0) continue;

    try {
      const snakeRows = records.map((r: any) => rowToSnake(r));
      const { error } = await supabase.from(tableName).upsert(snakeRows, {
        onConflict: 'id',
        ignoreDuplicates: false,
      });
      if (error) {
        console.warn(`[Supabase] Upsert to "${tableName}" failed: ${error.message}`);
      }
    } catch (err: any) {
      console.warn(`[Supabase] Error saving to "${tableName}":`, err.message);
    }
  }
}

/**
 * Delete a record from a Supabase table.
 */
export async function deleteFromSupabase(schemaKey: keyof DatabaseSchema, id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = getSupabaseClient();
  if (!supabase) return;

  const tableName = TABLE_MAP[schemaKey];
  if (!tableName) return;

  try {
    await supabase.from(tableName).delete().eq('id', id);
  } catch (err: any) {
    console.warn(`[Supabase] Error deleting from "${tableName}" id=${id}:`, err.message);
  }
}
