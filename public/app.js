const getKeyButton = document.querySelector("#getKey");
const statusElement = document.querySelector("#status");

async function loadDiscordSession() {
  try {
    const response = await fetch("/api/discord/me");

    const data = await response.json();

    if (!data.authenticated) {
      return;
    }

    showLoggedIn(data.user);
  } catch (error) {
    console.error("Erro ao verificar sessão:", error);
  }
}

function showLoggedIn(user) {
  if (!getKeyButton) return;

  const name =
    user.global_name ||
    user.username ||
    "Usuário";

  getKeyButton.textContent = `Continuar como ${name}`;

  getKeyButton.onclick = () => {
    window.location.href = "/api/discord/login";
  };

  if (statusElement) {
    statusElement.textContent =
      `Discord conectado • ID: ${user.id}`;

    statusElement.style.color = "#8bffb0";
  }
}

if (getKeyButton) {
  getKeyButton.addEventListener("click", () => {
    window.location.href = "/api/discord/login";
  });
}

const params = new URLSearchParams(
  window.location.search
);

if (params.get("discord") === "connected") {
  window.history.replaceState(
    {},
    document.title,
    "/"
  );
}

if (params.get("discord_error")) {
  if (statusElement) {
    statusElement.textContent =
      "Não foi possível conectar ao Discord.";

    statusElement.style.color = "#ff7070";
  }

  window.history.replaceState(
    {},
    document.title,
    "/"
  );
}

loadDiscordSession();
