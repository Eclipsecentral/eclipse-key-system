const navItems = document.querySelectorAll(".nav-item");
const pages = document.querySelectorAll(".page");

const sidebar = document.getElementById("sidebar");
const menuBtn = document.getElementById("menuBtn");
const menuOverlay = document.getElementById("menuOverlay");

const discordStatus = document.getElementById("discordStatus");
const discordUser = document.getElementById("discordUser");

const discordLoginBtn = document.getElementById("discordLoginBtn");
const discordLogoutBtn = document.getElementById("discordLogoutBtn");

const generateKeyBtn = document.getElementById("generateKeyBtn");
const copyKeyBtn = document.getElementById("copyKeyBtn");
const generatedKey = document.getElementById("generatedKey");


/* =========================================
   MENU MOBILE
========================================= */

function openMenu() {

  sidebar.classList.add("open");

  document.body.classList.add("menu-open");

  menuBtn?.setAttribute("aria-expanded", "true");
}


function closeMenu() {

  sidebar.classList.remove("open");

  document.body.classList.remove("menu-open");

  menuBtn?.setAttribute("aria-expanded", "false");
}


function toggleMenu() {

  if (sidebar.classList.contains("open")) {
    closeMenu();
  } else {
    openMenu();
  }

}


menuBtn?.addEventListener("click", toggleMenu);


/*
 * Clique/touch FORA das categorias.
 */
menuOverlay?.addEventListener("click", closeMenu);


/*
 * Se clicar diretamente no conteúdo enquanto
 * o menu estiver aberto, também fecha.
 */
document.querySelector(".content")?.addEventListener("click", () => {

  if (sidebar.classList.contains("open")) {
    closeMenu();
  }

});


/*
 * ESC fecha o menu.
 */
document.addEventListener("keydown", event => {

  if (event.key === "Escape") {
    closeMenu();
  }

});


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

  item.addEventListener("click", () => {

    openPage(item.dataset.page);

  });

});


document.querySelectorAll("[data-page]").forEach(element => {

  if (element.classList.contains("nav-item")) {
    return;
  }

  element.addEventListener("click", () => {

    openPage(element.dataset.page);

  });

});


/* =========================================
   BRILHO DOS CARDS
========================================= */

const shineCards = document.querySelectorAll(".shine-card");


shineCards.forEach(card => {

  let touchLock = false;


  function triggerShine() {

    if (touchLock) {
      return;
    }

    touchLock = true;

    card.classList.remove("shine-active");

    /*
     * Força o navegador a reiniciar
     * a animação.
     */
    void card.offsetWidth;

    card.classList.add("shine-active");

    setTimeout(() => {

      card.classList.remove("shine-active");

    }, 800);

  }


  /*
   * Mouse:
   * um brilho por entrada no card.
   */
  card.addEventListener("mouseenter", () => {

    triggerShine();

  });


  /*
   * Ao sair, libera para o próximo passe.
   */
  card.addEventListener("mouseleave", () => {

    touchLock = false;

  });


  /*
   * Celular:
   * um brilho por toque no card.
   */
  card.addEventListener(
    "touchstart",
    () => {

      triggerShine();

      setTimeout(() => {

        touchLock = false;

      }, 500);

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

  if (!discordStatus || !discordUser) {
    return;
  }


  try {

    const response = await fetch(
      "/api/discord/me",
      {
        credentials: "include",
        cache: "no-store"
      }
    );


    const data = await response.json();


    if (!data.authenticated) {

      discordStatus.textContent =
        "Discord não conectado";

      discordUser.textContent =
        "Conecte sua conta para continuar.";


      if (discordLoginBtn) {

        discordLoginBtn.hidden = false;

        discordLoginBtn.disabled = false;

        discordLoginBtn.textContent =
          "Conectar Discord";

        discordLoginBtn.style.opacity = "";

        discordLoginBtn.style.cursor = "pointer";

      }


      if (discordLogoutBtn) {
        discordLogoutBtn.hidden = true;
      }


      return;
    }


    const user = data.user;


    discordStatus.textContent =
      "Discord conectado";


    discordUser.textContent =
      user.global_name ||
      user.username ||
      user.id;


    if (discordLoginBtn) {

      discordLoginBtn.hidden = true;

      discordLoginBtn.disabled = true;

    }


    if (discordLogoutBtn) {
      discordLogoutBtn.hidden = false;
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


    discordLogoutBtn.disabled = true;

    discordLogoutBtn.textContent =
      "Desvinculando...";


    try {

      const response = await fetch(
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


      generatedKey.textContent =
        "Aguardando geração...";

      copyKeyBtn.disabled = true;


      await loadDiscord();


    } catch (error) {

      console.error(
        "Erro ao desvincular:",
        error
      );


      discordLogoutBtn.textContent =
        "Erro";

      setTimeout(() => {

        discordLogoutBtn.textContent =
          originalText;

        discordLogoutBtn.disabled = false;

      }, 1500);


      return;

    }


    discordLogoutBtn.textContent =
      "Desvinculada";

    discordLogoutBtn.disabled = false;


    setTimeout(() => {

      discordLogoutBtn.textContent =
        "Desvincular";

    }, 1400);

  }
);


/* =========================================
   GERAR KEY
========================================= */

generateKeyBtn?.addEventListener(
  "click",
  async () => {

    generateKeyBtn.disabled = true;


    generateKeyBtn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M12 3L14 8L19 10L14 12L12 17L10 12L5 10L10 8L12 3Z"/>
      </svg>
      Gerando...
    `;


    try {

      /*
       * A key é gerada no backend.
       * Não existe geração falsa no navegador.
       */
      const response = await fetch(
        "/api/keys/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
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
          "Não foi possível gerar a key."
        );

      }


      generatedKey.textContent =
        data.key;


      copyKeyBtn.disabled = false;


    } catch (error) {

      console.error(
        "Erro ao gerar key:",
        error
      );


      generatedKey.textContent =
        error.message ||
        "Erro ao gerar key.";

      copyKeyBtn.disabled = true;


    } finally {

      generateKeyBtn.disabled = false;


      generateKeyBtn.innerHTML = `
        <svg viewBox="0 0 24 24">
          <path d="M12 3L14 8L19 10L14 12L12 17L10 12L5 10L10 8L12 3Z"/>
        </svg>
        Gerar Key
      `;

    }

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
      key.startsWith("Erro")
    ) {
      return;
    }


    try {

      await navigator.clipboard.writeText(
        key
      );


      const original =
        copyKeyBtn.innerHTML;


      copyKeyBtn.innerHTML = `
        <svg viewBox="0 0 24 24">
          <path d="M5 12L10 17L19 7"/>
        </svg>
        Key copiada
      `;


      setTimeout(() => {

        copyKeyBtn.innerHTML =
          original;

      }, 1600);


    } catch (error) {

      console.error(
        "Erro ao copiar key:",
        error
      );

    }

  }
);


/* =========================================
   DISCORD CALLBACK
========================================= */

const params =
  new URLSearchParams(
    window.location.search
  );


if (
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
