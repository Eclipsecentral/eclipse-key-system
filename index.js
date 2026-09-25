const express = require("express");
const path = require("path");
const crypto = require("crypto");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const {
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  DISCORD_REDIRECT_URI,
  SESSION_SECRET
} = process.env;

const DISCORD_API = "https://discord.com/api";

function base64url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function sign(value) {
  return crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(value)
    .digest("base64url");
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

function createSignedData(data) {
  const payload = base64url(JSON.stringify(data));
  const signature = sign(payload);

  return `${payload}.${signature}`;
}

function readSignedData(value) {
  try {
    if (!value) return null;

    const [payload, signature] = value.split(".");

    if (!payload || !signature) return null;

    const expected = sign(payload);

    if (
      !crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected)
      )
    ) {
      return null;
    }

    return JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );
  } catch {
    return null;
  }
}

/*
|--------------------------------------------------------------------------
| Status
|--------------------------------------------------------------------------
*/

app.get("/api/status", (req, res) => {
  res.json({
    online: true,
    service: "Eclipse Key System",
    version: "1.1.0"
  });
});

/*
|--------------------------------------------------------------------------
| Discord OAuth2 - Login
|--------------------------------------------------------------------------
*/

app.get("/api/discord/login", (req, res) => {
  if (
    !DISCORD_CLIENT_ID ||
    !DISCORD_REDIRECT_URI ||
    !SESSION_SECRET
  ) {
    return res.status(500).send("Discord OAuth2 não configurado.");
  }

  const state = crypto.randomBytes(32).toString("hex");

  const stateCookie = createSignedData({
    state,
    createdAt: Date.now()
  });

  res.setHeader(
    "Set-Cookie",
    createCookie(
      "eclipse_oauth_state",
      stateCookie,
      600
    )
  );

  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: "code",
    scope: "identify",
    state
  });

  res.redirect(
    `${DISCORD_API}/oauth2/authorize?${params.toString()}`
  );
});

/*
|--------------------------------------------------------------------------
| Discord OAuth2 - Callback
|--------------------------------------------------------------------------
*/

app.get("/api/discord/callback", async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(
        "/?discord_error=" +
        encodeURIComponent(error)
      );
    }

    if (!code || !state) {
      return res.status(400).send("OAuth2 inválido.");
    }

    const cookies = readCookies(req);
    const savedState = readSignedData(
      cookies.eclipse_oauth_state
    );

    if (!savedState || savedState.state !== state) {
      return res.status(400).send("Estado OAuth2 inválido.");
    }

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

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("Discord token error:", tokenData);

      return res
        .status(502)
        .send("Não foi possível autenticar com o Discord.");
    }

    const userResponse = await fetch(
      `${DISCORD_API}/users/@me`,
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`
        }
      }
    );

    const discordUser = await userResponse.json();

    if (!userResponse.ok || !discordUser.id) {
      console.error("Discord user error:", discordUser);

      return res
        .status(502)
        .send("Não foi possível obter seu Discord.");
    }

    /*
     * Guardamos somente os dados necessários.
     * O token OAuth do Discord NÃO é salvo no cookie.
     */

    const session = createSignedData({
      id: discordUser.id,
      username: discordUser.username,
      global_name: discordUser.global_name || null,
      avatar: discordUser.avatar || null,
      createdAt: Date.now()
    });

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

    res.redirect("/?discord=connected");
  } catch (error) {
    console.error("OAuth2 callback error:", error);

    res
      .status(500)
      .send("Erro interno durante o login com Discord.");
  }
});

/*
|--------------------------------------------------------------------------
| Current Discord session
|--------------------------------------------------------------------------
*/

app.get("/api/discord/me", (req, res) => {
  const cookies = readCookies(req);

  const session = readSignedData(
    cookies.eclipse_session
  );

  if (!session) {
    return res.json({
      authenticated: false
    });
  }

  res.json({
    authenticated: true,
    user: {
      id: session.id,
      username: session.username,
      global_name: session.global_name,
      avatar: session.avatar
    }
  });
});

/*
|--------------------------------------------------------------------------
| Logout
|--------------------------------------------------------------------------
*/

app.post("/api/discord/logout", (req, res) => {
  res.setHeader(
    "Set-Cookie",
    "eclipse_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
  );

  res.json({
    success: true
  });
});

/*
|--------------------------------------------------------------------------
| Frontend
|--------------------------------------------------------------------------
*/

app.get("*", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "index.html")
  );
});

if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3000;

  app.listen(PORT, () => {
    console.log(
      `Eclipse Key System rodando na porta ${PORT}`
    );
  });
}

module.exports = app;
