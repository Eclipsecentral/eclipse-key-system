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
  return crypto
    .randomBytes(32)
    .toString("hex");
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
    // CONFIGURAÇÕES
    // =========================

    if (
      !SUPABASE_URL ||
      !SUPABASE_KEY
    ) {
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

    const user =
      await getDiscordUser(req);

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

    const token =
      generateToken();

    const returnUrl =
      `${SITE_URL}/?lootlabs=return&token=${encodeURIComponent(token)}`;

    // =========================
    // CRIA SESSÃO
    // =========================

    const sessionResponse =
      await fetch(
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
      const sessionError =
        await sessionResponse.text();

      console.error(
        "Erro ao criar sessão:",
        sessionError
      );

      return res.status(500).json({
        success: false,
        error:
          "Não foi possível criar a sessão."
      });
    }

    // =========================
    // LOOTLABS
    // =========================

    const lootlabsPayload = {
      title:
        "Eclipse Hub | Obter Key",

      url:
        returnUrl,

      tier_id: 1,

      number_of_tasks: 3,

      theme: 1
    };

    console.log(
      "LootLabs payload:",
      lootlabsPayload
    );

    const lootlabsResponse =
      await fetch(
        "https://creators.lootlabs.gg/api/public/content_locker",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${LOOTLABS_API_KEY}`,

            "Content-Type":
              "application/json",

            Accept:
              "application/json"
          },

          body:
            JSON.stringify(
              lootlabsPayload
            )
        }
      );

    const lootlabsRaw =
      await lootlabsResponse.text();

    let lootlabsData;

    try {
      lootlabsData =
        JSON.parse(lootlabsRaw);
    } catch {
      lootlabsData = {
        raw: lootlabsRaw
      };
    }

    console.log(
      "================================="
    );

    console.log(
      "LOOTLABS STATUS:",
      lootlabsResponse.status
    );

    console.log(
      "LOOTLABS RESPOSTA:"
    );

    console.log(
      JSON.stringify(
        lootlabsData,
        null,
        2
      )
    );

    console.log(
      "================================="
    );

    // =========================
    // PEGA LOOT URL
    // =========================

    let lootUrl = null;

    if (
      lootlabsData &&
      Array.isArray(
        lootlabsData.message
      ) &&
      lootlabsData.message.length
    ) {
      lootUrl =
        lootlabsData
          .message[0]
          ?.loot_url;
    }

    if (
      !lootUrl &&
      lootlabsData?.message &&
      !Array.isArray(
        lootlabsData.message
      )
    ) {
      lootUrl =
        lootlabsData
          .message
          ?.loot_url;
    }

    if (!lootUrl) {
      lootUrl =
        lootlabsData?.loot_url ||
        lootlabsData?.url ||
        null;
    }

    if (
      !lootlabsResponse.ok ||
      !lootUrl
    ) {
      console.error(
        "LootLabs não retornou URL:",
        lootlabsData
      );

      return res.status(502).json({
        success: false,
        error:
          "LootLabs não retornou o link."
      });
    }

    // =========================
    // PUID
    // =========================

    const separator =
      lootUrl.includes("?")
        ? "&"
        : "?";

    lootUrl =
      `${lootUrl}${separator}puid=${encodeURIComponent(token)}`;

    console.log(
      "LootLabs URL com PUID:",
      lootUrl
    );

    // =========================
    // RED-SQUARE / B.Y.P.A.S.S
    // =========================

    const redSquarePayload = {
      url: lootUrl,

      // LootLabs é o provider suportado
      // pelo B.Y.P.A.S.S.
      pikey:
        LOOTLABS_API_KEY,

      provider:
        "lootlabs",

      Identificator:
        "eclipse-hub",

      jsonDetections: {
        Referer: true,

        MaxTasks:
          "3",

        tier_id:
          1,

        Presets: {
          "BYPASS.VIP": true,
          "BYPASS.CITY": true,
          "TRW-API": true
        },

        RenueveBooster: {
          BlockVPNS: true,

          BlockIncognito: true,

          CaptchaRequired: true,

          XTra_tasks: [
            {
              Title:
                "Siga nosso TikTok",

              Descr:
                "Siga @adri.assis_ no TikTok para continuar.",

              link:
                "https://www.tiktok.com/@adri.assis_",

              ID:
                "eclipse_tiktok_follow"
            }
          ]
        },

        MinTime:
          "5",

        DetectUserscripts:
          true,

        UnicodeDetect:
          true,

        SpoofCompletion:
          true,

        RS_Invisible:
          false,

        ManualDetectionZ:
          false,

        VMConfig: {
          enabled:
            true,

          VMode:
            "medium"
        }
      }
    };

    console.log(
      "================================="
    );

    console.log(
      "RED-SQUARE PAYLOAD:"
    );

    console.log(
      JSON.stringify(
        redSquarePayload,
        null,
        2
      )
    );

    console.log(
      "================================="
    );

    const redSquareResponse =
      await fetch(
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
        JSON.parse(
          redSquareRaw
        );
    } catch {
      redSquareData = {
        raw:
          redSquareRaw
      };
    }

    console.log(
      "================================="
    );

    console.log(
      "RED-SQUARE STATUS:",
      redSquareResponse.status
    );

    console.log(
      "RED-SQUARE RESPOSTA:"
    );

    console.log(
      JSON.stringify(
        redSquareData,
        null,
        2
      )
    );

    console.log(
      "================================="
    );

    // =========================
    // RED-SQUARE ERRO
    // =========================

    if (
      !redSquareResponse.ok ||
      !redSquareData?.success ||
      !redSquareData?.link
    ) {
      console.error(
        "RED-SQUARE não retornou link válido:",
        redSquareData
      );

      return res.status(502).json({
        success: false,
        error:
          "RED-SQUARE não conseguiu proteger o link.",
        red_square_status:
          redSquareResponse.status,
        red_square_response:
          redSquareData
      });
    }

    // =========================
    // LINK FINAL
    // =========================

    const finalUrl =
      redSquareData.link;

    console.log(
      "LINK FINAL ECLIPSE:",
      finalUrl
    );

    // =========================
    // SUCESSO
    // =========================

    return res.status(200).json({
      success: true,

      url:
        finalUrl,

      token,

      discord_id:
        discordId,

      discord_nick:
        discordNick
    });

  } catch (error) {
    console.error(
      "Erro interno /api/lootlabs/create:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "Erro interno ao criar o link."
    });
  }
};
