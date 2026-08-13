const WAIT_MS = 5 * 60 * 1000;
const CHECK_INTERVAL_MS = 5000;
const FAST_PROGRESS_MS = 15 * 1000;
const FAST_PROGRESS_TARGET = 35;

const state = {
  lead: null,
  pixId: null,
  startedAt: null,
  progressTimer: null,
  checkTimer: null,
};

const leadForm = document.querySelector("#lead-form");
const releaseBlock = document.querySelector("#release-block");
const progressBar = document.querySelector("#progress-bar");
const progressLabel = document.querySelector("#progress-label");
const amounts = document.querySelector("#amounts");
const pixBox = document.querySelector("#pix-box");
const pixStatus = document.querySelector("#pix-status");
const pixQr = document.querySelector("#pix-qr");
const pixCode = document.querySelector("#pix-code");
const copyPix = document.querySelector("#copy-pix");
const complete = document.querySelector("#complete");
const documentInput = leadForm.querySelector('input[name="document"]');
const phoneInput = leadForm.querySelector('input[name="phone"]');

function onlyDigits(value, limit) {
  return value.replace(/\D/g, "").slice(0, limit);
}

function formatDocument(value) {
  const digits = onlyDigits(value, 14);

  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
}

function formatPhone(value) {
  const digits = onlyDigits(value, 11);

  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }

  return digits.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

documentInput.addEventListener("input", () => {
  documentInput.value = formatDocument(documentInput.value);
});

phoneInput.addEventListener("input", () => {
  phoneInput.value = formatPhone(phoneInput.value);
});

function setProgress(percent) {
  const value = Math.max(0, Math.min(100, percent));
  progressBar.style.transform = `scaleX(${value / 100})`;
  progressLabel.textContent = `${Math.round(value)}%`;
}

function finishProgress() {
  clearInterval(state.progressTimer);
  clearInterval(state.checkTimer);
  setProgress(100);
  complete.classList.remove("hidden");
  pixStatus.textContent = "Pagamento confirmado. Material liberado.";
}

function startProgress() {
  state.startedAt = Date.now();
  setProgress(0);

  state.progressTimer = setInterval(() => {
    const elapsed = Date.now() - state.startedAt;
    const percent =
      elapsed <= FAST_PROGRESS_MS
        ? (elapsed / FAST_PROGRESS_MS) * FAST_PROGRESS_TARGET
        : FAST_PROGRESS_TARGET +
          ((elapsed - FAST_PROGRESS_MS) / (WAIT_MS - FAST_PROGRESS_MS)) * (100 - FAST_PROGRESS_TARGET);
    setProgress(percent);

    if (elapsed >= WAIT_MS) {
      finishProgress();
    }
  }, 1000);
}

leadForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!leadForm.reportValidity()) return;

  const form = new FormData(leadForm);
  state.lead = {
    name: String(form.get("name") || "").trim(),
    email: String(form.get("email") || "").trim(),
    document: String(form.get("document") || "").replace(/\D/g, ""),
    phone: String(form.get("phone") || "").replace(/\D/g, ""),
  };

  leadForm.classList.add("is-complete");
  releaseBlock.classList.remove("hidden");
  releaseBlock.scrollIntoView({ behavior: "smooth", block: "start" });
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
