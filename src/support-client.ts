/**
 * HTTP client for Support app internal API.
 * All MCP tools communicate with the PHP backend through this client.
 */
import type { ApiResponse, AuthContext } from './types.js';

const SUPPORT_BASE = process.env.SUPPORT_API_URL || 'http://127.0.0.1:8095';

/** Make authenticated request to Support PHP API */
export async function supportApi<T = unknown>(
  endpoint: string,
  ctx: AuthContext,
  params: Record<string, unknown> = {},
  method: 'GET' | 'POST' = 'GET'
): Promise<ApiResponse<T>> {
  const url = new URL(`/api/${endpoint}`, SUPPORT_BASE);

  const headers: Record<string, string> = {
    'X-MCP-Tenant-Id': String(ctx.tenantId),
    'X-MCP-Api-Key-Id': String(ctx.apiKeyId),
    'Content-Type': 'application/json',
  };
  if (ctx.apiKey) headers.Authorization = `Bearer ${ctx.apiKey}`;

  let body: string | undefined;

  if (method === 'GET') {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  } else {
    body = JSON.stringify(params);
  }

  const res = await fetch(url.toString(), { method, headers, body });
  const json = await res.json() as ApiResponse<T>;
  return json;
}

/** GET shorthand */
export async function supportGet<T = unknown>(
  endpoint: string,
  ctx: AuthContext,
  params: Record<string, unknown> = {}
): Promise<ApiResponse<T>> {
  return supportApi<T>(endpoint, ctx, params, 'GET');
}

/** POST shorthand */
export async function supportPost<T = unknown>(
  endpoint: string,
  ctx: AuthContext,
  params: Record<string, unknown> = {}
): Promise<ApiResponse<T>> {
  return supportApi<T>(endpoint, ctx, params, 'POST');
}

/** Read a local documentation file (for knowledge base tools) */
export async function readDocsFile(slug: string): Promise<string | null> {
  const fs = await import('fs/promises');
  const path = await import('path');

  // Sanitize slug to prevent path traversal
  const safe = slug.replace(/[^a-zA-Z0-9\-_/]/g, '');
  const docsRoot = process.env.DOCS_PATH || '/srv/apps/support/app/docs';
  const filePath = path.join(docsRoot, `${safe}.md`);

  // Verify the resolved path is under docsRoot
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(docsRoot))) return null;

  try {
    return await fs.readFile(resolved, 'utf-8');
  } catch {
    return null;
  }
}

/** List available documentation files */
export async function listDocs(): Promise<Array<{ slug: string; category: string }>> {
  const fs = await import('fs/promises');
  const path = await import('path');
  const docsRoot = process.env.DOCS_PATH || '/srv/apps/support/app/docs';

  const results: Array<{ slug: string; category: string }> = [];

  async function scanDir(dir: string, prefix: string) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          await scanDir(path.join(dir, entry.name), `${prefix}${entry.name}/`);
        } else if (entry.name.endsWith('.md') && entry.name !== 'README.md' && entry.name !== 'TEMPLATE.md') {
          results.push({
            slug: `${prefix}${entry.name.replace('.md', '')}`,
            category: prefix.replace(/\/$/, '') || 'root',
          });
        }
      }
    } catch { /* dir not found */ }
  }

  await scanDir(docsRoot, '');
  return results;
}
