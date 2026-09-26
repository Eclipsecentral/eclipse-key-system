const crypto = require("crypto");

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

module.exports = (req, res) => {
  try {
    const { SESSION_SECRET } = process.env;

    if (!SESSION_SECRET) {
      return res.status(500).json({
        error: "SESSION_SECRET não configurado."
      });
    }

    const cookies = readCookies(req);
    const session = cookies.eclipse_session;

    if (!session) {
      return res.status(401).json({
        authenticated: false
      });
    }

    const parts = session.split(".");

    if (parts.length !== 2) {
      return res.status(401).json({
        authenticated: false
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
        authenticated: false
      });
    }

    const data = JSON.parse(
      base64urlDecode(payload)
    );

    return res.status(200).json({
      authenticated: true,
      user: {
        id: data.id,
        username: data.username,
        global_name: data.global_name || null,
        avatar: data.avatar || null
      }
    });

  } catch (error) {
    console.error("Session error:", error);

    return res.status(401).json({
      authenticated: false
    });
  }
};
