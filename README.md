# TehProf Support MCP Server

> AI-powered helpdesk management via [Model Context Protocol](https://modelcontextprotocol.io). Connect any MCP-compatible assistant (Claude, ChatGPT, Cursor, Cline) to your support workspace — no custom integration code.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![MCP Protocol](https://img.shields.io/badge/MCP-2025--03--26-blue)](https://modelcontextprotocol.io)
[![Node](https://img.shields.io/badge/node-%E2%89%A5%2020-brightgreen)](package.json)
[![Transport: HTTP](https://img.shields.io/badge/transport-Streamable%20HTTP-green)](https://spec.modelcontextprotocol.io/specification/basic/transports/)
[![Tools](https://img.shields.io/badge/tools-30-blueviolet)](#tools-by-tier)
[![GitHub stars](https://img.shields.io/github/stars/tehprof/support-mcp?style=social)](https://github.com/tehprof/support-mcp/stargazers)

**TehProf Support** ([support.tehprof.kz](https://support.tehprof.kz)) is a multi-tenant SaaS helpdesk built for IT service companies. This server exposes **30 AI tools** covering knowledge search, ticket lifecycle, analytics, automation, and Bitrix24 CRM proxy — gated by subscription tier.

Zero installation: use the hosted endpoint at `https://support.tehprof.kz/mcp`.

## Table of Contents

- [Quick Start](#quick-start)
- [Tools by Tier](#tools-by-tier)
- [Supported AI Clients](#supported-ai-clients)
- [Architecture](#architecture)
- [Server Discovery](#server-discovery)
- [Authentication](#authentication)
- [Self-Hosting](#self-hosting)
- [Security](#security)
- [FAQ](#faq)
- [Contributing](#contributing)
- [License](#license)

## Quick Start

### Option 1 — hosted (recommended)

Add to your MCP client config — no install, no server to run:

```json
{
  "mcpServers": {
    "tehprof-support": {
      "url": "https://support.tehprof.kz/mcp",
      "transport": "streamable-http"
    }
  }
}
```

For authenticated access (unlocks tier-specific tools):

```json
{
  "mcpServers": {
    "tehprof-support": {
      "url": "https://support.tehprof.kz/mcp",
      "transport": "streamable-http",
      "headers": { "Authorization": "Bearer YOUR_API_KEY" }
    }
  }
}
```

### Option 2 — sanity check via curl

```bash
curl -sX POST https://support.tehprof.kz/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"curl","version":"1.0"}}}'
```

You should receive an `initialize` response with server capabilities.

## Tools by Tier

The server gates tools by your TehProf Support plan. Anonymous (no API key) works out of the box.

### Free — anonymous, no API key

| Tool | What it does |
|------|-------------|
| `knowledge_search` | Full-text search across the knowledge base |
| `knowledge_read` | Read a specific article |
| `knowledge_list` | List articles by category |
| `onboarding_guide` | Step-by-step setup walkthrough |
| `onboarding_features` | Feature matrix by plan |
| `demo_create_ticket` | Create a ticket in the sandbox |
| `demo_view_ticket` | Inspect a demo ticket |
| `demo_workflow` | Walk the full ticket lifecycle |
| `pricing_plans` | List all pricing plans |
| `pricing_calculate` | Personalized plan recommendation |
| `system_health` | Platform status probe |
| `system_info` | Server capabilities |
| `system_tenant_info` | Your tenant metadata |
| `settings_get` | Read tenant settings |
| `settings_update` | Update available settings |
| `settings_operators` | List operators in your team |

### Starter

| Tool | What it does |
|------|-------------|
| `tickets_list` | Filtered ticket list |
| `tickets_get` | Ticket + messages + participants |
| `analytics_dashboard` | KPI dashboard overview |
| `channels_list` | Messaging channels |
| `channels_status` | Per-channel connection state |

### Pro

| Tool | What it does |
|------|-------------|
| `tickets_create` | Create new tickets |
| `tickets_reply` | Post replies on behalf of an operator |
| `tickets_update` | Change status / priority |
| `analytics_sla` | SLA compliance report |
| `analytics_operators` | Per-operator performance |
| `automation_rules_list` | List automation rules |
| `automation_rules_create` | Create new rules |
| `automation_rules_toggle` | Enable / disable rules |
| `webhooks_list` | Outbound webhooks |

### Business

| Tool | What it does |
|------|-------------|
| `bitrix_contacts` | Search CRM contacts |
| `bitrix_deals` | List CRM deals |
| `bitrix_tasks` | Filter Bitrix24 tasks |
| `bitrix_task_create` | Create Bitrix24 tasks linked to tickets |
| `bitrix_users` | Portal user directory |
| `channels_configure` | Configure WA / TG / Email channels |

## Supported AI Clients

Works with any client that speaks MCP over Streamable HTTP:

- **Claude Desktop** — `claude_desktop_config.json`
- **Claude Code** — `.mcp.json` or `~/.claude/settings.json`
- **Cursor** — MCP settings panel
- **Cline** / **Continue.dev** — `config.json`
- **ChatGPT (Custom GPT)** — see [`gpt-config.md`](gpt-config.md)
- **Custom agents** — any `@modelcontextprotocol/sdk` consumer

## Architecture

```
┌──────────────────────┐     Streamable HTTP      ┌──────────────────────┐
│  AI Client           │  ──────────────────────▶ │  MCP Server (this)   │
│  (Claude, GPT, ...)  │  JSON-RPC 2.0 + SSE      │  Node 20 + TS strict │
└──────────────────────┘                          └──────────┬───────────┘
                                                             │ HTTP localhost
                                                             ▼
                                                   ┌──────────────────────┐
                                                   │  PHP backend         │
                                                   │  mcp-auth.php        │
                                                   │  mcp-internal.php    │
                                                   └──────────┬───────────┘
                                                              │
                                                              ▼
                                                   ┌──────────────────────┐
                                                   │  SQLite (WAL)        │
                                                   │  Bitrix24 REST       │
                                                   └──────────────────────┘
```

**Why Streamable HTTP (MCP 2025-03-26) and not stdio / SSE?** Works through corporate proxies, scales horizontally, no long-lived connections to manage — the canonical transport for remote MCP.

## Server Discovery

MCP clients can auto-discover this server via the `.well-known` endpoint:

```
GET https://support.tehprof.kz/.well-known/mcp.json
```

The response lists server capabilities, auth requirements, and tier descriptors.

## Authentication

1. Log in at [support.tehprof.kz](https://support.tehprof.kz).
2. **Settings → API Keys → Create**.
3. Use it as `Authorization: Bearer <key>` in the MCP client header config.
4. Revoke / rotate any time from the same panel.

Keys are hashed at rest, rate-limited, and validated against the tenant's plan on every call.

## Security

- **Transport**: TLS 1.3, HSTS, no mixed content.
- **CORS**: allowlist (`support.tehprof.kz`, `claude.ai`, `chat.openai.com`) — no wildcard.
- **Sessions**: 1-hour inactivity TTL, evicted every 5 minutes.
- **Secrets**: never sent client-side, stored in HashiCorp Vault server-side.
- **Audit log**: every tool call is recorded against the tenant.

Report vulnerabilities to `ilay25@gmail.com` (please do not open public issues for security).

## Self-Hosting

For tenants who need the MCP server running in their own network:

```bash
git clone https://github.com/tehprof/support-mcp
cd support-mcp
npm install
npm run build
MCP_PORT=8101 MCP_HOST=127.0.0.1 node dist/index.js
```

Set `SUPPORT_BACKEND_URL` to point at your Support backend. See [`CLAUDE.md`](CLAUDE.md) for full env reference.

## FAQ

**Does this work without a TehProf account?**
Yes — anonymous access unlocks 16 free tools (knowledge, onboarding, demo, pricing, system, settings).

**Can I use it with ChatGPT?**
Yes. Use a Custom GPT — configuration is in [`gpt-config.md`](gpt-config.md).

**What if my plan doesn't include a tool?**
The tool is hidden from `tools/list` — AI agents never see it. Upgrade at [support.tehprof.kz](https://support.tehprof.kz).

**How do I list all tools my plan exposes?**
Call MCP `tools/list` — the server filters in real time based on your `Authorization` header.

**Where is the source code?**
Right here — [github.com/tehprof/support-mcp](https://github.com/tehprof/support-mcp). MIT licensed.

## Links

- Website — [support.tehprof.kz](https://support.tehprof.kz)
- MCP endpoint — `https://support.tehprof.kz/mcp`
- Server card — [`/.well-known/mcp.json`](https://support.tehprof.kz/.well-known/mcp.json)
- Knowledge base — [support.tehprof.kz/help](https://support.tehprof.kz/help)
- Bitrix24 Marketplace — [bitrix24.kz/apps/app/tekhprof.app2](https://www.bitrix24.kz/apps/app/tekhprof.app2/)
- MCP spec — [modelcontextprotocol.io](https://modelcontextprotocol.io)

## Contributing

Pull requests welcome. For non-trivial changes, please open an issue first to discuss.

## License

MIT — see [LICENSE](LICENSE).
