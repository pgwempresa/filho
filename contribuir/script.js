import { checkPix, createPix, getStoredLead } from "/assets/funnel-common.js";

const CHECK_INTERVAL_MS = 5000;
const THANK_YOU_URL = "/obrigado/";

const lead = getStoredLead();

if (!lead?.name || !lead?.email || !lead?.document || !lead?.phone) {
  window.location.href = "/pagina-03/";
}

let pixId = null;
let checkTimer = null;

const amounts = document.querySelector("#amounts");
const pixBox = document.querySelector("#pix-box");
const pixStatus = document.querySelector("#pix-status");
const pixQr = document.querySelector("#pix-qr");
const pixCode = document.querySelector("#pix-code");
const copyPix = document.querySelector("#copy-pix");

amounts.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-amount]");
  if (!button) return;

  amounts.querySelectorAll("button").forEach((item) => item.classList.remove("selected"));
  button.classList.add("selected");

  pixBox.classList.remove("hidden");
  pixQr.classList.add("hidden");
  pixCode.value = "";
  pixStatus.textContent = "Gerando Pix...";

  try {
    const data = await createPix({
      amount: Number(button.dataset.amount),
      lead,
    });

    pixId = data.id;
    pixCode.value = data.pixCode || "";
    pixStatus.textContent = "Pix gerado. O download será liberado automaticamente após a confirmação.";

    if (data.qrCodeImage) {
      pixQr.src = data.qrCodeImage;
      pixQr.classList.remove("hidden");
    }

    clearInterval(checkTimer);
    checkTimer = setInterval(checkPixStatus, CHECK_INTERVAL_MS);
  } catch (error) {
    pixStatus.textContent = error.message || "Não foi possível gerar o Pix agora.";
  }
});

copyPix.addEventListener("click", async () => {
  if (!pixCode.value) return;
  await navigator.clipboard.writeText(pixCode.value);
  copyPix.textContent = "Código copiado";
  setTimeout(() => {
    copyPix.textContent = "Copiar código Pix";
  }, 1800);
});

async function checkPixStatus() {
  if (!pixId) return;

  try {
    const data = await checkPix(pixId);

    if (data.paid) {
      clearInterval(checkTimer);
      window.location.href = THANK_YOU_URL;
    }
  } catch {
    // Mantem consulta ativa mesmo se uma checagem falhar.
  }
}
