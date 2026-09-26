const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SITE_URL =
  process.env.SITE_URL ||
  "https://eclipse-key-system.vercel.app";
const ADMIN_DISCORD_ID = process.env.ADMIN_DISCORD_ID;

function getCookie(req, name) {
  const cookies = req.headers.cookie || "";
  const match = cookies.match(
    new RegExp(
      "(?:^|;\\s*)" +
        name.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&") +
        "=([^;]*)"
    )
  );

  return match ? decodeURIComponent(match[1]) : null;
}

async function getDiscordUser(req) {
  const session = getCookie(req, "eclipse_session");

  if (!session) return null;

  const response = await fetch(`${SITE_URL}/api/discord/me`, {
    headers: {
      Cookie: `eclipse_session=${encodeURIComponent(session)}`
    }
  });

  if (!response.ok) return null;

  const data = await response.json();

  if (!data.authenticated || !data.user) return null;

  return data.user;
}

async function requireAdmin(req, res) {
  const user = await getDiscordUser(req);

  if (!user) {
    res.status(401).json({
      success: false,
      error: "Discord não conectado."
    });
    return null;
  }

  if (!ADMIN_DISCORD_ID || user.id !== ADMIN_DISCORD_ID) {
    res.status(403).json({
      success: false,
      error: "Acesso negado."
    });
    return null;
  }

  return user;
}

function getAction(req) {
  const pathname = String(req.url || "").split("?")[0];
  const prefix = "/api/admin/";

  if (pathname.startsWith(prefix)) {
    return pathname.slice(prefix.length).split("/")[0] || "auth";
  }

  return req.query?.action || "auth";
}

function getBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  return {};
}

module.exports = async function handler(req, res) {
  try {
    const admin = await requireAdmin(req, res);

    if (!admin) return;

    const action = getAction(req);

    // GET/POST /api/admin/auth
    if (action === "auth") {
      if (req.method !== "GET") {
        return res.status(405).json({
          success: false,
          error: "Método não permitido."
        });
      }

      return res.status(200).json({
        success: true,
        authenticated: true,
        admin: true,
        user: {
          id: admin.id,
          username: admin.username,
          global_name: admin.global_name || null,
          avatar: admin.avatar || null
        }
      });
    }

    // GET /api/admin/logs
    if (action === "logs") {
      if (req.method !== "GET") {
        return res.status(405).json({
          success: false,
          error: "Método não permitido."
        });
      }

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/key_logs?select=chave,discord_id,discord_nick,created_at&order=created_at.desc&limit=100`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return res.status(200).json({
        success: true,
        logs: await response.json()
      });
    }

    // GET/POST /api/admin/site
    if (action === "site") {
      if (req.method === "GET") {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/site_settings?id=eq.1&select=site_enabled,updated_at`,
          {
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`
            }
          }
        );

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const data = await response.json();
        const settings = data[0];

        return res.status(200).json({
          success: true,
          site_enabled: settings ? settings.site_enabled : true,
          updated_at: settings ? settings.updated_at : null
        });
      }

      if (req.method === "POST") {
        const body = getBody(req);
        const enabled = body.enabled;

        if (typeof enabled !== "boolean") {
          return res.status(400).json({
            success: false,
            error: "enabled deve ser true ou false."
          });
        }

        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/site_settings?id=eq.1`,
          {
            method: "PATCH",
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
              "Content-Type": "application/json",
              Prefer: "return=representation"
            },
            body: JSON.stringify({
              site_enabled: enabled,
              updated_at: new Date().toISOString()
            })
          }
        );

        if (!response.ok) {
          throw new Error(await response.text());
        }

        return res.status(200).json({
          success: true,
          site_enabled: enabled
        });
      }

      return res.status(405).json({
        success: false,
        error: "Método não permitido."
      });
    }

    return res.status(404).json({
      success: false,
      error: "Rota administrativa não encontrada."
    });
  } catch (error) {
    console.error("Admin error:", error);

    return res.status(500).json({
      success: false,
      error: "Erro interno."
    });
  }
};
