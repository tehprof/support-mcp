/**
 * Knowledge base tools — FREE tier.
 * AI can search docs, read articles, list FAQ.
 */
import { registerTool } from '../../tool-registry.js';
import { readDocsFile, listDocs } from '../../support-client.js';

// Short words that add noise to content matching (RU/EN).
const STOPWORDS = new Set([
  'how', 'to', 'the', 'a', 'an', 'of', 'in', 'on', 'for', 'and', 'or', 'is', 'are',
  'как', 'что', 'для', 'и', 'или', 'в', 'на', 'по', 'это', 'the',
]);

/** Split a query into meaningful tokens (split on space/hyphen/underscore/slash). */
function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[\s\-_/.,;:!?()«»"']+/)
    .map(t => t.trim())
    .filter(t => t.length >= 2 && !STOPWORDS.has(t));
}

/** First markdown heading (# ...) as the article title; falls back to slug tail. */
function extractTitle(content: string, slug: string): string {
  const m = content.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : slug.split('/').pop() || slug;
}

registerTool({
  name: 'knowledge_search',
  description: 'Search the Support knowledge base for articles about features, setup guides, API integration, and troubleshooting. Matches article title, slug, category and full content. Returns ranked matches with title and snippet.',
  tier: 'free',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query (e.g. "how to setup widget", "API integration", "SLA configuration")' },
    },
    required: ['query'],
  },
  handler: async (args) => {
    const rawQuery = String(args.query).toLowerCase().trim();
    const tokens = tokenize(rawQuery);
    const docs = await listDocs();

    // Load content once per doc so we can match title + body, not just the slug.
    const enriched = await Promise.all(docs.map(async d => {
      const content = (await readDocsFile(d.slug)) || '';
      const lc = content.toLowerCase();
      return {
        slug: d.slug,
        category: d.category,
        title: extractTitle(content, d.slug),
        meta: `${d.slug} ${d.category}`.toLowerCase(),
        titleLc: extractTitle(content, d.slug).toLowerCase(),
        body: lc,
      };
    }));

    // Score: slug/category hit = 10, title hit = 6, body hit = 1 per distinct token.
    // Whole-query substring in slug/title is a strong bonus (keeps legacy behaviour).
    const scored = enriched.map(d => {
      let score = 0;
      for (const tok of tokens) {
        if (d.meta.includes(tok)) score += 10;
        else if (d.titleLc.includes(tok)) score += 6;
        else if (d.body.includes(tok)) score += 1;
      }
      if (rawQuery && (d.meta.includes(rawQuery) || d.titleLc.includes(rawQuery))) score += 15;
      return { ...d, score };
    }).filter(d => d.score > 0);

    scored.sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      return {
        message: 'No articles found. Try broader search terms or use knowledge_list to browse all articles.',
        available_categories: [...new Set(docs.map(d => d.category))],
        total_articles: docs.length,
      };
    }

    return {
      results: scored.slice(0, 10).map(m => ({
        slug: m.slug,
        title: m.title,
        category: m.category,
        read_with: `Use knowledge_read tool with slug "${m.slug}" to read full article`,
      })),
      total_matches: scored.length,
    };
  },
});

registerTool({
  name: 'knowledge_read',
  description: 'Read a specific knowledge base article by slug. Returns full markdown content of the article.',
  tier: 'free',
  inputSchema: {
    type: 'object',
    properties: {
      slug: { type: 'string', description: 'Article slug (e.g. "guides/quickstart-admin", "tools/widgets")' },
    },
    required: ['slug'],
  },
  handler: async (args) => {
    const content = await readDocsFile(String(args.slug));
    if (!content) {
      const docs = await listDocs();
      return {
        error: 'Article not found',
        available: docs.slice(0, 20).map(d => d.slug),
      };
    }
    return { slug: args.slug, content };
  },
});

registerTool({
  name: 'knowledge_list',
  description: 'List all available knowledge base articles grouped by category. Use this to explore what documentation is available.',
  tier: 'free',
  inputSchema: {
    type: 'object',
    properties: {
      category: { type: 'string', description: 'Filter by category (e.g. "guides", "tools", "faq"). Omit to list all.' },
    },
  },
  handler: async (args) => {
    const docs = await listDocs();
    const category = args.category ? String(args.category).toLowerCase() : null;

    const filtered = category
      ? docs.filter(d => d.category.toLowerCase() === category)
      : docs;

    const grouped: Record<string, string[]> = {};
    for (const d of filtered) {
      (grouped[d.category] ??= []).push(d.slug);
    }

    return {
      categories: grouped,
      total: filtered.length,
    };
  },
});
