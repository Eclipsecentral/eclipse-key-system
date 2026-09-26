const crypto = require("crypto");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const LOOTLABS_API_KEY = process.env.LOOTLABS_API_KEY;

const SITE_URL =
  process.env.SITE_URL ||
  "https://eclipse-key-system.vercel.app";

/*
 * ============================================================
 * PEGAR COOKIE
 * ============================================================
 */

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

/*
 * ============================================================
 * GERAR TOKEN
 * ============================================================
 */

function generateToken() {
  return crypto
    .randomBytes(32)
    .toString("hex");
}

/*
 * ============================================================
 * SUPABASE REQUEST
 * ============================================================
 */

async function supabaseRequest(
  path,
  options = {}
) {
  const response = await fetch(
    `${SUPABASE_URL}${path}`,
    {
      ...options,

      headers: {
        apikey: SUPABASE_KEY,

        Authorization:
          `Bearer ${SUPABASE_KEY}`,

        "Content-Type":
          "application/json",

        ...(options.headers || {})
      }
    }
  );

  const text =
    await response.text();

  let data;

  try {
    data = text
      ? JSON.parse(text)
      : null;
  } catch {
    data = text;
  }

  return {
    response,
    data
  };
}

/*
 * ============================================================
 * API
 * ============================================================
 */

