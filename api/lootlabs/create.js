const crypto = require("crypto");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SITE_URL =
  process.env.SITE_URL || "https://eclipse-key-system.vercel.app";

function getCookie(req, name) {
  const cookies = req.headers.cookie || "";

  const match = cookies.match(
    new RegExp(
      "(?:^|;\\s*)" +
        name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
        "=([^;]*)"
    )
  );

  return match ? decodeURIComponent(match[1]) : null;
}

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

async function getDiscordUser(req) {
  const session = getCookie(req, "eclipse_session");

  if (!session) {
    return null;
  }

  const response = await fetch(`${SITE_URL}/api/discord/me`, {
    method: "GET",
    headers: {
      Cookie: `eclipse_session=${encodeURIComponent(session)}`
    }
  });

  const data = await response.json();

  console.log("Discord /me:", {
    status: response.status,
    authenticated: data.authenticated
  });

  if (!response.ok || !data.authenticated || !data.user) {
    return null;
  }

  return data.user;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Método não permitido."
    });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return res.status(500).json({
        success: false,
        error: "Supabase não configurado."
      });
    }

    if (!process.env.LOOTLABS_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "LOOTLABS_API_KEY não configurada."
      });
    }

    // =========================
    // DISCORD
    // =========================

    const user = await getDiscordUser(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Discord não conectado."
      });
    }

    const discordId = user.id;

    const discordNick =
      user.global_name ||
      user.username ||
      "Desconhecido";

    // =========================
    // TOKEN DA SESSÃO
    // =========================

    const token = generateToken();

    const returnUrl =
      `${SITE_URL}/?lootlabs=return&token=${encodeURIComponent(token)}`;

    // =========================
    // CRIA SESSÃO NO SUPABASE
    // =========================

    const sessionResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/lootlabs_sessions`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal"
        },
        body: JSON.stringify({
          token,
          discord_id: discordId,
          status: "pending"
        })
      }
    );

    if (!sessionResponse.ok) {
      const sessionError = await sessionResponse.text();

      console.error(
        "Erro ao criar sessão LootLabs:",
        sessionError
      );

      return res.status(500).json({
        success: false,
        error: "Não foi possível criar a sessão LootLabs."
      });
    }

    // =========================
    // PAYLOAD LOOTLABS
    // =========================

    const payload = {
      title: "Eclipse Hub - Obter Key",
      url: returnUrl,
      tier_id: 1,
      number_of_tasks: 3,
      theme: 1
    };

    console.log("LootLabs payload:", payload);

    // =========================
    // CRIA CONTENT LOCKER
    // =========================

    const lootlabsResponse = await fetch(
      "https://creators.lootlabs.gg/api/public/content_locker",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.LOOTLABS_API_KEY}`,
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    const rawText = await lootlabsResponse.text();

    let lootlabsData;

    try {
      lootlabsData = JSON.parse(rawText);
    } catch {
      lootlabsData = {
        raw: rawText
      };
    }

    console.log("=================================");
    console.log(
      "LOOTLABS STATUS:",
      lootlabsResponse.status
    );
    console.log("LOOTLABS RESPOSTA COMPLETA:");
    console.log(
      JSON.stringify(lootlabsData, null, 2)
    );
    console.log("=================================");

    // =========================
    // PEGA LOOT_URL
    // =========================

    let lootUrl = null;

    // Resposta atual do LootLabs:
    //
    // message: [
    //   {
    //      short: "...",
    //      loot_url: "...",
    //      destination_url: "..."
    //   }
    // ]

    if (
      lootlabsData &&
      Array.isArray(lootlabsData.message) &&
      lootlabsData.message.length > 0
    ) {
      lootUrl = lootlabsData.message[0]?.loot_url;
    }

    // Compatibilidade com respostas antigas
    if (
      !lootUrl &&
      lootlabsData?.message &&
      !Array.isArray(lootlabsData.message)
    ) {
      lootUrl = lootlabsData.message?.loot_url;
    }

    // Outros formatos possíveis
    if (!lootUrl) {
      lootUrl =
        lootlabsData?.loot_url ||
        lootlabsData?.url ||
        null;
    }

    // =========================
    // LOOTLABS NÃO RETORNOU URL
    // =========================

    if (!lootlabsResponse.ok || !lootUrl) {
      console.error("=================================");
      console.error(
        "LOOTLABS NÃO RETORNOU LOOT_URL"
      );
      console.error(
        "TYPE:",
        lootlabsData?.type
      );
      console.error(
        "MESSAGE:",
        lootlabsData?.message
      );
      console.error(
        "URL:",
        lootlabsData?.url
      );
      console.error(
        "LOOT_URL:",
        lootlabsData?.loot_url
      );
      console.error(
        "RESPOSTA:",
        lootlabsData
      );
      console.error("=================================");

      return res.status(502).json({
        success: false,
        error: "LootLabs não retornou o link.",
        lootlabs_type: lootlabsData?.type || null,
        lootlabs_message: lootlabsData?.message || null
      });
    }

    // =========================
    // ADICIONA PUID
    // =========================

    const separator = lootUrl.includes("?")
      ? "&"
      : "?";

    lootUrl =
      `${lootUrl}${separator}puid=${encodeURIComponent(token)}`;

    console.log("LootLabs URL final:", lootUrl);

    // =========================
    // SUCESSO
    // =========================

    return res.status(200).json({
      success: true,
      url: lootUrl,
      token,
      discord_id: discordId,
      discord_nick: discordNick
    });

  } catch (error) {
    console.error(
      "Erro interno /api/lootlabs/create:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Erro interno ao criar o link LootLabs."
    });
  }
};
