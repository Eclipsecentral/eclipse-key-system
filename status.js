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
    if (req.method !== "GET") {
      return res.status(405).json({
        error: "Método não permitido."
      });
    }

    const {
      SUPABASE_URL,
      SUPABASE_KEY,
      SESSION_SECRET
    } = process.env;

    const token = req.query.token;

    if (
      !SUPABASE_URL ||
      !SUPABASE_KEY ||
      !SESSION_SECRET
    ) {
      return res.status(500).json({
        error: "Configuração incompleta."
      });
    }

    if (!token) {
      return res.status(400).json({
        error: "Token ausente."
      });
    }

    // =========================================
    // DISCORD SESSION
    // =========================================

    const cookies = readCookies(req);
    const sessionCookie =
      cookies.eclipse_session;

    if (!sessionCookie) {
      return res.status(401).json({
        error: "Discord não conectado."
      });
    }

    const parts =
      sessionCookie.split(".");

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

    // =========================================
    // SUPABASE
    // =========================================

    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );

    const {
      data: lootSession,
      error
    } = await supabase
      .from("lootlabs_sessions")
      .select(
        "token, discord_id, status, key_value"
      )
      .eq("token", token)
      .maybeSingle();

    if (error) {
      console.error(error);

      return res.status(500).json({
        error:
          "Erro consultando status."
      });
    }

    if (!lootSession) {
      return res.status(404).json({
        error:
          "Sessão LootLabs não encontrada."
      });
    }

    // =========================================
    // GARANTIR QUE É O MESMO DISCORD
    // =========================================

    if (
      lootSession.discord_id !== user.id
    ) {
      return res.status(403).json({
        error:
          "Essa sessão pertence a outra conta."
      });
    }

    // =========================================
    // PENDENTE
    // =========================================

    if (
      lootSession.status !== "completed"
    ) {
      return res.status(200).json({
        completed: false
      });
    }

    // =========================================
    // COMPLETO
    // =========================================

    return res.status(200).json({
      completed: true,
      key: lootSession.key_value
    });

  } catch (error) {
    console.error(
      "LootLabs status error:",
      error
    );

    return res.status(500).json({
      error:
        "Erro interno."
    });
  }
};
