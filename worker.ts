export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // ---------------- NOTES ----------------

    if (url.pathname === "/api/notes" && request.method === "GET") {
      const { results } = await env.DB
        .prepare("SELECT id, name, url FROM notes ORDER BY id DESC")
        .all();

      return Response.json(results);
    }

    if (url.pathname === "/api/notes" && request.method === "POST") {
      const body = await request.json() as {
        name?: string;
        url?: string;
      };

      if (!body.name || !body.url) {
        return Response.json(
          { error: "Name and URL are required" },
          { status: 400 }
        );
      }

      await env.DB
        .prepare("INSERT INTO notes (name, url) VALUES (?, ?)")
        .bind(body.name, body.url)
        .run();

      return Response.json({ success: true });
    }

    if (
      url.pathname.startsWith("/api/notes/") &&
      request.method === "DELETE"
    ) {
      const id = Number(url.pathname.split("/").pop());

      await env.DB
        .prepare("DELETE FROM notes WHERE id = ?")
        .bind(id)
        .run();

      return Response.json({ success: true });
    }

    // -------- SYLLABUS + PREVIOUS PAPERS --------

    if (
      url.pathname === "/api/study-documents" &&
      request.method === "GET"
    ) {
      const type = url.searchParams.get("type");

      if (!type) {
        return Response.json(
          { error: "Type is required" },
          { status: 400 }
        );
      }

      const { results } = await env.DB
        .prepare(
          "SELECT id, type, name, url FROM study_documents WHERE type = ? ORDER BY id DESC"
        )
        .bind(type)
        .all();

      return Response.json(results);
    }

    if (
      url.pathname === "/api/study-documents" &&
      request.method === "POST"
    ) {
      const body = await request.json() as {
        type?: string;
        name?: string;
        url?: string;
      };

      if (!body.type || !body.name || !body.url) {
        return Response.json(
          { error: "Type, name and URL are required" },
          { status: 400 }
        );
      }

      await env.DB
        .prepare(
          "INSERT INTO study_documents (type, name, url) VALUES (?, ?, ?)"
        )
        .bind(body.type, body.name, body.url)
        .run();

      return Response.json({ success: true });
    }

    if (
      url.pathname.startsWith("/api/study-documents/") &&
      request.method === "DELETE"
    ) {
      const id = Number(url.pathname.split("/").pop());

      await env.DB
        .prepare("DELETE FROM study_documents WHERE id = ?")
        .bind(id)
        .run();

      return Response.json({ success: true });
    }

    // ---------------- NEWS ----------------

    if (url.pathname === "/api/news" && request.method === "GET") {
      const { results } = await env.DB
        .prepare(
          "SELECT id, title, content, date FROM news ORDER BY date DESC, id DESC"
        )
        .all();

      return Response.json(results);
    }

    if (url.pathname === "/api/news" && request.method === "POST") {
      const body = await request.json() as {
        title?: string;
        content?: string;
        date?: string;
      };

      if (!body.title || !body.content || !body.date) {
        return Response.json(
          { error: "Title, content and date are required" },
          { status: 400 }
        );
      }

      await env.DB
        .prepare(
          "INSERT INTO news (title, content, date) VALUES (?, ?, ?)"
        )
        .bind(body.title, body.content, body.date)
        .run();

      return Response.json({ success: true });
    }

    if (
      url.pathname.startsWith("/api/news/") &&
      request.method === "DELETE"
    ) {
      const id = Number(url.pathname.split("/").pop());

      await env.DB
        .prepare("DELETE FROM news WHERE id = ?")
        .bind(id)
        .run();

      return Response.json({ success: true });
    }

    // ---------------- SITE SETTINGS ----------------
    // About Institute and future page settings

    if (
      url.pathname === "/api/site-settings" &&
      request.method === "GET"
    ) {
      const { results } = await env.DB
        .prepare("SELECT key, value FROM site_settings")
        .all();

      const settings: Record<string, string> = {};

      for (const row of results as Array<{
        key: string;
        value: string;
      }>) {
        settings[row.key] = row.value;
      }

      return Response.json(settings);
    }

    if (
      url.pathname === "/api/site-settings" &&
      request.method === "POST"
    ) {
      const body = await request.json() as {
        key?: string;
        value?: string;
      };

      if (!body.key || typeof body.value !== "string") {
        return Response.json(
          { error: "Key and value are required" },
          { status: 400 }
        );
      }

      await env.DB
        .prepare(`
          INSERT INTO site_settings (key, value, updated_at)
          VALUES (?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(key)
          DO UPDATE SET
            value = excluded.value,
            updated_at = CURRENT_TIMESTAMP
        `)
        .bind(body.key, body.value)
        .run();

      return Response.json({ success: true });
    }

    // -------- RECOGNITION DOCUMENTS --------

    if (
      url.pathname === "/api/recognition-documents" &&
      request.method === "GET"
    ) {
      const { results } = await env.DB
        .prepare(
          "SELECT id, name, url FROM recognition_documents ORDER BY id DESC"
        )
        .all();

      return Response.json(results);
    }

    if (
      url.pathname === "/api/recognition-documents" &&
      request.method === "POST"
    ) {
      const body = await request.json() as {
        name?: string;
        url?: string;
      };

      if (!body.name || !body.url) {
        return Response.json(
          { error: "Name and URL are required" },
          { status: 400 }
        );
      }

      await env.DB
        .prepare(
          "INSERT INTO recognition_documents (name, url) VALUES (?, ?)"
        )
        .bind(body.name, body.url)
        .run();

      return Response.json({ success: true });
    }

    if (
      url.pathname.startsWith("/api/recognition-documents/") &&
      request.method === "DELETE"
    ) {
      const id = Number(url.pathname.split("/").pop());

      if (!Number.isFinite(id)) {
        return Response.json(
          { error: "Invalid document ID" },
          { status: 400 }
        );
      }

      await env.DB
        .prepare(
          "DELETE FROM recognition_documents WHERE id = ?"
        )
        .bind(id)
        .run();

      return Response.json({ success: true });
    }

    return env.ASSETS.fetch(request);
  },
};
