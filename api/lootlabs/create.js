const crypto = require("crypto");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const LOOTLABS_API_KEY = process.env.LOOTLABS_API_KEY;

const SITE_URL = "https://eclipse-key-system.vercel.app";

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

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Método não permitido"
    });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return res.status(500).json({
        success: false,
        error: "Supabase não configurado"
      });
    }

    if (!LOOTLABS_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "LOOTLABS_API_KEY não configurada"
      });
    }

    /*
     * Pega a sessão atual do navegador.
     */
    const sessionCookie = getCookie(
      req,
      "eclipse_session"
    );

    if (!sessionCookie) {
      return res.status(401).json({
        success: false,
        error: "Discord não conectado"
      });
    }

    /*
     * Valida a sessão usando a própria API
     * que já funciona no site.
     */
    const meResponse = await fetch(
      `${SITE_URL}/api/discord/me`,
      {
        method: "GET",
        headers: {
          Cookie: `eclipse_session=${encodeURIComponent(sessionCookie)}`
        },
        cache: "no-store"
      }
    );

    const meText = await meResponse.text();

    let meData;

    try {
      meData = JSON.parse(meText);
    } catch {
      console.error(
        "Discord /me retornou:",
        meText
      );

      return res.status(401).json({
        success: false,
        error: "Não foi possível validar o Discord"
      });
    }

    console.log(
      "Discord session:",
      meResponse.status,
      meData.authenticated
    );

    if (
      !meResponse.ok ||
      meData.authenticated !== true ||
      !meData.user
    ) {
      return res.status(401).json({
        success: false,
        error: "Discord não conectado"
      });
    }

    const user = meData.user;

    const discordId = String(user.id);

    const discordNick =
      user.global_name ||
      user.username ||
      "Desconhecido";

    /*
     * Token exclusivo dessa tentativa.
     */
    const token = generateToken();

    /*
     * Salva a sessão LootLabs.
     *
     * O nick fica salvo aqui porque depois,
     * no Postback, precisamos registrar:
     *
     * DiscordID | Nick
     */
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
      const errorText =
        await sessionResponse.text();

      console.error(
        "Supabase lootlabs_sessions:",
        errorText
      );

      return res.status(500).json({
        success: false,
        error: "Não foi possível criar a sessão LootLabs"
      });
    }

    /*
     * Página para onde o LootLabs devolverá o usuário.
     */
    const returnUrl =
      `${SITE_URL}/?lootlabs=return&token=${encodeURIComponent(token)}`;

    /*
     * Parâmetros do Content Locker.
     */
    const params = new URLSearchParams();

    params.set(
      "api_token",
      LOOTLABS_API_KEY
    );

    params.set(
      "title",
      "Eclipse Hub - Obter Key"
    );

    params.set(
      "url",
      returnUrl
    );

    params.set(
      "tier_id",
      "1"
    );

    params.set(
      "number_of_tasks",
      "3"
    );

    params.set(
      "theme",
      "1"
    );

    const lootLabsEndpoint =
      "https://creators.lootlabs.gg/api/public/content_locker";

    const lootLabsUrl =
      `${lootLabsEndpoint}?${params.toString()}`;

    console.log(
      "Criando LootLabs..."
    );

    const lootResponse = await fetch(
      lootLabsUrl,
      {
        method: "GET",
        headers: {
          Accept: "application/json"
        }
      }
    );

    const rawText =
      await lootResponse.text();

    console.log(
      "LootLabs status:",
      lootResponse.status
    );

    console.log(
      "LootLabs response:",
      rawText
    );

    let lootData;

    try {
      lootData = JSON.parse(rawText);
    } catch {
      return res.status(502).json({
        success: false,
        error:
          "LootLabs retornou uma resposta inválida"
      });
    }

    if (!lootResponse.ok) {
      return res.status(502).json({
        success: false,
        error:
          lootData.message ||
          lootData.error ||
          "LootLabs recusou a criação do link"
      });
    }

    if (
      lootData.type === "error" ||
      lootData.success === false
    ) {
      return res.status(502).json({
        success: false,
        error:
          lootData.message ||
          lootData.error ||
          "LootLabs recusou a criação do link"
      });
    }

    /*
     * LootLabs pode retornar o link em formatos
     * diferentes dependendo da versão da API.
     */
    const lootUrl =
      lootData?.message?.loot_url ||
      lootData?.message?.url ||
      lootData?.loot_url ||
      lootData?.url;

    if (!lootUrl) {
      console.error(
        "LootLabs sem URL:",
        lootData
      );

      return res.status(502).json({
        success: false,
        error:
          "LootLabs não retornou o link de acesso"
      });
    }

    /*
     * O puid será usado pelo Postback
     * como click_id.
     */
    const separator =
      lootUrl.includes("?")
        ? "&"
        : "?";

    const finalLootUrl =
      `${lootUrl}${separator}puid=${encodeURIComponent(token)}`;

    return res.status(200).json({
      success: true,
      url: finalLootUrl,
      token,
      discord_id: discordId,
      discord_nick: discordNick
    });

  } catch (error) {
    console.error(
      "LootLabs create error:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        "Erro interno"
    });
  }
};
