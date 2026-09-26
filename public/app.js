const state = {
  user: null,
  currentPage: "home",
  key: null,
  lootlabsToken: null,
  polling: false
};


// =====================================================
// SITE STATUS
// =====================================================

async function checkSiteStatus() {
  try {
    const response = await fetch(
      "/api/site/status",
      {
        method: "GET",
        cache: "no-store"
      }
    );

    const data = await response.json();

    if (
      data.success &&
      data.site_enabled === false
    ) {
      document.body.innerHTML = `
        <div style="
          min-height:100vh;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:24px;
          background:#050608;
          color:#fff;
          font-family:Inter,Arial,sans-serif;
          text-align:center;
        ">
          <div style="max-width:520px">
            <div style="
              font-size:13px;
              font-weight:800;
              letter-spacing:4px;
              color:#8d96aa;
              margin-bottom:18px;
            ">
              ECLIPSE HUB
            </div>

            <h1 style="
              margin:0 0 14px;
              font-size:32px;
              line-height:1.15;
            ">
              Site temporariamente indisponível
            </h1>

            <p style="
              margin:0;
              color:#8c94a8;
              line-height:1.7;
            ">
              Estamos realizando uma manutenção.
              Tente novamente mais tarde.
            </p>
          </div>
        </div>
      `;

      return false;
    }

    return true;

  } catch (error) {
    console.error(
      "Erro verificando status do site:",
      error
    );

    return true;
  }
}


// =====================================================
// DISCORD
// =====================================================

async function loadDiscordUser() {
  try {
    const response = await fetch(
      "/api/discord/me",
      {
        credentials: "include",
        cache: "no-store"
      }
    );

    const data = await response.json();

    if (
      response.ok &&
      data.authenticated &&
      data.user
    ) {
      state.user = data.user;
    } else {
      state.user = null;
    }

    updateDiscordUI();

  } catch (error) {
    console.error(
      "Erro Discord:",
      error
    );

    state.user = null;

    updateDiscordUI();
  }
}


// =====================================================
// DISCORD UI
// =====================================================

function updateDiscordUI() {
  const status = document.querySelector("#discordStatus");
  const user = document.querySelector("#discordUser");
  const login = document.querySelector("#discordLoginBtn");
  const logout = document.querySelector("#discordLogoutBtn");

  if (state.user) {
    if (status) {
      status.textContent = "Discord conectado";
      status.classList.add("connected");
    }
    if (user) {
      const name = state.user.global_name || state.user.username || "Conta Discord";
      user.textContent = state.user.username ? `${name} (@${state.user.username})` : name;
    }
    if (login) login.hidden = true;
    if (logout) logout.hidden = false;
  } else {
    if (status) {
      status.textContent = "Discord não conectado";
      status.classList.remove("connected");
    }
    if (user) user.textContent = "Conecte sua conta para continuar.";
    if (login) login.hidden = false;
    if (logout) logout.hidden = true;
  }
}


// =====================================================
// NAVEGAÇÃO
// =====================================================

function navigate(page) {
  state.currentPage = page;

  document
    .querySelectorAll("[data-page]")
    .forEach(element => {
      element.classList.toggle(
        "active",
        element.dataset.page === page
      );
    });

  document
    .querySelectorAll(".page")
    .forEach(element => {
      element.classList.toggle(
        "active",
        element.id === page
      );
    });

  // Mantém compatibilidade caso alguma página use data-view.
  document
    .querySelectorAll("[data-view]")
    .forEach(element => {
      element.style.display =
        element.dataset.view === page
          ? ""
          : "none";
    });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  closeSidebar();
}


// =====================================================
// SIDEBAR
// =====================================================

function openSidebar() {
  document.body.classList.add(
    "sidebar-open"
  );
}

function closeSidebar() {
  document.body.classList.remove(
    "sidebar-open"
  );
}

function setupSidebar() {

  const menuButton =
    document.querySelector(
      "[data-menu]"
    );

  if (menuButton) {
    menuButton.addEventListener(
      "click",
      event => {
        event.stopPropagation();
        openSidebar();
      }
    );
  }

  document
    .querySelectorAll(
      "[data-sidebar-close]"
    )
    .forEach(element => {
      element.addEventListener(
        "click",
        closeSidebar
      );
    });

  document.addEventListener(
    "click",
    event => {

      if (
        !document.body.classList.contains(
          "sidebar-open"
        )
      ) {
        return;
      }

      const sidebar =
        document.querySelector(
          "[data-sidebar]"
        );

      const menuButton =
        document.querySelector(
          "[data-menu]"
        );

      if (
        sidebar &&
        !sidebar.contains(event.target) &&
        !menuButton?.contains(event.target)
      ) {
        closeSidebar();
      }

    }
  );
}


// =====================================================
// LINKS DE NAVEGAÇÃO
// =====================================================

