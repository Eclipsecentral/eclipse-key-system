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
  const elements = document.querySelectorAll(
    "[data-discord-status]"
  );

  elements.forEach(element => {

    if (state.user) {
      element.textContent =
        "Discord conectado";
      element.classList.add(
        "connected"
      );
    } else {
      element.textContent =
        "Discord não conectado";
      element.classList.remove(
        "connected"
      );
    }

  });
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

  document
    .querySelectorAll(
      "[data-discord-login]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {
          window.location.href =
            "/api/discord/login";
        }
      );

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
    await fetch(
      "/api/discord/logout",
      {
        method: "POST",
        credentials: "include"
      }
    );
  } catch (error) {
    console.error(
      "Erro logout:",
      error
    );
  }

  state.user = null;

  await loadDiscordUser();
}


// =====================================================
// BOTÃO DESVINCULAR
// =====================================================

function setupLogout() {

  document
    .querySelectorAll(
      "[data-discord-logout]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          button.disabled = true;

          await logoutDiscord();

          button.disabled = false;
        }
      );

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
    document.querySelector(
      "[data-generate-key]"
    );

  const status =
    document.querySelector(
      "[data-key-status]"
    );

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

  document
    .querySelectorAll(
      "[data-generate-key]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        startLootLabs
      );

    });
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
    document.querySelector(
      "[data-key-status]"
    );

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
    document.querySelectorAll(
      "[data-generated-key]"
    );

  keyElements.forEach(
    element => {
      element.textContent = key;
    }
  );

  const status =
    document.querySelector(
      "[data-key-status]"
    );

  if (status) {
    status.textContent =
      "Key liberada com sucesso.";
  }

  document
    .querySelectorAll(
      "[data-copy-key]"
    )
    .forEach(button => {

      button.disabled = false;

      button.dataset.key =
        key;

    });

  document
    .querySelectorAll(
      "[data-generate-key]"
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

  const key =
    button.dataset.key ||
    state.key;

  if (!key) {
    return;
  }

  try {

    await navigator.clipboard.writeText(
      key
    );

    const oldText =
      button.textContent;

    button.textContent =
      "Copiado!";

    setTimeout(
      () => {
        button.textContent =
          oldText;
      },
      1500
    );

  } catch (error) {

    console.error(
      "Erro copiando Key:",
      error
    );

  }
}


function setupCopyKey() {

  document
    .querySelectorAll(
      "[data-copy-key]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => copyKey(button)
      );

    });
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
    document.querySelector(
      "[data-key-status]"
    );

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

  document
    .querySelectorAll(
      "[data-copy-pix]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          const pix =
            "b175d567-5e9a-440c-ad3b-797c6da945c1";

          try {

            await navigator.clipboard.writeText(
              pix
            );

            const oldText =
              button.textContent;

            button.textContent =
              "Pix copiado!";

            setTimeout(
              () => {
                button.textContent =
                  oldText;
              },
              1500
            );

          } catch (error) {

            console.error(
              "Erro copiando Pix:",
              error
            );

          }

        }
      );

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
