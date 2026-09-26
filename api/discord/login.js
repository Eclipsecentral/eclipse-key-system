const crypto = require("crypto");

module.exports = (req, res) => {
  const {
    DISCORD_CLIENT_ID,
    DISCORD_REDIRECT_URI,
    SESSION_SECRET
  } = process.env;

  if (
    !DISCORD_CLIENT_ID ||
    !DISCORD_REDIRECT_URI ||
    !SESSION_SECRET
  ) {
    return res.status(500).json({
      error: "Discord OAuth2 não configurado."
    });
  }

  const state = crypto.randomBytes(32).toString("hex");

  res.setHeader(
    "Set-Cookie",
    `eclipse_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
  );

  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: "code",
    scope: "identify",
    state
  });

  return res.redirect(
    302,
    `https://discord.com/oauth2/authorize?${params.toString()}`
  );
};
