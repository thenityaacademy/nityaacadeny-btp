export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  ADMIN_PASSWORD: string;
  SHEET_API_SECRET: string;
}

const ADMIN_USERNAME = "thenityaacademy@gmail.com";
const SESSION_COOKIE = "nitya_admin_session";
const SESSION_DURATION = 8 * 60 * 60 * 1000;
const SHEET_WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbyxXUujOjhoATmUkSNZK7873Ze_5qUDVV60hwqgftNXOBydp9joIw3hqSbUfNKnNw6y/exec";

function getCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get("Cookie");

  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";");

  for (const cookie of cookies) {
    const [key, ...valueParts] = cookie.trim().split("=");

    if (key === name) {
      return valueParts.join("=");
    }
  }

  return null;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;

  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

async function createSignature(
  value: string,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(value)
  );

  return toBase64Url(
    new Uint8Array(signature)
  );
}

async function createSessionToken(
  secret: string
): Promise<string> {
  const expiresAt =
    Date.now() + SESSION_DURATION;

  const payload = String(expiresAt);

  const signature =
    await createSignature(
      payload,
      secret
    );

  return `${payload}.${signature}`;
}

async function verifySession(
  request: Request,
  secret: string
): Promise<boolean> {
  const token =
    getCookie(
      request,
      SESSION_COOKIE
    );

  if (!token) {
    return false;
  }

  const [payload, signature] =
    token.split(".");

  if (!payload || !signature) {
    return false;
  }

  const expiresAt =
    Number(payload);

  if (
    !Number.isFinite(expiresAt) ||
    expiresAt < Date.now()
  ) {
    return false;
  }

  const expectedSignature =
    await createSignature(
      payload,
      secret
    );

  return safeEqual(
    signature,
    expectedSignature
  );
}

function parseId(
  pathname: string
): number | null {
  const value =
    pathname
      .split("/")
      .pop();

  const id =
    Number(value);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    return null;
  }

  return id;
}

