const WAIT_MS = 5 * 60 * 1000;
const CHECK_INTERVAL_MS = 5000;

const state = {
  lead: null,
  pixId: null,
  startedAt: null,
  progressTimer: null,
  checkTimer: null,
};

const leadPanel = document.querySelector("#lead-panel");
const waitPanel = document.querySelector("#wait-panel");
const leadForm = document.querySelector("#lead-form");
const progressBar = document.querySelector("#progress-bar");
const progressLabel = document.querySelector("#progress-label");
const timeLeft = document.querySelector("#time-left");
const amounts = document.querySelector("#amounts");
const pixBox = document.querySelector("#pix-box");
const pixStatus = document.querySelector("#pix-status");
const pixQr = document.querySelector("#pix-qr");
const pixCode = document.querySelector("#pix-code");
const copyPix = document.querySelector("#copy-pix");
const complete = document.querySelector("#complete");

function formatTime(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function setProgress(percent) {
  const value = Math.max(0, Math.min(100, percent));
  progressBar.style.transform = `scaleX(${value / 100})`;
  progressLabel.textContent = `${Math.round(value)}%`;
}

function finishProgress() {
  clearInterval(state.progressTimer);
  clearInterval(state.checkTimer);
  setProgress(100);
  timeLeft.textContent = "0:00";
  complete.classList.remove("hidden");
  pixStatus.textContent = "Pagamento confirmado. Material liberado.";
}

function startProgress() {
  state.startedAt = Date.now();
  setProgress(0);
  timeLeft.textContent = "5:00";

  state.progressTimer = setInterval(() => {
    const elapsed = Date.now() - state.startedAt;
    const percent = (elapsed / WAIT_MS) * 100;
    setProgress(percent);
    timeLeft.textContent = formatTime(WAIT_MS - elapsed);

    if (elapsed >= WAIT_MS) {
      finishProgress();
    }
  }, 1000);
}

leadForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(leadForm);
  state.lead = {
    name: String(form.get("name") || "").trim(),
    email: String(form.get("email") || "").trim(),
    phone: String(form.get("phone") || "").trim(),
  };

  leadPanel.classList.add("hidden");
  waitPanel.classList.remove("hidden");
  startProgress();
});

amounts.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-amount]");
  if (!button || !state.lead) return;

  amounts.querySelectorAll("button").forEach((item) => item.classList.remove("selected"));
  button.classList.add("selected");

  pixBox.classList.remove("hidden");
  pixQr.classList.add("hidden");
  pixCode.value = "";
  pixStatus.textContent = "Gerando Pix...";

  try {
    const response = await fetch("/api/create-pix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(button.dataset.amount),
        lead: state.lead,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Falha ao gerar Pix.");

    state.pixId = data.id;
    pixCode.value = data.pixCode || "";
    pixStatus.textContent = "Pix gerado. Você continua na fila de liberação.";

    if (data.qrCodeImage) {
      pixQr.src = data.qrCodeImage;
      pixQr.classList.remove("hidden");
    }

    clearInterval(state.checkTimer);
    state.checkTimer = setInterval(checkPixStatus, CHECK_INTERVAL_MS);
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
  if (!state.pixId) return;

  try {
    const response = await fetch(`/api/check-pix?id=${encodeURIComponent(state.pixId)}`);
    const data = await response.json();
    if (!response.ok) return;

    if (data.paid) {
      finishProgress();
    }
  } catch {
    // Mantem a barra rodando mesmo se uma checagem falhar.
  }
}
