const crypto = require("crypto");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const LOOTLABS_API_KEY = process.env.LOOTLABS_API_KEY;
const SESSION_SECRET = process.env.SESSION_SECRET;

function verifySession(cookie) {
  if (!cookie || !SESSION_SECRET) return null;

  const parts = cookie.split(".");
  if (parts.length !== 2) return null;

  const [payload, signature] = parts;

  try {
    const expected = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(payload)
      .digest("base64url");

    if (signature !== expected) return null;

    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );

    return data;
  } catch {
    return null;
  }
}

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Método não permitido"
    });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return res.status(500).json({
        success: false,
        error: "Supabase não configurado"
      });
    }

    if (!LOOTLABS_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "LOOTLABS_API_KEY não configurada"
      });
    }

    if (!SESSION_SECRET) {
      return res.status(500).json({
        success: false,
        error: "SESSION_SECRET não configurada"
      });
    }

    const session = verifySession(req.headers.cookie?.match(
      /(?:^|;\s*)eclipse_session=([^;]+)/
    )?.[1]);

    if (!session || !session.user) {
      return res.status(401).json({
        success: false,
        error: "Discord não conectado"
      });
    }

    const user = session.user;

    const discordId = user.id;
    const discordNick =
      user.global_name ||
      user.username ||
      "Desconhecido";

    const token = generateToken();

    // Salva a sessão antes de criar o link
    const sessionResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/lootlabs_sessions`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal"
        },
        body: JSON.stringify({
          token,
          discord_id: discordId,
          status: "pending"
        })
      }
    );

    if (!sessionResponse.ok) {
      const errorText = await sessionResponse.text();

      console.error("Supabase:", errorText);

      return res.status(500).json({
        success: false,
        error: "Não foi possível criar a sessão LootLabs"
      });
    }

    const returnUrl =
      `https://eclipse-key-system.vercel.app/?lootlabs=return&token=${encodeURIComponent(token)}`;

    /*
     * LootLabs Content Locker
     *
     * Usando GET porque a documentação oficial
     * também suporta esse formato.
     */
    const params = new URLSearchParams({
      api_token: LOOTLABS_API_KEY,
      title: "Eclipse Hub - Obter Key",
      url: returnUrl,
      tier_id: "1",
      number_of_tasks: "3",
      theme: "1"
    });

    const lootLabsUrl =
      `https://creators.lootlabs.gg/api/public/content_locker?${params.toString()}`;

    const lootResponse = await fetch(lootLabsUrl);

    const rawText = await lootResponse.text();

    console.log("LootLabs status:", lootResponse.status);
    console.log("LootLabs response:", rawText);

    let lootData;

    try {
      lootData = JSON.parse(rawText);
    } catch {
      return res.status(502).json({
        success: false,
        error: "LootLabs retornou uma resposta inválida"
      });
    }

    if (!lootResponse.ok || lootData.type === "error") {
      return res.status(502).json({
        success: false,
        error:
          lootData.message ||
          "LootLabs recusou a criação do link"
      });
    }

    const lootUrl = lootData?.message?.loot_url;

    if (!lootUrl) {
      return res.status(502).json({
        success: false,
        error: "LootLabs não retornou o link"
      });
    }

    // O puid será enviado pelo LootLabs como click_id no postback
    const separator = lootUrl.includes("?") ? "&" : "?";

    const finalLootUrl =
      `${lootUrl}${separator}puid=${encodeURIComponent(token)}`;

    return res.status(200).json({
      success: true,
      url: finalLootUrl,
      token,
      discord_id: discordId,
      discord_nick: discordNick
    });

  } catch (error) {
    console.error("LootLabs create error:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Erro interno"
    });
  }
};
