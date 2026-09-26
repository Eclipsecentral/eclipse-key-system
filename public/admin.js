const statusElement =
  document.getElementById("status");

const toggleButton =
  document.getElementById("toggleSite");

const logsElement =
  document.getElementById("logs");

const refreshButton =
  document.getElementById("refresh");

const logoutButton =
  document.getElementById("logout");

let siteEnabled = true;


// =====================================
// VERIFICA STATUS
// =====================================

async function loadStatus() {

  const response =
    await fetch(
      "/api/admin/site",
      {
        credentials: "include"
      }
    );

  const data =
    await response.json();

  if (!response.ok) {

    if (response.status === 401) {
      window.location.href =
        "/api/discord/login";
      return;
    }

    if (response.status === 403) {
      document.body.innerHTML = `
        <div style="
          display:flex;
          min-height:100vh;
          align-items:center;
          justify-content:center;
          background:#050608;
          color:white;
          font-family:Arial;
          text-align:center;
          padding:20px;
        ">
          <div>
            <h1>Acesso negado</h1>
            <p>Esta conta Discord não possui acesso ao painel.</p>
          </div>
        </div>
      `;

      return;
    }

    throw new Error(
      data.error ||
      "Erro ao carregar status."
    );
  }

  siteEnabled =
    data.site_enabled;

  renderStatus();
}


// =====================================
// RENDER STATUS
// =====================================

function renderStatus() {

  if (siteEnabled) {

    statusElement.textContent =
      "● SITE ONLINE";

    statusElement.className =
      "status online";

    toggleButton.textContent =
      "Desligar site";

    toggleButton.className =
      "toggle";

  } else {

    statusElement.textContent =
      "● SITE OFFLINE";

    statusElement.className =
      "status offline";

    toggleButton.textContent =
      "Ligar site";

    toggleButton.className =
      "toggle off";
  }
}


// =====================================
// LIGA / DESLIGA
// =====================================

toggleButton.addEventListener(
  "click",
  async () => {

    toggleButton.disabled =
      true;

    try {

      const response =
        await fetch(
          "/api/admin/site",
          {
            method:
              "POST",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                enabled:
                  !siteEnabled
              })
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          "Não foi possível alterar o site."
        );
      }

      siteEnabled =
        data.site_enabled;

      renderStatus();

    } catch (error) {

      alert(
        error.message
      );

    } finally {

      toggleButton.disabled =
        false;
    }
  }
);


// =====================================
// LOGS
// =====================================

async function loadLogs() {

  logsElement.textContent =
    "Carregando...";

  try {

    const response =
      await fetch(
        "/api/admin/logs",
        {
          credentials:
            "include"
        }
      );

    const data =
      await response.json();

    if (!response.ok) {

      if (response.status === 401) {
        window.location.href =
          "/api/discord/login";
        return;
      }

      throw new Error(
        data.error ||
        "Erro ao carregar logs."
      );
    }

    renderLogs(
      data.logs || []
    );

  } catch (error) {

    logsElement.innerHTML = `
      <div class="empty">
        ${escapeHtml(
          error.message
        )}
      </div>
    `;
  }
}


// =====================================
// RENDER LOGS
// =====================================

function renderLogs(logs) {

  if (!logs.length) {

    logsElement.innerHTML = `
      <div class="empty">
        Nenhuma Key registrada ainda.
      </div>
    `;

    return;
  }

  logsElement.innerHTML =
    logs.map(log => {

      const date =
        new Date(
          log.created_at
        );

      return `
        <div class="log">

          <div class="log-key">
            ${escapeHtml(
              log.chave
            )}
          </div>

          <div class="log-discord">
            Discord:
            <strong>
              ${escapeHtml(
                log.discord_nick
              )}
            </strong>

            <br>

            ID:
            ${escapeHtml(
              log.discord_id
            )}
          </div>

          <div class="log-date">
            ${date.toLocaleString(
              "pt-BR"
            )}
          </div>

        </div>
      `;

    }).join("");
}


// =====================================
// ATUALIZAR
// =====================================

refreshButton.addEventListener(
  "click",
  () => {
    loadLogs();
  }
);


// =====================================
// LOGOUT
// =====================================

logoutButton.addEventListener(
  "click",
  async () => {

    await fetch(
      "/api/discord/logout",
      {
        method:
          "POST",

        credentials:
          "include"
      }
    );

    window.location.href =
      "/";
  }
);


// =====================================
// ESCAPE HTML
// =====================================

function escapeHtml(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


// =====================================
// INICIALIZA
// =====================================

loadStatus();
loadLogs();
