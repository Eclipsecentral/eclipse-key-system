const navItems = document.querySelectorAll(".nav-item");
const pages = document.querySelectorAll(".page");

const sidebar = document.getElementById("sidebar");
const menuBtn = document.getElementById("menuBtn");

const discordStatus = document.getElementById("discordStatus");
const discordUser = document.getElementById("discordUser");
const discordLoginBtn = document.getElementById("discordLoginBtn");

const generateKeyBtn = document.getElementById("generateKeyBtn");
const copyKeyBtn = document.getElementById("copyKeyBtn");
const generatedKey = document.getElementById("generatedKey");


/* =========================
   NAVEGAÇÃO
========================= */

function openPage(pageName) {

  pages.forEach(page => {
    page.classList.toggle(
      "active",
      page.id === pageName
    );
  });

  navItems.forEach(item => {
    item.classList.toggle(
      "active",
      item.dataset.page === pageName
    );
  });

  sidebar.classList.remove("open");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


navItems.forEach(item => {

  item.addEventListener("click", () => {

    openPage(item.dataset.page);

  });

});


document.querySelectorAll("[data-page]").forEach(button => {

  if (button.classList.contains("nav-item")) return;

  button.addEventListener("click", () => {
    openPage(button.dataset.page);
  });

});


menuBtn?.addEventListener("click", () => {
  sidebar.classList.toggle("open");
});


/* =========================
   DISCORD
========================= */

async function loadDiscord() {

  try {

    const response = await fetch("/api/discord/me", {
      credentials: "include"
    });

    const data = await response.json();

    if (!data.authenticated) {

      discordStatus.textContent = "Discord não conectado";
      discordUser.textContent = "Conecte sua conta para continuar.";

      discordLoginBtn.textContent = "Conectar Discord";

      discordLoginBtn.onclick = () => {
        window.location.href = "/api/discord/login";
      };

      return;
    }


    const user = data.user;

    discordStatus.textContent = "Discord conectado";

    discordUser.textContent =
      user.global_name ||
      user.username ||
      user.id;

    discordLoginBtn.textContent = "Conectado";

    discordLoginBtn.disabled = true;

    discordLoginBtn.style.opacity = ".55";
    discordLoginBtn.style.cursor = "default";

  } catch (error) {

    console.error(error);

    discordStatus.textContent =
      "Erro ao verificar Discord";

    discordUser.textContent =
      "Tente atualizar a página.";

  }

}


loadDiscord();


/* =========================
   KEY
========================= */

generateKeyBtn?.addEventListener("click", async () => {

  generateKeyBtn.disabled = true;

  generateKeyBtn.innerHTML = `
    <svg viewBox="0 0 24 24">
      <path d="M12 3L14 8L19 10L14 12L12 17L10 12L5 10L10 8L12 3Z"/>
    </svg>
    Gerando...
  `;

  try {

    const response = await fetch("/api/keys/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include"
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Não foi possível gerar a key."
      );
    }

    generatedKey.textContent = data.key;

    copyKeyBtn.disabled = false;

  } catch (error) {

    console.error(error);

    generatedKey.textContent =
      "Erro ao gerar key.";

  } finally {

    generateKeyBtn.disabled = false;

    generateKeyBtn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M12 3L14 8L19 10L14 12L12 17L10 12L5 10L10 8L12 3Z"/>
      </svg>
      Gerar Key
    `;

  }

});


/* =========================
   COPIAR KEY
========================= */

copyKeyBtn?.addEventListener("click", async () => {

  const key = generatedKey.textContent;

  if (!key || key === "Aguardando geração..." || key === "Erro ao gerar key.") {
    return;
  }

  try {

    await navigator.clipboard.writeText(key);

    const original = copyKeyBtn.textContent;

    copyKeyBtn.textContent = "Key copiada!";

    setTimeout(() => {
      copyKeyBtn.textContent = original;
    }, 1600);

  } catch (error) {

    console.error(error);

  }

});


/* =========================
   DISCORD CALLBACK
========================= */

const params = new URLSearchParams(
  window.location.search
);

if (params.get("discord") === "connected") {

  window.history.replaceState(
    {},
    document.title,
    window.location.pathname
  );

  loadDiscord();

}