function setupNavigation() {

  document
    .querySelectorAll(
      "[data-page]"
    )
    .forEach(element => {

      element.addEventListener(
        "click",
        () => {
          navigate(
            element.dataset.page
          );
        }
      );

    });
}


// =====================================================
// DISCORD LOGIN
// =====================================================

function setupDiscordLogin() {
  const button = document.querySelector("#discordLoginBtn");
  if (!button) return;

  button.addEventListener("click", () => {
    window.location.href = "/api/discord/login";
  });
}


// =====================================================
// DISCORD INVITE
// =====================================================

function setupDiscordInvite() {

  document
    .querySelectorAll(
      "[data-discord-invite]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {
          window.open(
            "https://discord.gg/MZB9Fznp8B",
            "_blank",
            "noopener"
          );
        }
      );

    });
}


// =====================================================
// LOGOUT
// =====================================================

async function logoutDiscord() {
  try {
    const response = await fetch("/api/discord/logout", {
      method: "POST",
      credentials: "include",
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Não foi possível desvincular a conta.");
    }
  } catch (error) {
    console.error("Erro logout:", error);
    throw error;
  }

  state.user = null;
  state.key = null;
  state.lootlabsToken = null;
  updateDiscordUI();
}

function setupLogout() {
  const button = document.querySelector("#discordLogoutBtn");
  if (!button) return;

  button.addEventListener("click", async () => {
    button.disabled = true;
    const oldText = button.textContent;
    button.textContent = "Desvinculando...";

    try {
      await logoutDiscord();
    } catch (error) {
      alert(error.message || "Não foi possível desvincular a conta.");
    } finally {
      button.disabled = false;
      button.textContent = oldText;
    }
  });
}


// =====================================================
// CRIAR LOOTLABS
// =====================================================

async function startLootLabs() {

  if (!state.user) {

    window.location.href =
      "/api/discord/login";

    return;
  }

  const button =
    document.querySelector("#generateKeyBtn");

  const status =
    document.querySelector("#keyStatus");

  if (button) {
    button.disabled = true;
    button.textContent =
      "Preparando missão...";
  }

  if (status) {
    status.textContent =
      "Preparando sua missão...";
  }

  try {

    const response =
      await fetch(
        "/api/lootlabs/create",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json"
          }
        }
      );

    const data =
      await response.json();

    if (
      !response.ok ||
      !data.success ||
      !data.url
    ) {
      throw new Error(
        data.error ||
        "Não foi possível criar a missão."
      );
    }

    state.lootlabsToken =
      data.token || null;

    if (status) {
      status.textContent =
        "Redirecionando para a missão...";
    }

    window.location.href =
      data.url;

  } catch (error) {

    console.error(
      "Erro criando LootLabs:",
      error
    );

    if (status) {
      status.textContent =
        error.message;
    }

    if (button) {
      button.disabled = false;
      button.textContent =
        "Gerar Key";
    }
  }
}


// =====================================================
// GERAR KEY
// =====================================================

function setupGenerateKey() {
  const button = document.querySelector("#generateKeyBtn");
  if (!button) return;
  button.addEventListener("click", startLootLabs);
}


// =====================================================
// STATUS DA SESSÃO
// =====================================================

async function checkLootLabsStatus(
  token
) {

  try {

    const response =
      await fetch(
        `/api/lootlabs/status?token=${encodeURIComponent(token)}`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store"
        }
      );

    const data =
      await response.json();

    if (
      response.ok &&
      data.completed &&
      data.key
    ) {

      state.key =
        data.key;

      showGeneratedKey(
        data.key
      );

      return true;
    }

  } catch (error) {

    console.error(
      "Erro verificando Key:",
      error
    );

  }

  return false;
}


// =====================================================
// POLLING
// =====================================================

async function pollLootLabs(
  token
) {

  if (state.polling) {
    return;
  }

  state.polling = true;

  const status =
    document.querySelector("#keyStatus");

  const start =
    Date.now();

  const timeout =
    10 * 60 * 1000;

  while (
    Date.now() - start <
    timeout
  ) {

    const completed =
      await checkLootLabsStatus(
        token
      );

    if (completed) {

      state.polling = false;

      return;
    }

    if (status) {
      status.textContent =
        "Aguardando confirmação do LootLabs...";
    }

    await new Promise(
      resolve =>
        setTimeout(
          resolve,
          3000
        )
    );
  }

  state.polling = false;

  if (status) {
    status.textContent =
      "A confirmação demorou mais que o esperado. Atualize a página para tentar novamente.";
  }
}


// =====================================================
// MOSTRAR KEY
// =====================================================

