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

    return env.ASSETS.fetch(request);
  },
};
