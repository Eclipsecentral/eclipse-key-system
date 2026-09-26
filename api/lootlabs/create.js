const crypto = require("crypto");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const LOOTLABS_API_KEY = process.env.LOOTLABS_API_KEY;

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

function verifySession(session) {
  try {
    if (!session || !process.env.SESSION_SECRET) {
      return null;
    }

    const parts = session.split(".");

    if (parts.length !== 2) {
      return null;
    }

    const [payload, signature] = parts;

    const expected = crypto
      .createHmac("sha256", process.env.SESSION_SECRET)
      .update(payload)
      .digest("base64url");

    if (signature !== expected) {
      return null;
    }

    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );

    if (!data || !data.user) {
      return null;
    }

    return data.user;
  } catch (error) {
    console.error("Erro ao verificar sessão:", error);
    return null;
  }
}

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

async function supabaseRequest(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const text = await response.text();

  let data;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return {
    response,
    data
  };
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
        error: "LootLabs não configurado"
      });
    }

    /*
     * ============================================================
     * 1. PEGAR SESSÃO DO DISCORD
     * ============================================================
     */

    const session = getCookie(req, "eclipse_session");

    if (!session) {
      return res.status(401).json({
        success: false,
        error: "Discord não conectado"
      });
    }

    const user = verifySession(session);

    if (!user || !user.id) {
      return res.status(401).json({
        success: false,
        error: "Sessão inválida"
      });
    }

    const discordId = String(user.id);

    const discordNick =
      user.global_name ||
      user.username ||
      "Desconhecido";

    /*
     * ============================================================
     * 2. CRIAR TOKEN ÚNICO DA SESSÃO LOOTLABS
     * ============================================================
     */

    const token = generateToken();

    /*
     * ============================================================
     * 3. SALVAR SESSÃO NO SUPABASE
     * ============================================================
     */

    const { response: sessionResponse, data: sessionData } =
      await supabaseRequest("/rest/v1/lootlabs_sessions", {
        method: "POST",
        headers: {
          Prefer: "return=representation"
        },
        body: JSON.stringify({
          token,
          discord_id: discordId,
          status: "pending"
        })
      });

    if (!sessionResponse.ok) {
      console.error("Erro ao criar lootlabs_sessions:", sessionData);

      return res.status(500).json({
        success: false,
        error: "Não foi possível criar a sessão LootLabs"
      });
    }

    /*
     * ============================================================
     * 4. URL PARA ONDE O LOOTLABS VAI MANDAR O USUÁRIO
     * ============================================================
     */

    const returnUrl =
      `${SITE_URL}/?lootlabs=return&token=${encodeURIComponent(token)}`;

    /*
     * ============================================================
     * 5. CRIAR LINK NO LOOTLABS
     *
     * API OFICIAL:
     * POST /api/public/content_locker
     *
     * Authorization:
     * Bearer LOOTLABS_API_KEY
     * ============================================================
     */

    const lootlabsPayload = {
      title: "Eclipse Hub - Obter Key",
      url: returnUrl,
      tier_id: 1,
      number_of_tasks: 3,
      theme: 1
    };

    console.log("Criando link LootLabs:", {
      discordId,
      token,
      returnUrl,
      payload: lootlabsPayload
    });

    const lootlabsResponse = await fetch(
      "https://creators.lootlabs.gg/api/public/content_locker",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOOTLABS_API_KEY}`,
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(lootlabsPayload)
      }
    );

    const rawText = await lootlabsResponse.text();

    let lootlabsData;

    try {
      lootlabsData = rawText ? JSON.parse(rawText) : null;
    } catch {
      lootlabsData = {
        raw: rawText
      };
    }

    console.log("LootLabs HTTP:", lootlabsResponse.status);
    console.log("LootLabs resposta:", lootlabsData);

    /*
     * ============================================================
     * 6. VERIFICAR ERRO DO LOOTLABS
     * ============================================================
     */

    if (!lootlabsResponse.ok) {
      return res.status(502).json({
        success: false,
        error: "LootLabs recusou a criação do link",
        lootlabs_status: lootlabsResponse.status,
        lootlabs_response: lootlabsData
      });
    }

    /*
     * ============================================================
     * 7. PEGAR URL GERADA PELO LOOTLABS
     * ============================================================
     */

    let lootUrl =
      lootlabsData?.message?.loot_url ||
      lootlabsData?.message?.url ||
      lootlabsData?.loot_url ||
      lootlabsData?.url ||
      lootlabsData?.link;

    if (!lootUrl) {
      console.error(
        "LootLabs não retornou uma URL:",
        lootlabsData
      );

      return res.status(502).json({
        success: false,
        error: "LootLabs não retornou o link",
        lootlabs_response: lootlabsData
      });
    }

    /*
     * ============================================================
     * 8. ADICIONAR PUID
     *
     * O LootLabs envia esse valor posteriormente
     * como click_id no Postback.
     * ============================================================
     */

    try {
      const url = new URL(lootUrl);

      url.searchParams.set("puid", token);

      lootUrl = url.toString();
    } catch (error) {
      console.error("Erro ao adicionar puid:", error);

      return res.status(500).json({
        success: false,
        error: "Link LootLabs inválido"
      });
    }

    /*
     * ============================================================
     * 9. RETORNAR LINK PARA O FRONT-END
     * ============================================================
     */

    return res.status(200).json({
      success: true,
      url: lootUrl,
      token,
      discord: {
        id: discordId,
        nick: discordNick
      }
    });

  } catch (error) {
    console.error("Erro geral em /api/lootlabs/create:", error);

    return res.status(500).json({
      success: false,
      error: "Erro interno ao criar o LootLabs"
    });
  }
};