function showGeneratedKey(key) {

  const keyElements =
    document.querySelectorAll("#generatedKey");

  keyElements.forEach(
    element => {
      element.textContent = key;
    }
  );

  const status =
    document.querySelector("#keyStatus");

  if (status) {
    status.textContent =
      "Key liberada com sucesso.";
  }

  document
    .querySelectorAll(
      "#copyKeyBtn"
    )
    .forEach(button => {

      button.disabled = false;

      button.dataset.key =
        key;

    });

  document
    .querySelectorAll(
      "#generateKeyBtn"
    )
    .forEach(button => {

      button.disabled = false;

      button.textContent =
        "Gerar nova Key";

    });
}


// =====================================================
// COPIAR KEY
// =====================================================

async function copyKey(button) {
  const key = button.dataset.key || state.key || document.querySelector("#generatedKey")?.textContent?.trim();
  if (!key || key === "Aguardando geração...") return;

  try {
    await copyText(key);
    const oldText = button.textContent;
    button.textContent = "Copiado!";
    setTimeout(() => { button.textContent = oldText; }, 1500);
  } catch (error) {
    console.error("Erro copiando Key:", error);
  }
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const input = document.createElement("textarea");
  input.value = text;
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.focus();
  input.select();
  const ok = document.execCommand("copy");
  input.remove();
  if (!ok) throw new Error("Cópia não suportada pelo navegador.");
}



function setupCopyKey() {
  const button = document.querySelector("#copyKeyBtn");
  if (!button) return;
  button.addEventListener("click", () => copyKey(button));
}


// =====================================================
// RETORNO DO LOOTLABS
// =====================================================

async function handleLootLabsReturn() {

  const params =
    new URLSearchParams(
      window.location.search
    );

  const lootlabs =
    params.get(
      "lootlabs"
    );

  const token =
    params.get(
      "token"
    );

  if (
    lootlabs !== "return" ||
    !token
  ) {
    return;
  }

  navigate("key");

  const status =
    document.querySelector("#keyStatus");

  if (status) {
    status.textContent =
      "Verificando sua conclusão...";
  }

  // Primeiro tenta imediatamente
  const completed =
    await checkLootLabsStatus(
      token
    );

  if (completed) {
    cleanLootLabsUrl();
    return;
  }

  // Depois continua verificando
  pollLootLabs(token);

  cleanLootLabsUrl();
}


// =====================================================
// LIMPAR URL
// =====================================================

function cleanLootLabsUrl() {

  const cleanUrl =
    `${window.location.origin}${window.location.pathname}`;

  window.history.replaceState(
    {},
    document.title,
    cleanUrl
  );
}


// =====================================================
// PIX
// =====================================================

function setupPixCopy() {
  document.querySelectorAll("#copyPixBtn, #copyPixMainBtn").forEach(button => {
    button.addEventListener("click", async () => {
      const pix = document.querySelector("#pixKey")?.textContent?.trim();
      if (!pix) return;

      try {
        await copyText(pix);
        const oldText = button.textContent;
        button.textContent = "Pix copiado!";
        setTimeout(() => { button.textContent = oldText; }, 1500);
      } catch (error) {
        console.error("Erro copiando Pix:", error);
        alert("Não foi possível copiar automaticamente. Selecione a chave Pix e copie manualmente.");
      }
    });
  });
}


// =====================================================
// SHINE DOS CARDS
// =====================================================

function setupCardShine() {

  document
    .querySelectorAll(
      ".feature-card, .info-card, .product-card"
    )
    .forEach(card => {

      card.addEventListener(
        "pointermove",
        event => {

          const rect =
            card.getBoundingClientRect();

          const x =
            event.clientX -
            rect.left;

          const y =
            event.clientY -
            rect.top;

          card.style.setProperty(
            "--shine-x",
            `${x}px`
          );

          card.style.setProperty(
            "--shine-y",
            `${y}px`
          );

        }
      );

    });
}


// =====================================================
// LINKS EXTERNOS
// =====================================================

function setupExternalLinks() {

  document
    .querySelectorAll(
      "[data-buy-script]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          // Mantenha aqui o seu
          // link de compra atual.
          const url =
            button.dataset.buyScript;

          if (url) {
            window.open(
              url,
              "_blank",
              "noopener"
            );
          }

        }
      );

    });
}


// =====================================================
// CALLBACK DISCORD
// =====================================================

function handleDiscordCallback() {

  const params =
    new URLSearchParams(
      window.location.search
    );

  if (
    params.get("discord") ===
    "connected"
  ) {

    navigate("discord");

    window.history.replaceState(
      {},
      document.title,
      window.location.pathname
    );

  }
}


// =====================================================
// INICIALIZAÇÃO
// =====================================================

async function init() {

  const available =
    await checkSiteStatus();

  if (!available) {
    return;
  }

  setupSidebar();

  setupNavigation();

  setupDiscordLogin();

  setupDiscordInvite();

  setupLogout();

  setupGenerateKey();

  setupCopyKey();

  setupPixCopy();

  setupCardShine();

  setupExternalLinks();

  handleDiscordCallback();

  await loadDiscordUser();

  await handleLootLabsReturn();
}


init();
