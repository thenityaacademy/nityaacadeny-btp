export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/notes" && request.method === "GET") {
      const { results } = await env.DB
        .prepare("SELECT id, name, url FROM notes ORDER BY id DESC")
        .all();

      return Response.json(results);
    }

    if (url.pathname === "/api/notes" && request.method === "POST") {
      const body = await request.json() as { name?: string; url?: string };

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

    if (url.pathname.startsWith("/api/notes/") && request.method === "DELETE") {
      const id = Number(url.pathname.split("/").pop());

      await env.DB
        .prepare("DELETE FROM notes WHERE id = ?")
        .bind(id)
        .run();

      return Response.json({ success: true });
    }

    return env.ASSETS.fetch(request);
  },
};
