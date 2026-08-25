const ALLOWED_ORIGINS = new Set([
  'https://alaning.me',
  'https://www.alaning.me',
  'https://alaning0.github.io',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:8787',
  'http://127.0.0.1:8787',
]);

const TITLE_MAX = 200;
const SHORTCUT_TITLE_MAX = 500;
const DESCRIPTION_MAX = 5000;

function corsHeaders(origin) {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://alaning.me';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  });
}

function mapIdea(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    starred: Boolean(row.starred),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function parseIdeaFields(body, { allowUrl = false } = {}) {
  let title = typeof body?.title === 'string' ? body.title.trim() : '';
  if (!title && allowUrl && typeof body?.url === 'string') {
    title = body.url.trim();
  }
  const description =
    typeof body?.description === 'string'
      ? body.description.trim()
      : typeof body?.notes === 'string'
        ? body.notes.trim()
        : '';
  return { title, description };
}

function requestApiKey(request) {
  const auth = request.headers.get('Authorization');
  if (auth) {
    const match = auth.match(/^Bearer\s+(.+)$/i);
    if (match) return match[1].trim();
  }
  const headerKey = request.headers.get('X-Api-Key');
  return headerKey ? headerKey.trim() : '';
}

function requireApiKey(request, env, origin) {
  if (!env.API_KEY) {
    return json({ error: 'API key not configured.' }, 503, origin);
  }
  const key = requestApiKey(request);
  if (!key || key !== env.API_KEY) {
    return json({ error: 'Unauthorized' }, 401, origin);
  }
  return null;
}

async function insertIdea(env, title, description) {
  return env.DB.prepare(
    `INSERT INTO ideas (title, description)
     VALUES (?, ?)
     RETURNING id, title, description, starred, created_at, updated_at`
  )
    .bind(title, description)
    .first();
}

function validateIdeaFields(title, description, origin, titleMax = TITLE_MAX) {
  if (!title) return json({ error: 'Title is required.' }, 400, origin);
  if (title.length > titleMax) {
    return json(
      { error: `Title must be ${titleMax} characters or fewer.` },
      400,
      origin
    );
  }
  if (description.length > DESCRIPTION_MAX) {
    return json(
      { error: 'Description must be 5000 characters or fewer.' },
      400,
      origin
    );
  }
  return null;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    try {
      if (url.pathname === '/api' && request.method === 'POST') {
        const authError = requireApiKey(request, env, origin);
        if (authError) return authError;

        const body = await request.json().catch(() => null);
        const { title, description } = parseIdeaFields(body, { allowUrl: true });
        const validationError = validateIdeaFields(
          title,
          description,
          origin,
          SHORTCUT_TITLE_MAX
        );
        if (validationError) return validationError;

        const row = await insertIdea(env, title, description);
        return json({ idea: mapIdea(row) }, 201, origin);
      }

      if (url.pathname === '/api/ideas' && request.method === 'GET') {
        const { results } = await env.DB.prepare(
          `SELECT id, title, description, starred, created_at, updated_at
           FROM ideas
           ORDER BY created_at DESC, id DESC`
        ).all();
        return json({ ideas: (results || []).map(mapIdea) }, 200, origin);
      }

      if (url.pathname === '/api/ideas' && request.method === 'POST') {
        const authError = requireApiKey(request, env, origin);
        if (authError) return authError;

        const body = await request.json().catch(() => null);
        const { title, description } = parseIdeaFields(body);
        const validationError = validateIdeaFields(title, description, origin);
        if (validationError) return validationError;

        const row = await insertIdea(env, title, description);
        return json({ idea: mapIdea(row) }, 201, origin);
      }

      const starMatch = url.pathname.match(/^\/api\/ideas\/(\d+)\/star$/);
      if (starMatch && request.method === 'POST') {
        const authError = requireApiKey(request, env, origin);
        if (authError) return authError;

        const id = Number(starMatch[1]);
        const existing = await env.DB.prepare(
          `SELECT id, starred FROM ideas WHERE id = ?`
        )
          .bind(id)
          .first();

        if (!existing) return json({ error: 'Idea not found.' }, 404, origin);

        const row = await env.DB.prepare(
          `UPDATE ideas
           SET starred = ?, updated_at = datetime('now')
           WHERE id = ?
           RETURNING id, title, description, starred, created_at, updated_at`
        )
          .bind(existing.starred ? 0 : 1, id)
          .first();

        return json({ idea: mapIdea(row) }, 200, origin);
      }

      const ideaMatch = url.pathname.match(/^\/api\/ideas\/(\d+)$/);
      if (ideaMatch && request.method === 'PATCH') {
        const authError = requireApiKey(request, env, origin);
        if (authError) return authError;

        const id = Number(ideaMatch[1]);
        const body = await request.json().catch(() => null);
        const { title, description } = parseIdeaFields(body);
        const validationError = validateIdeaFields(title, description, origin);
        if (validationError) return validationError;

        const row = await env.DB.prepare(
          `UPDATE ideas
           SET title = ?, description = ?, updated_at = datetime('now')
           WHERE id = ?
           RETURNING id, title, description, starred, created_at, updated_at`
        )
          .bind(title, description, id)
          .first();

        if (!row) return json({ error: 'Idea not found.' }, 404, origin);
        return json({ idea: mapIdea(row) }, 200, origin);
      }

      if (ideaMatch && request.method === 'DELETE') {
        const authError = requireApiKey(request, env, origin);
        if (authError) return authError;

        const id = Number(ideaMatch[1]);
        const existing = await env.DB.prepare(
          `SELECT id FROM ideas WHERE id = ?`
        )
          .bind(id)
          .first();

        if (!existing) return json({ error: 'Idea not found.' }, 404, origin);

        await env.DB.prepare(`DELETE FROM ideas WHERE id = ?`).bind(id).run();
        return json({ ok: true, id }, 200, origin);
      }

      if (url.pathname === '/api/health' && request.method === 'GET') {
        return json({ ok: true }, 200, origin);
      }

      return json({ error: 'Not found' }, 404, origin);
    } catch (err) {
      console.error(JSON.stringify({ err: String(err), path: url.pathname }));
      return json({ error: 'Server error' }, 500, origin);
    }
  },
};
