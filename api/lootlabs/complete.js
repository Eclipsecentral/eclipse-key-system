const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const SITE_URL =
  process.env.SITE_URL ||
  "https://eclipse-key-system.vercel.app";

module.exports = async function handler(req, res) {
  try {
    const token = req.query.token;

    if (!token) {
      return res.redirect(
        `${SITE_URL}/?lootlabs=error`
      );
    }

    // Procura a sessão
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/lootlabs_sessions?token=eq.${encodeURIComponent(token)}&select=*`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization:
            `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    const sessions = await response.json();

    if (
      !response.ok ||
      !Array.isArray(sessions) ||
      !sessions.length
    ) {
      console.error(
        "Sessão não encontrada:",
        token
      );

      return res.redirect(
        `${SITE_URL}/?lootlabs=error`
      );
    }

    const session = sessions[0];

    // Se ainda não tiver uma key,
    // cria uma agora.
    if (
      session.status !== "completed" ||
      !session.key_value
    ) {
      const key = await generateUniqueKey();

      const userId =
        session.discord_id;

      // Cria a key no Supabase
      const keyResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/keys_sistema`,
        {
          method: "POST",

          headers: {
            apikey: SUPABASE_KEY,
            Authorization:
              `Bearer ${SUPABASE_KEY}`,
            "Content-Type":
              "application/json",
            Prefer:
              "return=representation"
          },

          body: JSON.stringify({
            chave: key,
            usada: false,
            user_id: userId
          })
        }
      );

      if (!keyResponse.ok) {
        const error =
          await keyResponse.text();

        console.error(
          "Erro criando Key:",
          error
        );

        return res.redirect(
          `${SITE_URL}/?lootlabs=error`
        );
      }

      const createdKey =
        await keyResponse.json();

      const keyId =
        Array.isArray(createdKey)
          ? createdKey[0]?.id
          : null;

      // Marca sessão como concluída
      const updateResponse =
        await fetch(
          `${SUPABASE_URL}/rest/v1/lootlabs_sessions?token=eq.${encodeURIComponent(token)}`,
          {
            method: "PATCH",

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
              status: "completed",
              key_id: keyId,
              key_value: key,
              completed_at:
                new Date().toISOString()
            })
          }
        );

      if (!updateResponse.ok) {
        const error =
          await updateResponse.text();

        console.error(
          "Erro atualizando sessão:",
          error
        );

        return res.redirect(
          `${SITE_URL}/?lootlabs=error`
        );
      }

      console.log(
        "LootLabs concluído:",
        {
          token,
          discord_id:
            session.discord_id,
          key_created: true
        }
      );
    }

    // Volta para o Eclipse
    return res.redirect(
      `${SITE_URL}/?lootlabs=return&token=${encodeURIComponent(token)}`
    );

  } catch (error) {
    console.error(
      "Erro /api/lootlabs/complete:",
      error
    );

    return res.redirect(
      `${SITE_URL}/?lootlabs=error`
    );
  }
};


// =====================================
// GERA KEY ÚNICA
// =====================================

async function generateUniqueKey() {
  for (let attempt = 0; attempt < 20; attempt++) {
    const key =
      "NHX-" +
      randomBlock() +
      "-" +
      randomBlock() +
      "-" +
      randomBlock();

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/keys_sistema?chave=eq.${encodeURIComponent(key)}&select=id`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization:
            `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    const existing =
      await response.json();

    if (
      Array.isArray(existing) &&
      existing.length === 0
    ) {
      return key;
    }
  }

  throw new Error(
    "Não foi possível gerar uma Key única."
  );
}


// =====================================
// BLOCO DA KEY
// =====================================

function randomBlock() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  let result = "";

  for (let i = 0; i < 4; i++) {
    result +=
      chars.charAt(
        Math.floor(
          Math.random() * chars.length
        )
      );
  }

  return result;
}
