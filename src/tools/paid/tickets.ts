/**
 * Ticket management tools — tiered access.
 * starter: list, get
 * pro: create, reply, close, assign
 */
import { registerTool } from '../../tool-registry.js';
import { supportGet, supportPost } from '../../support-client.js';

registerTool({
  name: 'tickets_list',
  description: 'List support tickets with filters. Shows subject, status, priority, operator, and dates. Use for monitoring your support queue.',
  tier: 'starter',
  inputSchema: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['new', 'estimated', 'in_progress', 'on_hold', 'done', 'closed', 'reopened', 'cancelled'], description: 'Filter by status' },
      priority: { type: 'string', enum: ['low', 'normal', 'high', 'critical'], description: 'Filter by priority' },
      operator_id: { type: 'number', description: 'Filter by assigned operator ID' },
      search: { type: 'string', description: 'Search in subject and description' },
      limit: { type: 'number', description: 'Max results (default 20, max 100)' },
      offset: { type: 'number', description: 'Pagination offset' },
    },
  },
  handler: async (args, ctx) => {
    const params: Record<string, unknown> = {
      action: 'get_tickets',
      ...args,
      limit: Math.min(Number(args.limit) || 20, 100),
    };

    const res = await supportGet('mcp-internal.php', ctx, params);
    if (!res.ok) return { error: res.error || 'Failed to fetch tickets' };

    return res.data;
  },
});

registerTool({
  name: 'tickets_get',
  description: 'Get detailed information about a specific ticket including messages, participants, files, status history, and SLA timers.',
  tier: 'starter',
  inputSchema: {
    type: 'object',
    properties: {
      ticket_id: { type: 'number', description: 'Ticket ID' },
    },
    required: ['ticket_id'],
  },
  handler: async (args, ctx) => {
    const res = await supportGet('mcp-internal.php', ctx, {
      action: 'get_ticket',
      ticket_id: args.ticket_id,
    });

    if (!res.ok) return { error: res.error || 'Ticket not found' };
    return res.data;
  },
});

registerTool({
  name: 'tickets_create',
  description: 'Create a new support ticket. Specify subject, description, priority, and optionally assign to an operator. Can sync the customer company/contact by your own stable external IDs (idempotent, Zendesk external_id canon) so the ticket is auto-linked to the right company; pass external_ref for ticket-level idempotency (a repeat call returns the existing ticket).',
  tier: 'pro',
  inputSchema: {
    type: 'object',
    properties: {
      subject: { type: 'string', description: 'Ticket subject' },
      description: { type: 'string', description: 'Detailed description of the issue' },
      priority: { type: 'string', enum: ['low', 'normal', 'high', 'critical'], description: 'Priority level (default: normal)' },
      client_id: { type: 'number', description: 'Client ID (if creating on behalf of a client)' },
      operator_id: { type: 'number', description: 'Assign to specific operator' },
      category: { type: 'string', description: 'Ticket category' },
      client_name: { type: 'string', description: 'Contact person name' },
      client_email: { type: 'string', description: 'Contact email' },
      client_phone: { type: 'string', description: 'Contact phone' },
      company_external_id: { type: 'string', description: 'Your stable company ID — primary key to find/create and link the company (idempotent)' },
      company_bin: { type: 'string', description: 'Company BIN/IIN (12 digits) — secondary company key' },
      company_name: { type: 'string', description: 'Company name — used when creating a new company' },
      contact_external_id: { type: 'string', description: 'Your stable user ID — strongest contact identity key' },
      external_ref: { type: 'string', description: 'Idempotency key: a repeat call with the same value returns the existing ticket (deduplicated:true) instead of creating a duplicate' },
    },
    required: ['subject'],
  },
  handler: async (args, ctx) => {
    const res = await supportPost('mcp-internal.php', ctx, {
      action: 'create_ticket',
      ...args,
    });

    if (!res.ok) return { error: res.error || 'Failed to create ticket' };
    return { message: 'Ticket created successfully', ticket: res.data };
  },
});

registerTool({
  name: 'tickets_reply',
  description: 'Reply to a ticket. Send a message as the operator/support side. Can include internal notes visible only to operators.',
  tier: 'pro',
  inputSchema: {
    type: 'object',
    properties: {
      ticket_id: { type: 'number', description: 'Ticket ID' },
      message: { type: 'string', description: 'Reply message text' },
      is_internal: { type: 'boolean', description: 'If true, creates an internal note (not visible to client)' },
    },
    required: ['ticket_id', 'message'],
  },
  handler: async (args, ctx) => {
    const res = await supportPost('mcp-internal.php', ctx, {
      action: 'reply_ticket',
      ticket_id: args.ticket_id,
      message: args.message,
      is_internal: args.is_internal || false,
    });

    if (!res.ok) return { error: res.error || 'Failed to reply' };
    return { message: 'Reply sent', data: res.data };
  },
});

registerTool({
  name: 'tickets_update',
  description: 'Update ticket status, priority, or assignment. Use for managing ticket lifecycle.',
  tier: 'pro',
  inputSchema: {
    type: 'object',
    properties: {
      ticket_id: { type: 'number', description: 'Ticket ID' },
      status: { type: 'string', enum: ['new', 'estimated', 'in_progress', 'on_hold', 'done', 'closed', 'reopened', 'cancelled'], description: 'New status' },
      priority: { type: 'string', enum: ['low', 'normal', 'high', 'critical'], description: 'New priority' },
      operator_id: { type: 'number', description: 'Reassign to operator' },
    },
    required: ['ticket_id'],
  },
  handler: async (args, ctx) => {
    const res = await supportPost('mcp-internal.php', ctx, {
      action: 'update_ticket',
      ...args,
    });

    if (!res.ok) return { error: res.error || 'Failed to update ticket' };
    return { message: 'Ticket updated', data: res.data };
  },
});
