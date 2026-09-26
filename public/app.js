const navItems = document.querySelectorAll(".nav-item");
const pages = document.querySelectorAll(".page");

const sidebar = document.getElementById("sidebar");
const menuBtn = document.getElementById("menuBtn");
const menuOverlay = document.getElementById("menuOverlay");

const discordStatus =
  document.getElementById("discordStatus");

const discordUser =
  document.getElementById("discordUser");

const discordLoginBtn =
  document.getElementById("discordLoginBtn");

const discordLogoutBtn =
  document.getElementById("discordLogoutBtn");

const generateKeyBtn =
  document.getElementById("generateKeyBtn");

const copyKeyBtn =
  document.getElementById("copyKeyBtn");

const generatedKey =
  document.getElementById("generatedKey");

let lootlabsPolling = null;


/* =========================================
   MENU MOBILE
========================================= */

function openMenu() {
  sidebar?.classList.add("open");

  document.body.classList.add("menu-open");

  menuBtn?.setAttribute(
    "aria-expanded",
    "true"
  );
}


function closeMenu() {
  sidebar?.classList.remove("open");

  document.body.classList.remove("menu-open");

  menuBtn?.setAttribute(
    "aria-expanded",
    "false"
  );
}


function toggleMenu() {
  if (
    sidebar?.classList.contains("open")
  ) {
    closeMenu();
  } else {
    openMenu();
  }
}


menuBtn?.addEventListener(
  "click",
  toggleMenu
);


/*
 * Tocar/clicar fora das categorias
 * fecha o menu.
 */

menuOverlay?.addEventListener(
  "click",
  closeMenu
);


/*
 * ESC fecha o menu.
 */

document.addEventListener(
  "keydown",
  event => {

    if (event.key === "Escape") {
      closeMenu();
    }

  }
);


/* =========================================
   NAVEGAÇÃO
========================================= */

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


  closeMenu();


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


navItems.forEach(item => {

  item.addEventListener(
    "click",
    () => {
      openPage(item.dataset.page);
    }
  );

});


document
  .querySelectorAll("[data-page]")
  .forEach(element => {

    if (
      element.classList.contains(
        "nav-item"
      )
    ) {
      return;
    }

    element.addEventListener(
      "click",
      () => {

        openPage(
          element.dataset.page
        );

      }
    );

  });


/* =========================================
   BRILHO DOS CARDS
========================================= */

const shineCards =
  document.querySelectorAll(
    ".shine-card"
  );


shineCards.forEach(card => {

  let touchLock = false;


  function triggerShine() {

    if (touchLock) {
      return;
    }

    touchLock = true;


    card.classList.remove(
      "shine-active"
    );


    /*
     * Reinicia a animação.
     */

    void card.offsetWidth;


    card.classList.add(
      "shine-active"
    );


    setTimeout(
      () => {

        card.classList.remove(
          "shine-active"
        );

      },
      800
    );

  }


  /*
   * Mouse:
   * um brilho por entrada.
   */

  card.addEventListener(
    "mouseenter",
    triggerShine
  );


  /*
   * Libera depois de sair.
   */

  card.addEventListener(
    "mouseleave",
    () => {

      touchLock = false;

    }
  );


  /*
   * Celular:
   * um brilho por toque.
   */

  card.addEventListener(
    "touchstart",
    () => {

      triggerShine();


      setTimeout(
        () => {

          touchLock = false;

        },
        500
      );

    },
    {
      passive: true
    }
  );

});


/* =========================================
   DISCORD
========================================= */

async function loadDiscord() {

  if (
    !discordStatus ||
    !discordUser
  ) {
    return;
  }


  try {

    const response =
      await fetch(
        "/api/discord/me",
        {
          credentials: "include",
          cache: "no-store"
        }
      );


    const data =
      await response.json();


    if (
      !data.authenticated
    ) {

      discordStatus.textContent =
        "Discord não conectado";


      discordUser.textContent =
        "Conecte sua conta para continuar.";


      if (discordLoginBtn) {

        discordLoginBtn.hidden =
          false;

        discordLoginBtn.disabled =
          false;

        discordLoginBtn.textContent =
          "Conectar Discord";

        discordLoginBtn.style.opacity =
          "";

        discordLoginBtn.style.cursor =
          "pointer";

      }


      if (discordLogoutBtn) {

        discordLogoutBtn.hidden =
          true;

      }


      return;
    }


    const user =
      data.user;


    discordStatus.textContent =
      "Discord conectado";


    discordUser.textContent =
      user.global_name ||
      user.username ||
      user.id;


    if (discordLoginBtn) {

      discordLoginBtn.hidden =
        true;

      discordLoginBtn.disabled =
        true;

    }


    if (discordLogoutBtn) {

      discordLogoutBtn.hidden =
        false;

    }


  } catch (error) {

    console.error(
      "Erro ao verificar Discord:",
      error
    );


    discordStatus.textContent =
      "Erro ao verificar Discord";


    discordUser.textContent =
      "Atualize a página e tente novamente.";

  }

}


