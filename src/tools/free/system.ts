/**
 * System tools — FREE tier.
 * Health check, service info, platform status.
 */
import { registerTool } from '../../tool-registry.js';
import { supportGet } from '../../support-client.js';

registerTool({
  name: 'system_health',
  description: 'Check TehProf Support platform health and uptime status.',
  tier: 'free',
  inputSchema: {
    type: 'object',
    properties: {},
  },
  handler: async () => {
    try {
      const base = process.env.SUPPORT_API_URL || 'http://127.0.0.1:8095';
      const res = await fetch(`${base}/api/health.php`);
      const data = await res.json();
      return {
        status: res.ok ? 'operational' : 'degraded',
        response_time_ms: Date.now(),
        details: data,
        platform: 'TehProf Support v1.0',
        homepage: 'https://support.tehprof.kz',
      };
    } catch {
      return { status: 'unreachable', message: 'Support service is temporarily unavailable.' };
    }
  },
});

registerTool({
  name: 'system_info',
  description: 'Get information about TehProf Support platform: what it is, who it is for, key capabilities, supported languages and integrations.',
  tier: 'free',
  inputSchema: {
    type: 'object',
    properties: {},
  },
  handler: async () => {
    return {
      name: 'TehProf Support',
      tagline: 'Universal SaaS helpdesk platform for IT companies',
      description: 'Multi-tenant support ticket system with CRM integrations, omnichannel messaging, AI assistant, and MCP integration for AI-powered management.',
      target_audience: [
        'IT outsourcing companies',
        'Managed service providers (MSP)',
        'SaaS companies with support needs',
        'Freelance IT consultants',
      ],
      key_features: [
        'Multi-tenant architecture (each company gets isolated workspace)',
        'Omnichannel: Widget, WhatsApp, Telegram, Email, MAX Messenger',
        'CRM integration: Bitrix24 (AmoCRM planned)',
        'AI bot assistant "Dina" for automated responses',
        'SLA management with business hours',
        'Real-time screen sharing',
        'Automation rules and webhooks',
        'Full analytics dashboard',
        'MCP integration — manage via any AI assistant',
      ],
      languages: ['Russian', 'Kazakh', 'English'],
      supported_crm: ['Bitrix24', 'Standalone (no CRM)', 'AmoCRM (coming soon)'],
      region: 'Kazakhstan (servers in KZ)',
      compliance: 'Data stored in Kazakhstan, Argon2ID password hashing',
      pricing: 'Free tier available. Plans from 0 to 79,900 ₸/month.',
      mcp_integration: 'This MCP server lets any AI assistant manage the support system.',
      website: 'https://support.tehprof.kz',
      contact: 'support@tehprof.kz',
    };
  },
});

registerTool({
  name: 'system_tenant_info',
  description: 'Get information about your tenant (company) — current plan, usage, limits, and configured features. Requires authentication.',
  tier: 'free',
  inputSchema: {
    type: 'object',
    properties: {},
  },
  handler: async (_, ctx) => {
    if (ctx.tenantId === 0) {
      return {
        message: 'Anonymous access — no tenant context. Provide an API key to see your company details.',
        how_to_get_key: 'Log in to Support admin panel → Settings → API Keys → Create MCP key.',
      };
    }

    try {
      return await supportGet('mcp-internal.php', ctx, { action: 'tenant_info' });
    } catch {
      return { tenant_id: ctx.tenantId, name: ctx.tenantName, plan: ctx.tenantPlan };
    }
  },
});
