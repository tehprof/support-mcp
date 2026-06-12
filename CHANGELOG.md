# Changelog

All notable changes to the TehProf Support MCP Server are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/) and the
project adheres to [Semantic Versioning](https://semver.org/).

## [1.2.0] — 2026-06-12

### Added
- `tickets_create` now syncs the customer **company and contact** by your own
  stable external IDs (`company_external_id`, `company_bin`, `contact_external_id`)
  — idempotent, following the Zendesk `external_id` canon — so a ticket is
  auto-linked to the right company without a separate directory upload.
- `tickets_create` accepts `external_ref` for ticket-level idempotency: a repeat
  call with the same value returns the existing ticket (`deduplicated: true`)
  instead of creating a duplicate.
- `tickets_create` accepts explicit `client_name` / `client_email` / `client_phone`
  for the contact person.

### Changed
- Knowledge base search (`knowledge_search`) reworked: tokenized ranking across
  title, slug, category and full content, with clearer snippets and a richer
  tool description for AI agents.
- Authenticated calls now propagate the tenant API key as an `Authorization:
  Bearer` header end-to-end through the shared backend client.
- `system_tenant_info` refactored onto the shared backend client (removed a
  hardcoded localhost fallback).
- Tool count corrected across README, badge and `server.json`: **36 tools**
  (16 free, 5 starter, 9 pro, 6 business). Previous metadata understated this.

### Fixed
- `package.json` / `server.json` version now tracks the release tags.
- Added the MIT `LICENSE` file (previously referenced but missing).

## [1.1.1] — 2026-04-21

### Changed
- Repository moved to the `tehprof` organization; README and metadata URLs updated.

## [1.1.0] — 2026-04-19

### Added
- Grew the tool surface and added a Custom GPT configuration guide.

### Changed
- Security hardening: CORS allowlist instead of wildcard; 1-hour session TTL with
  eviction every 5 minutes; migration to the low-level MCP `Server` API.
- Comprehensive README rewrite (Stripe-style layout).

## [1.0.0] — 2026-03-21

### Added
- Initial release: TehProf Support MCP Server over Streamable HTTP, with
  tier-gated tools for knowledge, tickets, analytics, automation and Bitrix24.
