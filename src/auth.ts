/**
 * MCP API Key authentication.
 * Validates API keys against Support app's api_keys table.
 * Keys are passed via Authorization: Bearer <key> header.
 */
import type { AuthContext, TenantPlan } from './types.js';

const SUPPORT_BASE = process.env.SUPPORT_API_URL || 'http://127.0.0.1:8095';

/** Anonymous context for free-tier tools that don't require auth */
export const ANONYMOUS_CONTEXT: AuthContext = {
  tenantId: 0,
  tenantName: 'anonymous',
  tenantPlan: 'free',
  apiKeyId: 0,
  scopes: ['knowledge', 'onboarding', 'demo', 'pricing', 'system'],
};

/**
 * Validate API key against Support backend.
 * Returns AuthContext if valid, null if invalid.
 */
export async function validateApiKey(apiKey: string): Promise<AuthContext | null> {
  if (!apiKey || apiKey.length < 10) return null;

  try {
    const res = await fetch(`${SUPPORT_BASE}/api/mcp-auth.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey }),
    });

    if (!res.ok) return null;

    const data = await res.json() as {
      ok: boolean;
      tenant_id?: number;
      tenant_name?: string;
      tenant_plan?: string;
      api_key_id?: number;
      scopes?: string[];
    };

    if (!data.ok || !data.tenant_id) return null;

    return {
      tenantId: data.tenant_id,
      tenantName: data.tenant_name || 'unknown',
      tenantPlan: (data.tenant_plan || 'free') as TenantPlan,
      apiKeyId: data.api_key_id || 0,
      apiKey,
      scopes: data.scopes || [],
    };
  } catch {
    return null;
  }
}

/** Extract Bearer token from Authorization header */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}
