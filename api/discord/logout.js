module.exports = (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  res.setHeader("Set-Cookie", [
    "eclipse_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
    "eclipse_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
  ]);

  return res.status(200).json({ success: true });
};
