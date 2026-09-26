const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

function base64urlDecode(value) {
  value = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  while (value.length % 4) {
    value += "=";
  }

  return Buffer.from(value, "base64").toString("utf8");
}

function verifySignature(payload, signature, secret) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  if (signature.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

function readCookies(req) {
  const cookies = {};
  const header = req.headers.cookie || "";

  for (const part of header.split(";")) {
    const index = part.indexOf("=");

    if (index === -1) continue;

    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();

    cookies[key] = decodeURIComponent(value);
  }

  return cookies;
}

module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Método não permitido."
      });
    }

    const {
      LOOTLABS_API_KEY,
      SUPABASE_URL,
      SUPABASE_KEY,
      SESSION_SECRET
    } = process.env;

    if (
      !LOOTLABS_API_KEY ||
      !SUPABASE_URL ||
      !SUPABASE_KEY ||
      !SESSION_SECRET
    ) {
      return res.status(500).json({
        error: "Configuração incompleta."
      });
    }

    // =========================================
    // DISCORD SESSION
    // =========================================

    const cookies = readCookies(req);
    const session = cookies.eclipse_session;

    if (!session) {
      return res.status(401).json({
        error:
          "Conecte sua conta do Discord primeiro."
      });
    }

    const parts = session.split(".");

    if (parts.length !== 2) {
      return res.status(401).json({
        error: "Sessão inválida."
      });
    }

    const [payload, signature] = parts;

    if (
      !verifySignature(
        payload,
        signature,
        SESSION_SECRET
      )
    ) {
      return res.status(401).json({
        error: "Sessão inválida."
      });
    }

    let user;

    try {
      user = JSON.parse(
        base64urlDecode(payload)
      );
    } catch {
      return res.status(401).json({
        error: "Sessão inválida."
      });
    }

    if (!user.id) {
      return res.status(401).json({
        error: "Discord inválido."
      });
    }

    // =========================================
    // SUPABASE
    // =========================================

    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );

    // =========================================
    // TOKEN ÚNICO
    // =========================================

    const token = crypto
      .randomBytes(32)
      .toString("hex");

    const { error: sessionError } =
      await supabase
        .from("lootlabs_sessions")
        .insert({
          token,
          discord_id: user.id,
          status: "pending"
        });

    if (sessionError) {
      console.error(
        "Erro criando sessão LootLabs:",
        sessionError
      );

      return res.status(500).json({
        error:
          "Não foi possível iniciar o LootLabs."
      });
    }

    // =========================================
    // URL DE RETORNO
    // =========================================

    const returnUrl =
      "https://eclipse-key-system.vercel.app/?lootlabs=return&token=" +
      encodeURIComponent(token);

    // =========================================
    // CRIAR LINK LOOTLABS
    // =========================================

    const lootResponse = await fetch(
      "https://creators.lootlabs.gg/api/public/content_locker",
      {
        method: "POST",

        headers: {
          "Authorization":
            `Bearer ${LOOTLABS_API_KEY}`,
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          title: "Eclipse Hub - Obter Key",
          url: returnUrl,
          tier_id: 1,
          number_of_tasks: 3,
          theme: 1
        })
      }
    );

    const lootData =
      await lootResponse.json();

    if (
      !lootResponse.ok ||
      lootData.type === "error" ||
      !lootData.message?.loot_url
    ) {
      console.error(
        "LootLabs error:",
        lootData
      );

      await supabase
        .from("lootlabs_sessions")
        .delete()
        .eq("token", token);

      return res.status(502).json({
        error:
          lootData.message ||
          "Não foi possível criar o link LootLabs."
      });
    }

    // =========================================
    // ADICIONAR PUID
    // =========================================

    const lootUrl =
      lootData.message.loot_url +
      (lootData.message.loot_url.includes("?")
        ? "&"
        : "?") +
      "puid=" +
      encodeURIComponent(token);

    // =========================================
    // RETORNO
    // =========================================

    return res.status(200).json({
      success: true,
      url: lootUrl
    });

  } catch (error) {
    console.error(
      "LootLabs create error:",
      error
    );

    return res.status(500).json({
      error:
        "Erro interno ao iniciar o LootLabs."
    });
  }
};
