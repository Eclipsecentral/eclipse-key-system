const SITE_URL =
  process.env.SITE_URL ||
  "https://eclipse-key-system.vercel.app";

const ADMIN_DISCORD_ID =
  process.env.ADMIN_DISCORD_ID;

function getCookie(req, name) {
  const cookies = req.headers.cookie || "";

  const match = cookies.match(
    new RegExp(
      "(?:^|;\\s*)" +
        name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
        "=([^;]*)"
    )
  );

  return match
    ? decodeURIComponent(match[1])
    : null;
}

async function getDiscordUser(req) {
  const session =
    getCookie(req, "eclipse_session");

  if (!session) {
    return null;
  }

  const response = await fetch(
    `${SITE_URL}/api/discord/me`,
    {
      headers: {
        Cookie:
          `eclipse_session=${encodeURIComponent(session)}`
      }
    }
  );

  if (!response.ok) {
    return null;
  }

  const data =
    await response.json();

  if (
    !data.authenticated ||
    !data.user
  ) {
    return null;
  }

  return data.user;
}

async function requireAdmin(req, res) {
  const user =
    await getDiscordUser(req);

  if (!user) {
    res.status(401).json({
      success: false,
      error: "Discord não conectado."
    });

    return null;
  }

  if (
    !ADMIN_DISCORD_ID ||
    user.id !== ADMIN_DISCORD_ID
  ) {
    res.status(403).json({
      success: false,
      error: "Acesso negado."
    });

    return null;
  }

  return user;
}

module.exports = {
  requireAdmin
};
