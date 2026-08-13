import {
  checkPix,
  createPix,
  formatDocument,
  formatPhone,
  storeLead,
} from "/assets/funnel-common.js";

const WAIT_MS = 5 * 60 * 1000;
const CHECK_INTERVAL_MS = 5000;
const FAST_PROGRESS_MS = 15 * 1000;
const FAST_PROGRESS_TARGET = 35;
const POPUP_DELAY_MS = 90 * 1000;
const THANK_YOU_URL = "/obrigado/";
const BACK_OFFER_URL = "/contribuir/";

const state = {
  lead: null,
  pixId: null,
  startedAt: null,
  progressTimer: null,
  checkTimer: null,
  popupTimer: null,
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
const supportPopup = document.querySelector("#support-popup");
const popupClose = document.querySelector("#popup-close");
const popupAction = document.querySelector("#popup-action");

function setProgress(percent) {
  const value = Math.max(0, Math.min(100, percent));
  progressBar.style.transform = `scaleX(${value / 100})`;
  progressLabel.textContent = `${Math.round(value)}%`;
}

function finishProgress() {
  clearInterval(state.progressTimer);
  clearInterval(state.checkTimer);
  clearTimeout(state.popupTimer);
  setProgress(100);
  complete.classList.remove("hidden");
  if (pixStatus) pixStatus.textContent = "Pagamento confirmado. Material liberado.";
  window.location.href = THANK_YOU_URL;
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

  clearTimeout(state.popupTimer);
  state.popupTimer = setTimeout(() => {
    supportPopup.classList.remove("hidden");
  }, POPUP_DELAY_MS);
}

function armBackRedirect() {
  history.pushState({ checkoutLock: true }, "", window.location.href);
  window.addEventListener("popstate", () => {
    window.location.href = BACK_OFFER_URL;
  });
}

documentInput.addEventListener("input", () => {
  documentInput.value = formatDocument(documentInput.value);
});

phoneInput.addEventListener("input", () => {
  phoneInput.value = formatPhone(phoneInput.value);
});

popupClose.addEventListener("click", () => {
  supportPopup.classList.add("hidden");
});

popupAction.addEventListener("click", () => {
  supportPopup.classList.add("hidden");
  amounts.scrollIntoView({ behavior: "smooth", block: "center" });
});

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

  storeLead(state.lead);
  leadForm.classList.add("is-complete");
  releaseBlock.classList.remove("hidden");
  releaseBlock.scrollIntoView({ behavior: "smooth", block: "start" });
  armBackRedirect();
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
    const data = await createPix({
      amount: Number(button.dataset.amount),
      lead: state.lead,
    });

    state.pixId = data.id;
    pixCode.value = data.pixCode || "";
    pixStatus.textContent = "Pix gerado. Após a confirmação, seu material será liberado automaticamente.";

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
    const data = await checkPix(state.pixId);

    if (data.paid) {
      finishProgress();
    }
  } catch {
    // Mantem a barra rodando mesmo se uma checagem falhar.
  }
}
