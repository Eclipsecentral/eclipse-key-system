const SUPABASE_URL =
  process.env.SUPABASE_URL;

const SUPABASE_KEY =
  process.env.SUPABASE_KEY;

module.exports = async function handler(req, res) {

  if (req.method !== "GET") {
    return res.status(405).json({
      success: false
    });
  }

  try {

    const response =
      await fetch(
        `${SUPABASE_URL}/rest/v1/site_settings?id=eq.1&select=site_enabled`,
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

    return res.status(200).json({
      success: true,

      site_enabled:
        data[0]
          ? data[0].site_enabled
          : true
    });

  } catch (error) {

    console.error(
      "Site status error:",
      error
    );

    // Se houver erro,
    // mantém o site disponível.
    return res.status(200).json({
      success: true,
      site_enabled: true
    });
  }
};
