/** Tenant plan tiers — maps to tenants.plan in SQLite */
export type TenantPlan = 'free' | 'starter' | 'pro' | 'business' | 'enterprise';

/** MCP tool access tier */
export type ToolTier = 'free' | 'starter' | 'pro' | 'business' | 'enterprise';

/** Tier hierarchy for comparison */
export const TIER_ORDER: Record<TenantPlan, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  business: 3,
  enterprise: 4,
};

/** Check if tenant plan meets required tier */
export function hasTierAccess(tenantPlan: TenantPlan, requiredTier: ToolTier): boolean {
  return TIER_ORDER[tenantPlan] >= TIER_ORDER[requiredTier];
}

/** Auth context extracted from API key */
export interface AuthContext {
  tenantId: number;
  tenantName: string;
  tenantPlan: TenantPlan;
  apiKeyId: number;
  apiKey?: string;
  scopes: string[];
}

/** Support API response wrapper */
export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/** Ticket from Support API */
export interface Ticket {
  id: number;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  client_name?: string;
  operator_name?: string;
  [key: string]: unknown;
}

/** Knowledge base article */
export interface KBArticle {
  slug: string;
  title: string;
  category: string;
  content: string;
}

/** Tool definition with tier requirement */
export interface ToolDef {
  name: string;
  description: string;
  tier: ToolTier;
  scope?: string;
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>, ctx: AuthContext) => Promise<unknown>;
}