/* =========================================
   LOGIN DISCORD
========================================= */

discordLoginBtn?.addEventListener(
  "click",
  () => {

    window.location.href =
      "/api/discord/login";

  }
);


/* =========================================
   DESVINCULAR DISCORD
========================================= */

discordLogoutBtn?.addEventListener(
  "click",
  async () => {

    const originalText =
      discordLogoutBtn.textContent;


    discordLogoutBtn.disabled =
      true;


    discordLogoutBtn.textContent =
      "Desvinculando...";


    try {

      const response =
        await fetch(
          "/api/discord/logout",
          {
            method: "POST",
            credentials: "include"
          }
        );


      if (!response.ok) {

        throw new Error(
          "Não foi possível desvincular a conta."
        );

      }


      if (generatedKey) {

        generatedKey.textContent =
          "Aguardando geração...";

      }


      if (copyKeyBtn) {

        copyKeyBtn.disabled =
          true;

      }


      await loadDiscord();


      discordLogoutBtn.textContent =
        "Desvinculada";


      discordLogoutBtn.disabled =
        false;


      setTimeout(
        () => {

          if (
            discordLogoutBtn
          ) {

            discordLogoutBtn.textContent =
              "Desvincular";

          }

        },
        1400
      );


    } catch (error) {

      console.error(
        "Erro ao desvincular:",
        error
      );


      discordLogoutBtn.textContent =
        "Erro";


      setTimeout(
        () => {

          discordLogoutBtn.textContent =
            originalText;

          discordLogoutBtn.disabled =
            false;

        },
        1500
      );

    }

  }
);


/* =========================================
   LOOTLABS
========================================= */

async function startLootLabs() {

  if (!generateKeyBtn) {
    return;
  }


  generateKeyBtn.disabled =
    true;


  generateKeyBtn.innerHTML = `
    <svg viewBox="0 0 24 24">
      <path d="M12 3L14 8L19 10L14 12L12 17L10 12L5 10L10 8L12 3Z"/>
    </svg>
    Preparando...
  `;


  if (generatedKey) {

    generatedKey.textContent =
      "Preparando acesso...";

  }


  if (copyKeyBtn) {

    copyKeyBtn.disabled =
      true;

  }


  try {

    const response =
      await fetch(
        "/api/lootlabs/create",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          credentials: "include",

          cache: "no-store"
        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.error ||
        "Não foi possível iniciar o LootLabs."
      );

    }


    if (!data.url) {

      throw new Error(
        "O LootLabs não retornou um link."
      );

    }


    /*
     * Redireciona o usuário para o LootLabs.
     */

    window.location.href =
      data.url;


  } catch (error) {

    console.error(
      "Erro ao iniciar LootLabs:",
      error
    );


    if (generatedKey) {

      generatedKey.textContent =
        error.message ||
        "Erro ao iniciar LootLabs.";

    }


    generateKeyBtn.disabled =
      false;


    generateKeyBtn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M12 3L14 8L19 10L14 12L12 17L10 12L5 10L10 8L12 3Z"/>
      </svg>
      Gerar Key
    `;

  }

}


/* =========================================
   GERAR KEY
========================================= */

generateKeyBtn?.addEventListener(
  "click",
  async () => {

    /*
     * Agora o botão NÃO gera a key
     * diretamente.
     *
     * Primeiro manda o usuário
     * para o LootLabs.
     */

    await startLootLabs();

  }
);


/* =========================================
   COPIAR KEY
========================================= */

copyKeyBtn?.addEventListener(
  "click",
  async () => {

    const key =
      generatedKey.textContent.trim();


    if (
      !key ||
      key === "Aguardando geração..." ||
      key === "Preparando acesso..." ||
      key === "Verificando conclusão..." ||
      key === "Aguardando confirmação do LootLabs..." ||
      key.startsWith("Erro") ||
      key.startsWith("Não foi possível")
    ) {
      return;
    }


    try {

      await navigator.clipboard
        .writeText(key);


      const original =
        copyKeyBtn.innerHTML;


      copyKeyBtn.innerHTML = `
        <svg viewBox="0 0 24 24">
          <path d="M5 12L10 17L19 7"/>
        </svg>
        Key copiada
      `;


      setTimeout(
        () => {

          copyKeyBtn.innerHTML =
            original;

        },
        1600
      );


    } catch (error) {

      console.error(
        "Erro ao copiar key:",
        error
      );

    }

  }
);


/* =========================================
   PIX
========================================= */

const pixKey =
  document.getElementById("pixKey");

const copyPixBtn =
  document.getElementById("copyPixBtn");

const copyPixMainBtn =
  document.getElementById(
    "copyPixMainBtn"
  );


async function copyPixKey(button) {

  if (!pixKey) {
    return;
  }


  const key =
    pixKey.textContent.trim();


  if (!key) {
    return;
  }


  try {

    await navigator.clipboard
      .writeText(key);


    if (!button) {
      return;
    }


    const original =
      button.innerHTML;


    button.classList.add(
      "success"
    );


    button.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M5 12L10 17L19 7"/>
      </svg>
      Copiado!
    `;


    setTimeout(
      () => {

        button.classList.remove(
          "success"
        );

        button.innerHTML =
          original;

      },
      1800
    );


  } catch (error) {

    console.error(
      "Erro ao copiar Pix:",
      error
    );

  }

}


