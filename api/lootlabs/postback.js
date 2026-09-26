const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

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
    if (req.method !== "GET") {
      return res.status(405).json({
        error: "Método não permitido."
      });
    }

    const {
      SUPABASE_URL,
      SUPABASE_KEY
    } = process.env;

    if (
      !SUPABASE_URL ||
      !SUPABASE_KEY
    ) {
      return res.status(500).json({
        error:
          "Supabase não configurado."
      });
    }

    const {
      click_id,
      ip,
      unique_id
    } = req.query;

    if (!click_id) {
      return res.status(400).json({
        error: "click_id ausente."
      });
    }

    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );

    // =========================================
    // ENCONTRAR SESSÃO
    // =========================================

    const {
      data: session,
      error: sessionError
    } = await supabase
      .from("lootlabs_sessions")
      .select("*")
      .eq("token", click_id)
      .maybeSingle();

    if (sessionError) {
      console.error(sessionError);

      return res.status(500).json({
        error:
          "Erro consultando sessão."
      });
    }

    if (!session) {
      return res.status(404).json({
        error: "Sessão não encontrada."
      });
    }

    // =========================================
    // EVITAR DUPLICAÇÃO
    // =========================================

    if (session.status === "completed") {
      return res.status(200).json({
        success: true,
        message: "Já processado."
      });
    }

    // =========================================
    // BUSCAR USUÁRIO
    // =========================================

    const discordId =
      session.discord_id;

    // =========================================
    // GERAR KEY ÚNICA
    // =========================================

    let key = null;
    let keyData = null;

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
            "Erro verificando key."
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
          "Não foi possível gerar uma key."
      });
    }

    // =========================================
    // USER ID
    // =========================================

    // O nick não vem no Postback.
    // Ele será obtido novamente pelo Discord
    // em uma etapa posterior, se necessário.

    const userId =
      `${discordId}`;

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
        user_id: userId
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
    // MARCAR LOOTLABS COMO COMPLETO
    // =========================================

    const {
      error: updateError
    } = await supabase
      .from("lootlabs_sessions")
      .update({
        status: "completed",
        key_id: data.id,
        key_value: data.chave,
        unique_id:
          unique_id || null,
        completed_at:
          new Date().toISOString()
      })
      .eq("token", click_id);

    if (updateError) {
      console.error(
        "Erro atualizando sessão:",
        updateError
      );
    }

    return res.status(200).json({
      success: true
    });

  } catch (error) {
    console.error(
      "Postback error:",
      error
    );

    return res.status(500).json({
      error:
        "Erro interno no postback."
    });
  }
};
