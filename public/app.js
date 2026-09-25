const menuButton = document.getElementById("menuButton");
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");

const menuItems = document.querySelectorAll(
  ".menu-item[data-page]"
);

const pages = {
  generate: document.getElementById("generatePage"),
  account: document.getElementById("accountPage"),
  key: document.getElementById("keyPage"),
  settings: document.getElementById("settingsPage")
};

const discordStatus =
  document.getElementById("discordStatus");

const generateButton =
  document.getElementById("generateButton");

const status =
  document.getElementById("status");

const keyResult =
  document.getElementById("keyResult");

const generatedKey =
  document.getElementById("generatedKey");

const copyKey =
  document.getElementById("copyKey");

const accountName =
  document.getElementById("accountName");

const accountId =
  document.getElementById("accountId");

const myKeyBox =
  document.getElementById("myKeyBox");


/* =========================
   MENU
========================= */

function openMenu() {
  sidebar.classList.add("open");
  overlay.classList.add("active");
}

function closeMenu() {
  sidebar.classList.remove("open");
  overlay.classList.remove("active");
}

menuButton.addEventListener("click", () => {

  if (sidebar.classList.contains("open")) {
    closeMenu();
  } else {
    openMenu();
  }

});

overlay.addEventListener("click", closeMenu);


/* =========================
   NAVEGAÇÃO
========================= */

menuItems.forEach(item => {

  item.addEventListener("click", () => {

    const page = item.dataset.page;

    menuItems.forEach(button => {
      button.classList.remove("active");
    });

    item.classList.add("active");

    Object.values(pages).forEach(section => {
      section.classList.remove("active-page");
    });

    if (pages[page]) {
      pages[page].classList.add("active-page");
    }

    closeMenu();

    if (page === "account") {
      loadAccount();
    }

    if (page === "key") {
      loadMyKey();
    }

  });

});


/* =========================
   DISCORD
========================= */

let currentUser = null;

async function loadDiscord() {

  try {

    const response = await fetch(
      "/api/discord/me",
      {
        credentials: "include"
      }
    );

    const data = await response.json();

    if (!data.authenticated) {

      discordStatus.textContent =
        "Discord não conectado";

      discordStatus.classList.remove("connected");
      discordStatus.classList.add("loading");

      generateButton.textContent =
        "Entrar com Discord";

      return;

    }

    currentUser = data.user;

    discordStatus.textContent =
      `● Discord conectado como ${
        data.user.global_name ||
        data.user.username
      }`;

    discordStatus.classList.remove("loading");
    discordStatus.classList.add("connected");

  } catch (error) {

    console.error(error);

    discordStatus.textContent =
      "Erro ao verificar Discord";

  }

}


/* =========================
   LOGIN
========================= */

generateButton.addEventListener(
  "click",
  async () => {

    if (!currentUser) {

      window.location.href =
        "/api/discord/login";

      return;

    }

    /*
      A geração real da Key será ligada
      ao endpoint do Supabase na próxima etapa.
    */

    status.textContent =
      "Preparando geração da sua Key...";

    generateButton.disabled = true;

    try {

      const response = await fetch(
        "/api/keys/generate",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          "Não foi possível gerar a Key."
        );
      }

      generatedKey.textContent =
        data.key;

      keyResult.classList.remove("hidden");

      status.textContent =
        "Key gerada com sucesso.";

      loadMyKey();

    } catch (error) {

      console.error(error);

      status.textContent =
        error.message ||
        "Erro ao gerar a Key.";

    } finally {

      generateButton.disabled = false;

    }

  }
);


/* =========================
   COPIAR KEY
========================= */

copyKey.addEventListener(
  "click",
  async () => {

    const key =
      generatedKey.textContent;

    try {

      await navigator.clipboard.writeText(key);

      copyKey.textContent = "Copiado!";

      setTimeout(() => {
        copyKey.textContent = "Copiar";
      }, 1500);

    } catch {

      copyKey.textContent =
        "Erro";

    }

  }
);


/* =========================
   CONTA
========================= */

async function loadAccount() {

  if (!currentUser) {

    accountName.textContent =
      "Discord não conectado";

    accountId.textContent =
      "Faça login pelo menu Gerar Key";

    return;

  }

  accountName.textContent =
    currentUser.global_name ||
    currentUser.username;

  accountId.textContent =
    `Discord ID: ${currentUser.id}`;

}


/* =========================
   MINHA KEY
========================= */

async function loadMyKey() {

  if (!currentUser) {

    myKeyBox.textContent =
      "Conecte seu Discord primeiro.";

    return;

  }

  try {

    const response = await fetch(
      "/api/keys/me",
      {
        credentials: "include"
      }
    );

    const data = await response.json();

    if (!response.ok || !data.key) {

      myKeyBox.textContent =
        "Nenhuma Key encontrada.";

      return;

    }

    myKeyBox.innerHTML =
      `<code>${data.key}</code>`;

  } catch {

    myKeyBox.textContent =
      "Nenhuma Key encontrada.";

  }

}


/* =========================
   INICIALIZAÇÃO
========================= */

loadDiscord();
