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

function generateKey() {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  function part() {
    let result = "";

    for (let i = 0; i < 4; i++) {
      result += chars[
        crypto.randomInt(0, chars.length)
      ];
    }

    return result;
  }

  return `NHX-${part()}-${part()}-${part()}`;
}

module.exports = async (req, res) => {
  try {
    // =========================================
    // MÉTODO
    // =========================================

    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Método não permitido."
      });
    }

    // =========================================
    // VARIÁVEIS
    // =========================================

    const {
      SUPABASE_URL,
      SUPABASE_KEY,
      SESSION_SECRET
    } = process.env;

    if (
      !SUPABASE_URL ||
      !SUPABASE_KEY ||
      !SESSION_SECRET
    ) {
      return res.status(500).json({
        error:
          "Configuração do servidor incompleta."
      });
    }

    // =========================================
    // LER SESSÃO DISCORD
    // =========================================

    const cookies = readCookies(req);
    const session = cookies.eclipse_session;

    if (!session) {
      return res.status(401).json({
        error:
          "Você precisa conectar sua conta do Discord."
      });
    }

    const parts = session.split(".");

    if (parts.length !== 2) {
      return res.status(401).json({
        error: "Sessão inválida."
      });
    }

    const [payload, signature] = parts;

    // =========================================
    // VALIDAR ASSINATURA
    // =========================================

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

    // =========================================
    // LER USUÁRIO
    // =========================================

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
        error: "Usuário Discord inválido."
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
    // GERAR KEY ÚNICA
    // =========================================

    let key = null;

    for (let attempt = 0; attempt < 10; attempt++) {
      const generated = generateKey();

      const {
        data: existing,
        error: checkError
      } = await supabase
        .from("keys_sistema")
        .select("id")
        .eq("chave", generated)
        .maybeSingle();

      if (checkError) {
        console.error(
          "Erro verificando key:",
          checkError
        );

        return res.status(500).json({
          error:
            "Não foi possível verificar a key."
        });
      }

      if (!existing) {
        key = generated;
        break;
      }
    }

    if (!key) {
      return res.status(500).json({
        error:
          "Não foi possível gerar uma key única."
      });
    }

    // =========================================
    // SALVAR KEY
    // =========================================

    const {
      data,
      error
    } = await supabase
      .from("keys_sistema")
      .insert({
        chave: key,
        usada: false,
        user_id: null
      })
      .select(
        "id, chave, usada, user_id"
      )
      .single();

    if (error) {
      console.error(
        "Erro criando key:",
        error
      );

      return res.status(500).json({
        error:
          "Não foi possível salvar a key."
      });
    }

    // =========================================
    // RESPOSTA
    // =========================================

    return res.status(200).json({
      success: true,
      key: data.chave,
      usada: data.usada,
      user_id: data.user_id,
      discord_id: user.id
    });

  } catch (error) {
    console.error(
      "Erro inesperado ao gerar key:",
      error
    );

    return res.status(500).json({
      error:
        "Erro interno do servidor."
    });
  }
};
