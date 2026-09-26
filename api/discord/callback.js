const crypto = require("crypto");

const DISCORD_API = "https://discord.com/api";

function base64url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function sign(value, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(value)
    .digest("base64url");
}

function createSignedData(data, secret) {
  const payload = base64url(JSON.stringify(data));
  const signature = sign(payload, secret);
  return `${payload}.${signature}`;
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

function createCookie(name, value, maxAge) {
  return [
    `${name}=${value}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${maxAge}`
  ].join("; ");
}

module.exports = async (req, res) => {
  try {
    const {
      DISCORD_CLIENT_ID,
      DISCORD_CLIENT_SECRET,
      DISCORD_REDIRECT_URI,
      SESSION_SECRET
    } = process.env;

    if (
      !DISCORD_CLIENT_ID ||
      !DISCORD_CLIENT_SECRET ||
      !DISCORD_REDIRECT_URI ||
      !SESSION_SECRET
    ) {
      return res.status(500).send(
        "Discord OAuth2 não configurado."
      );
    }

    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(
        "/?discord_error=" +
        encodeURIComponent(error)
      );
    }

    if (!code || !state) {
      return res.status(400).send(
        "OAuth2 inválido."
      );
    }

    // Verifica o state salvo pelo login.js
    const cookies = readCookies(req);
    const savedState = cookies.eclipse_oauth_state;

    if (!savedState || savedState !== state) {
      return res.status(400).send(
        "Estado OAuth2 inválido."
      );
    }

    // Troca o código OAuth por um token
    const tokenResponse = await fetch(
      `${DISCORD_API}/oauth2/token`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          client_id: DISCORD_CLIENT_ID,
          client_secret: DISCORD_CLIENT_SECRET,
          grant_type: "authorization_code",
          code,
          redirect_uri: DISCORD_REDIRECT_URI
        })
      }
    );

    const tokenData = await tokenResponse.json();

    if (
      !tokenResponse.ok ||
      !tokenData.access_token
    ) {
      console.error(
        "Discord token error:",
        tokenData
      );

      return res.status(502).send(
        "Não foi possível autenticar com o Discord."
      );
    }

    // Pega os dados do usuário Discord
    const userResponse = await fetch(
      `${DISCORD_API}/users/@me`,
      {
        headers: {
          Authorization:
            `Bearer ${tokenData.access_token}`
        }
      }
    );

    const discordUser = await userResponse.json();

    if (
      !userResponse.ok ||
      !discordUser.id
    ) {
      console.error(
        "Discord user error:",
        discordUser
      );

      return res.status(502).send(
        "Não foi possível obter seu Discord."
      );
    }

    // Cria sessão assinada
    const session = createSignedData(
      {
        id: discordUser.id,
        username: discordUser.username,
        global_name:
          discordUser.global_name || null,
        avatar:
          discordUser.avatar || null,
        createdAt: Date.now()
      },
      SESSION_SECRET
    );

    res.setHeader(
      "Set-Cookie",
      [
        createCookie(
          "eclipse_session",
          session,
          60 * 60 * 24 * 7
        ),
        "eclipse_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
      ]
    );

    // Volta para o site
    return res.redirect(
      "/?discord=connected"
    );

  } catch (error) {
    console.error(
      "OAuth2 callback error:",
      error
    );

    return res.status(500).send(
      "Erro interno durante o login com Discord."
    );
  }
};
