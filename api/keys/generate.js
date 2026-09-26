const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

function parseCookies(req) {
  const header = req.headers.cookie || "";

  return Object.fromEntries(
    header
      .split(";")
      .map(v => v.trim())
      .filter(Boolean)
      .map(v => {
        const index = v.indexOf("=");
        if (index === -1) return [v, ""];
        return [
          decodeURIComponent(v.slice(0, index)),
          decodeURIComponent(v.slice(index + 1))
        ];
      })
  );
}

function generateKey() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  function part() {
    let result = "";

    for (let i = 0; i < 4; i++) {
      result += chars[crypto.randomInt(0, chars.length)];
    }

    return result;
  }

  return `NHX-${part()}-${part()}-${part()}`;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método não permitido."
    });
  }

  try {
    const {
      SUPABASE_URL,
      SUPABASE_KEY,
      SESSION_SECRET
    } = process.env;

    if (!SUPABASE_URL || !SUPABASE_KEY || !SESSION_SECRET) {
      return res.status(500).json({
        error: "Configuração do servidor incompleta."
      });
    }

    // =========================
    // VERIFICAR SESSÃO DISCORD
    // =========================

    const cookies = parseCookies(req);
    const session = cookies.eclipse_session;

    if (!session) {
      return res.status(401).json({
        error: "Você precisa conectar sua conta do Discord."
      });
    }

    const separator = session.lastIndexOf(".");

    if (separator === -1) {
      return res.status(401).json({
        error: "Sessão inválida."
      });
    }

    const payload = session.slice(0, separator);
    const signature = session.slice(separator + 1);

    const expectedSignature = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(payload)
      .digest("hex");

    if (
      signature.length !== expectedSignature.length ||
      !crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      )
    ) {
      return res.status(401).json({
        error: "Sessão inválida."
      });
    }

    let user;

    try {
      user = JSON.parse(
        Buffer.from(payload, "base64url").toString("utf8")
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

    // =========================
    // SUPABASE
    // =========================

    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );

    // =========================
    // GERAR KEY
    // =========================

    let key = null;

    for (let attempt = 0; attempt < 10; attempt++) {
      const generated = generateKey();

      const { data: existing, error: checkError } = await supabase
        .from("keys_sistema")
        .select("id")
        .eq("chave", generated)
        .maybeSingle();

      if (checkError) {
        console.error("Erro verificando key:", checkError);

        return res.status(500).json({
          error: "Não foi possível verificar a key."
        });
      }

      if (!existing) {
        key = generated;
        break;
      }
    }

    if (!key) {
      return res.status(500).json({
        error: "Não foi possível gerar uma key única."
      });
    }

    // =========================
    // SALVAR
    // =========================

    const { data, error } = await supabase
      .from("keys_sistema")
      .insert({
        chave: key,
        usada: false,
        user_id: null
      })
      .select("id, chave, usada, user_id")
      .single();

    if (error) {
      console.error("Erro criando key:", error);

      return res.status(500).json({
        error: "Não foi possível salvar a key."
      });
    }

    // =========================
    // RESPOSTA
    // =========================

    return res.status(200).json({
      success: true,
      key: data.chave,
      usada: data.usada,
      user_id: data.user_id,
      discord_id: user.id
    });

  } catch (error) {
    console.error("Erro inesperado:", error);

    return res.status(500).json({
      error: "Erro interno do servidor."
    });
  }
};