copyPixBtn?.addEventListener(
  "click",
  () => {

    copyPixKey(copyPixBtn);

  }
);


copyPixMainBtn?.addEventListener(
  "click",
  () => {

    copyPixKey(
      copyPixMainBtn
    );

  }
);


/* =========================================
   RETORNO DO LOOTLABS
========================================= */

async function checkLootLabsStatus(token) {

  if (!token) {
    return false;
  }


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


    if (!response.ok) {

      throw new Error(
        data.error ||
        "Erro verificando o LootLabs."
      );

    }


    if (
      data.completed &&
      data.key
    ) {

      if (generatedKey) {

        generatedKey.textContent =
          data.key;

      }


      if (copyKeyBtn) {

        copyKeyBtn.disabled =
          false;

      }


      if (generateKeyBtn) {

        generateKeyBtn.disabled =
          false;

        generateKeyBtn.innerHTML = `
          <svg viewBox="0 0 24 24">
            <path d="M12 3L14 8L19 10L14 12L12 17L10 12L5 10L10 8L12 3Z"/>
          </svg>
          Gerar Key
        `;

      }


      return true;
    }


    if (generatedKey) {

      generatedKey.textContent =
        "Aguardando confirmação do LootLabs...";

    }


    return false;


  } catch (error) {

    console.error(
      "Erro verificando LootLabs:",
      error
    );

    return false;
  }

}


async function startLootLabsPolling(token) {

  if (!token) {
    return;
  }


  if (lootlabsPolling) {

    clearInterval(
      lootlabsPolling
    );

    lootlabsPolling = null;

  }


  let attempts = 0;

  /*
   * Faz uma verificação imediatamente.
   */

  const completed =
    await checkLootLabsStatus(
      token
    );


  if (completed) {
    return;
  }


  /*
   * Depois verifica a cada 3 segundos.
   */

  lootlabsPolling =
    setInterval(
      async () => {

        attempts++;


        const completed =
          await checkLootLabsStatus(
            token
          );


        if (completed) {

          clearInterval(
            lootlabsPolling
          );

          lootlabsPolling =
            null;

          return;

        }


        /*
         * 60 tentativas =
         * aproximadamente 3 minutos.
         */

        if (attempts >= 60) {

          clearInterval(
            lootlabsPolling
          );

          lootlabsPolling =
            null;


          if (generatedKey) {

            generatedKey.textContent =
              "Não foi possível confirmar a conclusão. Tente novamente.";

          }


          if (generateKeyBtn) {

            generateKeyBtn.disabled =
              false;

            generateKeyBtn.innerHTML = `
              <svg viewBox="0 0 24 24">
                <path d="M12 3L14 8L19 10L14 12L12 17L10 12L5 10L10 8L12 3Z"/>
              </svg>
              Tentar novamente
            `;

          }

        }

      },
      3000
    );

}


/* =========================================
   CALLBACKS
========================================= */

const params =
  new URLSearchParams(
    window.location.search
  );


/*
 * Retorno do LootLabs.
 */

if (
  params.get("lootlabs") ===
  "return"
) {

  const token =
    params.get("token");


  /*
   * Limpa a URL.
   */

  window.history.replaceState(
    {},
    document.title,
    window.location.pathname
  );


  /*
   * Abre a página Obter Key.
   */

  openPage("key");


  /*
   * Mostra estado de verificação.
   */

  if (generatedKey) {

    generatedKey.textContent =
      "Verificando conclusão...";

  }


  if (copyKeyBtn) {

    copyKeyBtn.disabled =
      true;

  }


  if (generateKeyBtn) {

    generateKeyBtn.disabled =
      true;

    generateKeyBtn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M12 3L14 8L19 10L14 12L12 17L10 12L12 17L10 12L5 10L10 8L12 3Z"/>
      </svg>
      Verificando...
    `;

  }


  /*
   * Começa a verificar se o LootLabs
   * confirmou a conclusão.
   */

  if (token) {

    startLootLabsPolling(
      token
    );

  } else {

    if (generatedKey) {

      generatedKey.textContent =
        "Sessão LootLabs inválida.";

    }


    if (generateKeyBtn) {

      generateKeyBtn.disabled =
        false;

      generateKeyBtn.innerHTML = `
        <svg viewBox="0 0 24 24">
          <path d="M12 3L14 8L19 10L14 12L12 17L10 12L12 17L10 12L5 10L10 8L12 3Z"/>
        </svg>
        Gerar Key
      `;

    }

  }


/*
 * Retorno do Discord.
 */

} else if (
  params.get("discord") ===
  "connected"
) {

  window.history.replaceState(
    {},
    document.title,
    window.location.pathname
  );


  openPage("key");


  loadDiscord();


} else {

  loadDiscord();

}
