const button = document.getElementById("getKey");
const status = document.getElementById("status");

button.addEventListener("click", async () => {
  button.disabled = true;
  status.textContent = "Preparando seu acesso...";

  try {
    const response = await fetch("/api/status");
    const data = await response.json();

    if (data.online) {
      status.textContent = "Sistema online. A integração com LootLabs será adicionada na próxima etapa.";
    } else {
      status.textContent = "Sistema indisponível.";
    }
  } catch {
    status.textContent = "Não foi possível conectar ao servidor.";
  } finally {
    button.disabled = false;
  }
});
