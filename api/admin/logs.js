const SUPABASE_URL =
  process.env.SUPABASE_URL;

const SUPABASE_KEY =
  process.env.SUPABASE_KEY;

const {
  requireAdmin
} = require("./auth");

module.exports = async function handler(req, res) {

  try {

    const admin =
      await requireAdmin(req, res);

    if (!admin) {
      return;
    }

    if (req.method !== "GET") {
      return res.status(405).json({
        success: false,
        error:
          "Método não permitido."
      });
    }

    const response =
      await fetch(
        `${SUPABASE_URL}/rest/v1/key_logs?select=chave,discord_id,discord_nick,created_at&order=created_at.desc&limit=100`,
        {
          headers: {
            apikey:
              SUPABASE_KEY,

            Authorization:
              `Bearer ${SUPABASE_KEY}`
          }
        }
      );

    if (!response.ok) {
      throw new Error(
        await response.text()
      );
    }

    const logs =
      await response.json();

    return res.status(200).json({
      success: true,
      logs
    });

  } catch (error) {

    console.error(
      "Admin logs error:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "Não foi possível carregar os logs."
    });
  }
};
