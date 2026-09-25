const menuButton =
  document.getElementById("menuButton");

const sidebar =
  document.getElementById("sidebar");

const overlay =
  document.getElementById("overlay");

const navItems =
  document.querySelectorAll(".nav-item");

const pageButtons =
  document.querySelectorAll(
    "[data-page-button]"
  );


/* =========================
   PÁGINAS
========================= */

const pages = {
  home:
    document.getElementById("homePage"),

  discord:
    document.getElementById("discordPage"),

  key:
    document.getElementById("keyPage"),

  shop:
    document.getElementById("shopPage")
};


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


menuButton.addEventListener(
  "click",
  () => {

    if (
      sidebar.classList.contains("open")
    ) {

      closeMenu();

    } else {

      openMenu();

    }

  }
);


overlay.addEventListener(
  "click",
  closeMenu
);


/* =========================
   NAVEGAÇÃO
========================= */

function navigate(pageName) {

  if (!pages[pageName]) return;


  Object.values(pages).forEach(
    page => {

      page.classList.remove(
        "active-page"
      );

    }
  );


  pages[pageName].classList.add(
    "active-page"
  );


  navItems.forEach(item => {

    item.classList.toggle(
      "active",
      item.dataset.page === pageName
    );

  });


  closeMenu();


  if (pageName === "key") {

    checkDiscord();

  }

}


navItems.forEach(item => {

  item.addEventListener(
    "click",
    () => {

      navigate(
        item.dataset.page
      );

    }
  );

});


pageButtons.forEach(button => {

  button.addEventListener(
    "click",
    () => {

      navigate(
        button.dataset.pageButton
      );

    }
  );

});


/* =========================
   DISCORD
========================= */

let currentUser = null;


const discordStatus =
  document.getElementById(
    "discordStatus"
  );


async function checkDiscord() {

  if (!discordStatus) return;


  discordStatus.textContent =
    "Verificando Discord...";


  try {

    const response =
      await fetch(
        "/api/discord/me",
        {
          credentials: "include"
        }
      );


    const data =
      await response.json();


    if (
      !data.authenticated
    ) {

      currentUser = null;

      discordStatus.textContent =
        "Discord não conectado";

      discordStatus.classList.remove(
        "connected"
      );

      return;

    }


    currentUser = data.user;


    discordStatus.textContent =
      `● Discord conectado como ${
        data.user.global_name ||
        data.user.username
      }`;


    discordStatus.classList.add(
      "connected"
    );


  } catch (error) {

    console.error(error);

    discordStatus.textContent =
      "Erro ao verificar Discord";

  }

}


/* =========================
   GERAR KEY
========================= */

const generateButton =
  document.getElementById(
    "generateButton"
  );


const keyResult =
  document.getElementById(
    "keyResult"
  );


const generatedKey =
  document.getElementById(
    "generatedKey"
  );


const status =
  document.getElementById(
    "status"
  );


if (generateButton) {

  generateButton.addEventListener(
    "click",
    async () => {

      /*
       * Se não estiver conectado,
       * manda para o Discord.
       */

      if (!currentUser) {

        window.location.href =
          "/api/discord/login";

        return;

      }


      generateButton.disabled =
        true;

      status.textContent =
        "Gerando sua Key...";


      try {

        const response =
          await fetch(
            "/api/keys/generate",
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


        if (!response.ok) {

          throw new Error(
            data.error ||
            "Não foi possível gerar a Key."
          );

        }


        generatedKey.textContent =
          data.key;


        keyResult.classList.remove(
          "hidden"
        );


        status.textContent =
          "Sua Key foi gerada com sucesso.";


      } catch (error) {

        console.error(error);

        status.textContent =
          error.message ||
          "Erro ao gerar a Key.";

      } finally {

        generateButton.disabled =
          false;

      }

    }
  );

}


/* =========================
   COPIAR KEY
========================= */

const copyKey =
  document.getElementById(
    "copyKey"
  );


if (copyKey) {

  copyKey.addEventListener(
    "click",
    async () => {

      const key =
        generatedKey.textContent;


      try {

        await navigator.clipboard
          .writeText(key);


        copyKey.textContent =
          "Copiado!";


        setTimeout(() => {

          copyKey.textContent =
            "Copiar";

        }, 1500);


      } catch {

        copyKey.textContent =
          "Erro";

      }

    }
  );

}


/* =========================
   INICIALIZAÇÃO
========================= */

checkDiscord();