module.exports = async (
  req,
  res
) => {

  /*
   * ============================================================
   * MÉTODO
   * ============================================================
   */

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Método não permitido"
    });
  }

  try {

    /*
     * ==========================================================
     * CONFIGURAÇÕES
     * ==========================================================
     */

    if (
      !SUPABASE_URL ||
      !SUPABASE_KEY
    ) {
      return res.status(500).json({
        success: false,
        error:
          "Supabase não configurado"
      });
    }

    if (!LOOTLABS_API_KEY) {
      return res.status(500).json({
        success: false,
        error:
          "LootLabs não configurado"
      });
    }

    /*
     * ==========================================================
     * 1. PEGAR SESSÃO DO DISCORD
     * ==========================================================
     */

    const session =
      getCookie(
        req,
        "eclipse_session"
      );

    if (!session) {
      return res.status(401).json({
        success: false,
        error:
          "Discord não conectado"
      });
    }

    /*
     * ==========================================================
     * 2. VALIDAR DISCORD
     *
     * Usa o endpoint que já funciona:
     *
     * /api/discord/me
     * ==========================================================
     */

    const discordResponse =
      await fetch(
        `${SITE_URL}/api/discord/me`,
        {
          method: "GET",

          headers: {
            Cookie:
              `eclipse_session=${encodeURIComponent(session)}`
          }
        }
      );

    const discordText =
      await discordResponse.text();

    let discordData;

    try {

      discordData =
        discordText
          ? JSON.parse(
              discordText
            )
          : null;

    } catch {

      discordData = null;

    }

    console.log(
      "Discord /me:",
      {
        status:
          discordResponse.status,

        authenticated:
          discordData?.authenticated
      }
    );

    /*
     * ==========================================================
     * VERIFICAR AUTENTICAÇÃO
     * ==========================================================
     */

    if (
      !discordResponse.ok ||
      !discordData ||
      discordData.authenticated !== true ||
      !discordData.user ||
      !discordData.user.id
    ) {

      return res.status(401).json({
        success: false,
        error:
          "Sessão do Discord inválida ou expirada"
      });

    }

    /*
     * ==========================================================
     * DADOS DO DISCORD
     * ==========================================================
     */

    const user =
      discordData.user;

    const discordId =
      String(user.id);

    const discordNick =
      user.global_name ||
      user.username ||
      "Desconhecido";

    /*
     * ==========================================================
     * 3. CRIAR TOKEN DA SESSÃO
     * ==========================================================
     */

    const token =
      generateToken();

    /*
     * ==========================================================
     * 4. SALVAR SESSÃO NO SUPABASE
     * ==========================================================
     */

    const {
      response:
        sessionResponse,

      data:
        sessionData

    } = await supabaseRequest(
      "/rest/v1/lootlabs_sessions",
      {
        method: "POST",

        headers: {
          Prefer:
            "return=representation"
        },

        body:
          JSON.stringify({

            token,

            discord_id:
              discordId,

            status:
              "pending"

          })
      }
    );

    /*
     * ==========================================================
     * VERIFICAR SUPABASE
     * ==========================================================
     */

    if (!sessionResponse.ok) {

      console.error(
        "Erro ao criar sessão LootLabs:",
        sessionData
      );

      return res.status(500).json({
        success: false,
        error:
          "Não foi possível criar a sessão LootLabs"
      });

    }

    /*
     * ==========================================================
     * 5. URL DE RETORNO
     * ==========================================================
     */

    const returnUrl =
      `${SITE_URL}/?lootlabs=return&token=${encodeURIComponent(token)}`;

    /*
     * ==========================================================
     * 6. DADOS PARA O LOOTLABS
     * ==========================================================
     */

    const payload = {

      title:
        "Eclipse Hub - Obter Key",

      url:
        returnUrl,

      tier_id:
        1,

      number_of_tasks:
        3,

      theme:
        1

    };

    console.log(
      "Enviando para LootLabs:",
      payload
    );

    /*
     * ==========================================================
     * 7. CRIAR CONTENT LOCKER
     * ==========================================================
     */

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
            JSON.stringify(payload)
        }
      );

    /*
     * ==========================================================
     * LER RESPOSTA
     * ==========================================================
     */

    const rawText =
      await lootlabsResponse.text();

    let lootlabsData;

    try {

      lootlabsData =
        rawText
          ? JSON.parse(rawText)
          : null;

    } catch {

      lootlabsData = {
        raw:
          rawText
      };

    }

    console.log(
      "LootLabs status:",
      lootlabsResponse.status
    );

    console.log(
      "LootLabs resposta:",
      lootlabsData
    );

    /*
     * ==========================================================
     * 8. LOOTLABS RECUSOU
     * ==========================================================
     */

    if (!lootlabsResponse.ok) {

      return res.status(502).json({

        success: false,

        error:
          "LootLabs recusou a criação do link",

        lootlabs_status:
          lootlabsResponse.status,

        lootlabs_type:
          lootlabsData?.type ||
          null,

        lootlabs_message:
          lootlabsData?.message ||
          null,

        lootlabs_response:
          lootlabsData

      });

    }

    /*
     * ==========================================================
     * 9. PEGAR LOOT_URL
     * ==========================================================
     */

    console.log(
      "LootLabs resposta bruta:",
      lootlabsData
    );

    let lootUrl =
      lootlabsData?.message?.loot_url ||
      null;

    /*
     * ==========================================================
     * FALLBACKS
     *
     * Caso a API retorne a URL em outro campo.
     * ==========================================================
     */

    if (!lootUrl) {

      lootUrl =
        lootlabsData?.loot_url ||
        lootlabsData?.url ||
        lootlabsData?.link ||
        null;

    }

    /*
     * ==========================================================
     * 10. VERIFICAR URL
     * ==========================================================
     */

    if (!lootUrl) {

      console.error(
        "================================="
      );

      console.error(
        "LOOTLABS NÃO RETORNOU LOOT_URL"
      );

      console.error(
        "STATUS:",
        lootlabsResponse.status
      );

      console.error(
        "TIPO:",
        lootlabsData?.type
      );

      console.error(
        "MENSAGEM:",
        lootlabsData?.message
      );

      console.error(
        "RESPOSTA COMPLETA:",
        lootlabsData
      );

      console.error(
        "================================="
      );

      return res.status(502).json({

        success: false,

        error:
          "LootLabs não retornou o link",

        lootlabs_status:
          lootlabsResponse.status,

        lootlabs_type:
          lootlabsData?.type ||
          null,

        lootlabs_message:
          lootlabsData?.message ||
          null,

        loot_url:
          null

      });

    }

    /*
     * ==========================================================
     * 11. ADICIONAR PUID
     * ==========================================================
     */

    let finalLootUrl;

    try {

      const lootLink =
        new URL(lootUrl);

      lootLink.searchParams.set(
        "puid",
        token
      );

      finalLootUrl =
        lootLink.toString();

    } catch (error) {

      console.error(
        "URL LootLabs inválida:",
        lootUrl
      );

      return res.status(500).json({

        success: false,

        error:
          "URL retornada pelo LootLabs é inválida"

      });

    }

    /*
     * ==========================================================
     * 12. SUCESSO
     * ==========================================================
     */

    console.log(
      "================================="
    );

    console.log(
      "LOOTLABS CRIADO COM SUCESSO"
    );

    console.log(
      "Discord:",
      discordId
    );

    console.log(
      "Nick:",
      discordNick
    );

    console.log(
      "Token:",
      token
    );

    console.log(
      "Loot URL:",
      finalLootUrl
    );

    console.log(
      "================================="
    );

    return res.status(200).json({

      success:
        true,

      url:
        finalLootUrl,

      token,

      user: {

        id:
          discordId,

        nick:
          discordNick

      }

    });

  } catch (error) {

    /*
     * ==========================================================
     * ERRO GERAL
     * ==========================================================
     */

    console.error(
      "Erro em /api/lootlabs/create:",
      error
    );

    return res.status(500).json({

      success:
        false,

      error:
        "Erro interno ao criar o LootLabs"

    });

  }

};
