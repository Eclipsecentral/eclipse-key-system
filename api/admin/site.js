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

    // =========================
    // CONSULTAR STATUS
    // =========================

    if (req.method === "GET") {

      const response =
        await fetch(
          `${SUPABASE_URL}/rest/v1/site_settings?id=eq.1&select=site_enabled,updated_at`,
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

      const data =
        await response.json();

      const settings =
        data[0];

      return res.status(200).json({
        success: true,

        site_enabled:
          settings
            ? settings.site_enabled
            : true,

        updated_at:
          settings
            ? settings.updated_at
            : null
      });
    }

    // =========================
    // ALTERAR STATUS
    // =========================

    if (req.method === "POST") {

      const enabled =
        req.body?.enabled;

      if (
        typeof enabled !==
        "boolean"
      ) {
        return res.status(400).json({
          success: false,
          error:
            "enabled deve ser true ou false."
        });
      }

      const response =
        await fetch(
          `${SUPABASE_URL}/rest/v1/site_settings?id=eq.1`,
          {
            method: "PATCH",

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
                site_enabled:
                  enabled,

                updated_at:
                  new Date().toISOString()
              })
          }
        );

      if (!response.ok) {
        throw new Error(
          await response.text()
        );
      }

      return res.status(200).json({
        success: true,
        site_enabled: enabled
      });
    }

    return res.status(405).json({
      success: false,
      error: "Método não permitido."
    });

  } catch (error) {

    console.error(
      "Admin site error:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "Erro interno."
    });
  }
};
