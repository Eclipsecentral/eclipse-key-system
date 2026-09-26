const crypto = require("crypto");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const SITE_URL =
  process.env.SITE_URL ||
  "https://eclipse-key-system.vercel.app";

const LOOTLABS_API_KEY =
  process.env.LOOTLABS_API_KEY;

const RED_SQUARE_API_KEY =
  process.env.RED_SQUARE_API_KEY;

function getCookie(req, name) {
  const cookies = req.headers.cookie || "";

  const match = cookies.match(
    new RegExp(
      "(?:^|;\\s*)" +
        name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
        "=([^;]*)"
    )
  );

  return match
    ? decodeURIComponent(match[1])
    : null;
}

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

async function getDiscordUser(req) {
  const session =
    getCookie(req, "eclipse_session");

  if (!session) {
    return null;
  }

  const response = await fetch(
    `${SITE_URL}/api/discord/me`,
    {
      method: "GET",
      headers: {
        Cookie:
          `eclipse_session=${encodeURIComponent(session)}`
      }
    }
  );

  const data = await response.json();

  console.log("Discord /me:", {
    status: response.status,
    authenticated: data.authenticated
  });

  if (
    !response.ok ||
    !data.authenticated ||
    !data.user
  ) {
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
    // =========================
    // CONFIG
    // =========================

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return res.status(500).json({
        success: false,
        error: "Supabase não configurado."
      });
    }

    if (!LOOTLABS_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "LOOTLABS_API_KEY não configurada."
      });
    }

    if (!RED_SQUARE_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "RED_SQUARE_API_KEY não configurada."
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
    // TOKEN
    // =========================

    const token = generateToken();

    const returnUrl =
      `${SITE_URL}/?lootlabs=return&token=${encodeURIComponent(token)}`;

    // =========================
    // CRIA SESSÃO
    // =========================

    const sessionResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/lootlabs_sessions`,
      {
        method: "POST",

        headers: {
          apikey: SUPABASE_KEY,
          Authorization:
            `Bearer ${SUPABASE_KEY}`,
          "Content-Type":
            "application/json",
          Prefer:
            "return=minimal"
        },

        body: JSON.stringify({
          token,
          discord_id: discordId,
          status: "pending"
        })
      }
    );

    if (!sessionResponse.ok) {
      const errorText =
        await sessionResponse.text();

      console.error(
        "Erro Supabase:",
        errorText
      );

      return res.status(500).json({
        success: false,
        error:
          "Não foi possível criar a sessão."
      });
    }

    // =========================
    // RED-SQUARE
    // =========================
    //
    // IMPORTANTE:
    // O RED-SQUARE vai criar
    // SOMENTE 1 LootLabs.
    //
    // Não criamos Content Locker
    // manualmente aqui.
    // =========================

    const redSquarePayload = {
      url: returnUrl,

      // API KEY DO LOOTLABS
      pikey: LOOTLABS_API_KEY,

      provider: "lootlabs",

      Identificator: "eclipse-hub",

      jsonDetections: {
        Referer: true,

        // SOMENTE 1 TAREFA LOOTLABS
        MaxTasks: "1",

        // Tier 1
        tier_id: 1,

        Presets: {
          "BYPASS.VIP": true,
          "BYPASS.CITY": true,
          "TRW-API": true
        },

        RenueveBooster: {
          BlockVPNS: true,

          BlockIncognito: true,

          CaptchaRequired: false,

          // =========================
          // ÚNICA MISSÃO EXTRA
          // =========================

          XTra_tasks: [
            {
              Title:
                "Siga nosso TikTok",

              Descr:
                "Siga @adri.assis_ no TikTok para continuar.",

              link:
                "https://www.tiktok.com/@adri.assis_",

              ID:
                "eclipse_tiktok_follow_v1"
            }
          ]
        },

        MinTime: "5",

        DetectUserscripts: true,

        UnicodeDetect: true,

        SpoofCompletion: true,

        RS_Invisible: false,

        ManualDetectionZ: false,

        VMConfig: {
          enabled: true,
          VMode: "medium"
        }
      }
    };

    // =========================
    // LOG SEGURO
    // =========================
    //
    // NÃO imprimir:
    // - LootLabs API Key
    // - RED-SQUARE API Key
    // =========================

    console.log(
      "RED-SQUARE CONFIG:",
      {
        provider:
          redSquarePayload.provider,

        Identificator:
          redSquarePayload.Identificator,

        MaxTasks:
          redSquarePayload
            .jsonDetections
            .MaxTasks,

        tier_id:
          redSquarePayload
            .jsonDetections
            .tier_id,

        XTra_tasks:
          redSquarePayload
            .jsonDetections
            .RenueveBooster
            .XTra_tasks
            .map(task => ({
              Title: task.Title,
              ID: task.ID
            }))
      }
    );

    // =========================
    // CRIA LINK PROTEGIDO
    // =========================

    const redSquareResponse = await fetch(
      "https://kys.linkvertise.lol/api/v2/bck/publishers",
      {
        method: "POST",

        headers: {
          "c-api-key":
            RED_SQUARE_API_KEY,

          "Content-Type":
            "application/json",

          Accept:
            "application/json"
        },

        body:
          JSON.stringify(
            redSquarePayload
          )
      }
    );

    const redSquareRaw =
      await redSquareResponse.text();

    let redSquareData;

    try {
      redSquareData =
        JSON.parse(redSquareRaw);
    } catch {
      redSquareData = {
        raw: redSquareRaw
      };
    }

    console.log(
      "RED-SQUARE STATUS:",
      redSquareResponse.status
    );

    console.log(
      "RED-SQUARE RESPONSE:",
      {
        success:
          redSquareData?.success,

        hasLink:
          !!redSquareData?.link,

        reason:
          redSquareData?.THReason || null
      }
    );

    // =========================
    // ERRO
    // =========================

    if (
      !redSquareResponse.ok ||
      !redSquareData?.success ||
      !redSquareData?.link
    ) {
      console.error(
        "RED-SQUARE ERROR:",
        redSquareData
      );

      return res.status(502).json({
        success: false,
        error:
          "RED-SQUARE não conseguiu criar o link.",
        red_square_status:
          redSquareResponse.status,
        red_square_reason:
          redSquareData?.THReason || null
      });
    }

    // =========================
    // LINK FINAL
    // =========================

    const finalUrl =
      redSquareData.link;

    console.log(
      "RED-SQUARE LINK CRIADO:"
    );

    console.log(
      finalUrl
    );

    // =========================
    // RESPOSTA
    // =========================

    return res.status(200).json({
      success: true,

      url: finalUrl,

      token,

      discord_id:
        discordId,

      discord_nick:
        discordNick
    });

  } catch (error) {
    console.error(
      "Erro interno:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "Erro interno ao criar o link."
    });
  }
};