export default {
  async fetch(
    request: Request,
    env: Env
  ): Promise<Response> {
    const url =
      new URL(request.url);

    // ---------------- ADMIN LOGIN ----------------

    if (
      url.pathname ===
        "/api/admin/login" &&
      request.method === "POST"
    ) {
      try {
        const body =
          await request.json() as {
            username?: string;
            password?: string;
          };

        const username =
          body.username?.trim() || "";

        const password =
          body.password || "";

        if (
          username !== ADMIN_USERNAME ||
          !env.ADMIN_PASSWORD ||
          !safeEqual(
            password,
            env.ADMIN_PASSWORD
          )
        ) {
          return Response.json(
            {
              error:
                "Invalid username or password",
            },
            {
              status: 401,
            }
          );
        }

        const sessionToken =
          await createSessionToken(
            env.ADMIN_PASSWORD
          );

        return Response.json(
          {
            success: true,
          },
          {
            headers: {
              "Set-Cookie":
                `${SESSION_COOKIE}=${sessionToken}; ` +
                "Path=/; " +
                "HttpOnly; " +
                "Secure; " +
                "SameSite=Strict; " +
                "Max-Age=28800",
              "Cache-Control":
                "no-store",
            },
          }
        );
      } catch {
        return Response.json(
          {
            error:
              "Invalid login request",
          },
          {
            status: 400,
          }
        );
      }
    }

    // ---------------- ADMIN SESSION ----------------

    if (
      url.pathname ===
        "/api/admin/session" &&
      request.method === "GET"
    ) {
      const authenticated =
        env.ADMIN_PASSWORD
          ? await verifySession(
              request,
              env.ADMIN_PASSWORD
            )
          : false;

      return Response.json(
        {
          authenticated,
        },
        {
          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    // ---------------- ADMIN LOGOUT ----------------

    if (
      url.pathname ===
        "/api/admin/logout" &&
      request.method === "POST"
    ) {
      return Response.json(
        {
          success: true,
        },
        {
          headers: {
            "Set-Cookie":
              `${SESSION_COOKIE}=; ` +
              "Path=/; " +
              "HttpOnly; " +
              "Secure; " +
              "SameSite=Strict; " +
              "Max-Age=0",
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    // ---------------- ADMISSION FORM ----------------

if (
  url.pathname === "/api/admission" &&
  request.method === "POST"
) {
  try {
    const body = await request.json() as {
      name?: string;
      fatherName?: string;
      dob?: string;
      qualification?: string;
      course?: string;
      address?: string;
      mobile?: string;
      source?: string;
    };

    const name = body.name?.trim() || "";
    const fatherName = body.fatherName?.trim() || "";
    const dob = body.dob?.trim() || "";
    const qualification =
      body.qualification?.trim() || "";
    const course = body.course?.trim() || "";
    const address = body.address?.trim() || "";
    const mobile = body.mobile?.trim() || "";
    const source = body.source?.trim() || "Direct";

    if (
      !name ||
      !fatherName ||
      !dob ||
      !qualification ||
      !course ||
      !address ||
      !/^[0-9]{10}$/.test(mobile)
    ) {
      return Response.json(
        {
          success: false,
          error: "Invalid form data",
        },
        {
          status: 400,
        }
      );
    }

    if (!env.SHEET_API_SECRET) {
      return Response.json(
        {
          success: false,
          error: "Sheet connection not configured",
        },
        {
          status: 503,
        }
      );
    }

    const sheetResponse = await fetch(
      SHEET_WEB_APP_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secret: env.SHEET_API_SECRET,
          name,
          fatherName,
          dob,
          qualification,
          course,
          address,
          mobile,
          source,
        }),
      }
    );

    const sheetResult = await sheetResponse.json() as {
      success?: boolean;
      error?: string;
    };

    if (!sheetResult.success) {
      throw new Error(
        sheetResult.error || "Google Sheet save failed"
      );
    }

    return Response.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        success: false,
        error: "Application save failed",
      },
      {
        status: 500,
      }
    );
  }
}
    // ---------------- PROTECT ALL API WRITES ----------------

    const writeMethods =
      new Set([
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
      ]);

    if (
      url.pathname.startsWith(
        "/api/"
      ) &&
      writeMethods.has(
        request.method
      )
    ) {
      if (!env.ADMIN_PASSWORD) {
        return Response.json(
          {
            error:
              "Admin security is not configured",
          },
          {
            status: 503,
          }
        );
      }

      const authenticated =
        await verifySession(
          request,
          env.ADMIN_PASSWORD
        );

      if (!authenticated) {
        return Response.json(
          {
            error:
              "Unauthorized",
          },
          {
            status: 401,
          }
        );
      }
    }

    // ---------------- NOTES ----------------

    if (
      url.pathname ===
        "/api/notes" &&
      request.method === "GET"
    ) {
      const { results } =
        await env.DB
          .prepare(
            "SELECT id, name, url FROM notes ORDER BY id DESC"
          )
          .all();

      return Response.json(results);
    }

    if (
      url.pathname ===
        "/api/notes" &&
      request.method === "POST"
    ) {
      const body =
        await request.json() as {
          name?: string;
          url?: string;
        };

      const name =
        body.name?.trim();

      const noteUrl =
        body.url?.trim();

      if (
        !name ||
        !noteUrl
      ) {
        return Response.json(
          {
            error:
              "Name and URL are required",
          },
          {
            status: 400,
          }
        );
      }

      await env.DB
        .prepare(
          "INSERT INTO notes (name, url) VALUES (?, ?)"
        )
        .bind(
          name,
          noteUrl
        )
        .run();

      return Response.json({
        success: true,
      });
    }

    if (
      url.pathname.startsWith(
        "/api/notes/"
      ) &&
      request.method === "DELETE"
    ) {
      const id =
        parseId(
          url.pathname
        );

      if (!id) {
        return Response.json(
          {
            error:
              "Invalid note ID",
          },
          {
            status: 400,
          }
        );
      }

      await env.DB
        .prepare(
          "DELETE FROM notes WHERE id = ?"
        )
        .bind(id)
        .run();

      return Response.json({
        success: true,
      });
    }

    // -------- SYLLABUS + PREVIOUS PAPERS --------

    if (
      url.pathname ===
        "/api/study-documents" &&
      request.method === "GET"
    ) {
      const type =
        url.searchParams.get(
          "type"
        );

      if (
        type !== "syllabus" &&
        type !==
          "previous-papers"
      ) {
        return Response.json(
          {
            error:
              "Invalid document type",
          },
          {
            status: 400,
          }
        );
      }

      const { results } =
        await env.DB
          .prepare(
            "SELECT id, type, name, url FROM study_documents WHERE type = ? ORDER BY id DESC"
          )
          .bind(type)
          .all();

      return Response.json(results);
    }

    if (
      url.pathname ===
        "/api/study-documents" &&
      request.method === "POST"
    ) {
      const body =
        await request.json() as {
          type?: string;
          name?: string;
          url?: string;
        };

      const type =
        body.type;

      const name =
        body.name?.trim();

      const documentUrl =
        body.url?.trim();

      if (
        type !== "syllabus" &&
        type !==
          "previous-papers"
      ) {
        return Response.json(
          {
            error:
              "Invalid document type",
          },
          {
            status: 400,
          }
        );
      }

      if (
        !name ||
        !documentUrl
      ) {
        return Response.json(
          {
            error:
              "Name and URL are required",
          },
          {
            status: 400,
          }
        );
      }

      await env.DB
        .prepare(
          "INSERT INTO study_documents (type, name, url) VALUES (?, ?, ?)"
        )
        .bind(
          type,
          name,
          documentUrl
        )
        .run();

      return Response.json({
        success: true,
      });
    }

    if (
      url.pathname.startsWith(
        "/api/study-documents/"
      ) &&
      request.method === "DELETE"
    ) {
      const id =
        parseId(
          url.pathname
        );

      if (!id) {
        return Response.json(
          {
            error:
              "Invalid document ID",
          },
          {
            status: 400,
          }
        );
      }

      await env.DB
        .prepare(
          "DELETE FROM study_documents WHERE id = ?"
        )
        .bind(id)
        .run();

      return Response.json({
        success: true,
      });
    }

    // ---------------- NEWS ----------------

    if (
      url.pathname ===
        "/api/news" &&
      request.method === "GET"
    ) {
      const { results } =
        await env.DB
          .prepare(
            "SELECT id, title, content, date FROM news ORDER BY date DESC, id DESC"
          )
          .all();

      return Response.json(results);
    }

    if (
      url.pathname ===
        "/api/news" &&
      request.method === "POST"
    ) {
      const body =
        await request.json() as {
          title?: string;
          content?: string;
          date?: string;
        };

      const title =
        body.title?.trim();

      const content =
        body.content?.trim();

      const date =
        body.date?.trim();

      if (
        !title ||
        !content ||
        !date
      ) {
        return Response.json(
          {
            error:
              "Title, content and date are required",
          },
          {
            status: 400,
          }
        );
      }

      await env.DB
        .prepare(
          "INSERT INTO news (title, content, date) VALUES (?, ?, ?)"
        )
        .bind(
          title,
          content,
          date
        )
        .run();

      return Response.json({
        success: true,
      });
    }

    if (
      url.pathname.startsWith(
        "/api/news/"
      ) &&
      request.method === "DELETE"
    ) {
      const id =
        parseId(
          url.pathname
        );

      if (!id) {
        return Response.json(
          {
            error:
              "Invalid news ID",
          },
          {
            status: 400,
          }
        );
      }

      await env.DB
        .prepare(
          "DELETE FROM news WHERE id = ?"
        )
        .bind(id)
        .run();

      return Response.json({
        success: true,
      });
    }

    // ---------------- SITE SETTINGS ----------------

    if (
      url.pathname ===
        "/api/site-settings" &&
      request.method === "GET"
    ) {
      const { results } =
        await env.DB
          .prepare(
            "SELECT key, value FROM site_settings"
          )
          .all();

      const settings:
        Record<string, string> =
          {};

      for (
        const row of
          results as Array<{
            key: string;
            value: string;
          }>
      ) {
        settings[row.key] =
          row.value;
      }

      return Response.json(
        settings
      );
    }

    if (
      url.pathname ===
        "/api/site-settings" &&
      request.method === "POST"
    ) {
      const body =
        await request.json() as {
          key?: string;
          value?: string;
        };

      const key =
        body.key?.trim();

      if (
        !key ||
        typeof body.value !==
          "string"
      ) {
        return Response.json(
          {
            error:
              "Key and value are required",
          },
          {
            status: 400,
          }
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
        .bind(
          key,
          body.value
        )
        .run();

      return Response.json({
        success: true,
      });
    }

    // -------- RECOGNITION DOCUMENTS --------

    if (
      url.pathname ===
        "/api/recognition-documents" &&
      request.method === "GET"
    ) {
      const { results } =
        await env.DB
          .prepare(
            "SELECT id, name, url FROM recognition_documents ORDER BY id DESC"
          )
          .all();

      return Response.json(results);
    }

    if (
      url.pathname ===
        "/api/recognition-documents" &&
      request.method === "POST"
    ) {
      const body =
        await request.json() as {
          name?: string;
          url?: string;
        };

      const name =
        body.name?.trim();

      const documentUrl =
        body.url?.trim();

      if (
        !name ||
        !documentUrl
      ) {
        return Response.json(
          {
            error:
              "Name and URL are required",
          },
          {
            status: 400,
          }
        );
      }

      await env.DB
        .prepare(
          "INSERT INTO recognition_documents (name, url) VALUES (?, ?)"
        )
        .bind(
          name,
          documentUrl
        )
        .run();

      return Response.json({
        success: true,
      });
    }

    if (
      url.pathname.startsWith(
        "/api/recognition-documents/"
      ) &&
      request.method === "DELETE"
    ) {
      const id =
        parseId(
          url.pathname
        );

      if (!id) {
        return Response.json(
          {
            error:
              "Invalid document ID",
          },
          {
            status: 400,
          }
        );
      }

      await env.DB
        .prepare(
          "DELETE FROM recognition_documents WHERE id = ?"
        )
        .bind(id)
        .run();

      return Response.json({
        success: true,
      });
    }

    // ---------------- WEBSITE ----------------

    return env.ASSETS.fetch(
      request
    );
  },
};
