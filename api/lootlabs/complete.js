const crypto = require("crypto");

const SUPABASE_URL =
  process.env.SUPABASE_URL;

const SUPABASE_KEY =
  process.env.SUPABASE_KEY;

const SITE_URL =
  process.env.SITE_URL ||
  "https://eclipse-key-system.vercel.app";


// =====================================
// GERA BLOCO
// =====================================

function randomBlock() {

  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  let result = "";

  for (let i = 0; i < 4; i++) {

    result +=
      chars.charAt(
        Math.floor(
          Math.random() *
          chars.length
        )
      );

  }

  return result;
}


// =====================================
// GERA KEY
// =====================================

function generateKey() {

  return (
    "NHX-" +
    randomBlock() +
    "-" +
    randomBlock() +
    "-" +
    randomBlock()
  );

}


// =====================================
// VERIFICA SE KEY EXISTE
// =====================================

async function generateUniqueKey() {

  for (
    let attempt = 0;
    attempt < 30;
    attempt++
  ) {

    const key =
      generateKey();

    const response =
      await fetch(
        `${SUPABASE_URL}/rest/v1/keys_sistema?chave=eq.${encodeURIComponent(key)}&select=id`,
        {
          method:
            "GET",

          headers: {

            apikey:
              SUPABASE_KEY,

            Authorization:
              `Bearer ${SUPABASE_KEY}`
          }
        }
      );


    if (!response.ok) {

      const error =
        await response.text();

      throw new Error(
        `Erro verificando Key: ${error}`
      );

    }


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
// HANDLER
// =====================================

module.exports = async function handler(
  req,
  res
) {

  try {

    // =================================
    // TOKEN
    // =================================

    const token =
      req.query.token;


    if (!token) {

      return res.redirect(
        `${SITE_URL}/?lootlabs=error`
      );

    }


    console.log(
      "================================="
    );

    console.log(
      "LOOTLABS COMPLETE"
    );

    console.log(
      "Token recebido:",
      token
    );

    console.log(
      "================================="
    );


    // =================================
    // BUSCA SESSÃO
    // =================================

    const sessionResponse =
      await fetch(
        `${SUPABASE_URL}/rest/v1/lootlabs_sessions?token=eq.${encodeURIComponent(token)}&select=*`,
        {
          method:
            "GET",

          headers: {

            apikey:
              SUPABASE_KEY,

            Authorization:
              `Bearer ${SUPABASE_KEY}`
          }
        }
      );


    if (!sessionResponse.ok) {

      const error =
        await sessionResponse.text();

      console.error(
        "Erro buscando sessão:",
        error
      );

      return res.redirect(
        `${SITE_URL}/?lootlabs=error`
      );

    }


    const sessions =
      await sessionResponse.json();


    if (
      !Array.isArray(sessions) ||
      sessions.length === 0
    ) {

      console.error(
        "Sessão não encontrada:",
        token
      );

      return res.redirect(
        `${SITE_URL}/?lootlabs=error`
      );

    }


    const session =
      sessions[0];


    // =================================
    // SE JÁ ESTÁ COMPLETA
    // =================================

    if (
      session.status ===
      "completed" &&
      session.key_value
    ) {

      console.log(
        "Sessão já concluída."
      );

      return res.redirect(
        `${SITE_URL}/?lootlabs=return&token=${encodeURIComponent(token)}`
      );

    }


    // =================================
    // DISCORD
    // =================================

    const discordId =
      session.discord_id;

    const discordNick =
      session.discord_nick ||
      "Desconhecido";


    if (!discordId) {

      console.error(
        "Discord ID ausente."
      );

      return res.redirect(
        `${SITE_URL}/?lootlabs=error`
      );

    }


    // =================================
    // GERA KEY
    // =================================

    const key =
      await generateUniqueKey();


    // =================================
    // USER_ID
    // =================================
    //
    // FORMATO:
    //
    // DiscordID | Nick
    //
    // =================================

    const userId =
      `${discordId} | ${discordNick}`;


    // =================================
    // SALVA KEY
    // =================================

    const keyResponse =
      await fetch(
        `${SUPABASE_URL}/rest/v1/keys_sistema`,
        {
          method:
            "POST",

          headers: {

            apikey:
              SUPABASE_KEY,

            Authorization:
              `Bearer ${SUPABASE_KEY}`,

            "Content-Type":
              "application/json",

            Prefer:
              "return=representation"
          },

          body:
            JSON.stringify({

              chave:
                key,

              usada:
                false,

              user_id:
                userId

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


    // =================================
    // MARCA SESSÃO
    // =================================

    const updateResponse =
      await fetch(
        `${SUPABASE_URL}/rest/v1/lootlabs_sessions?token=eq.${encodeURIComponent(token)}`,
        {
          method:
            "PATCH",

          headers: {

            apikey:
              SUPABASE_KEY,

            Authorization:
              `Bearer ${SUPABASE_KEY}`,

            "Content-Type":
              "application/json",

            Prefer:
              "return=minimal"
          },

          body:
            JSON.stringify({

              status:
                "completed",

              key_id:
                keyId,

              key_value:
                key,

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


    // =================================
    // SUCESSO
    // =================================

    console.log(
      "================================="
    );

    console.log(
      "KEY LIBERADA"
    );

    console.log({

      discord_id:
        discordId,

      discord_nick:
        discordNick,

      key_created:
        true

    });

    console.log(
      "================================="
    );


    // =================================
    // VOLTA PARA O SITE
    // =================================

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
