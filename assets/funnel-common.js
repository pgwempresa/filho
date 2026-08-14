export const MATERIAL_URL =
  "https://drive.google.com/drive/folders/14_J6WqvRbAFCJQOyklYcQRmsz3RxMALy?usp=sharing";

export const STORAGE_KEY = "protocolo21Lead";
export const META_PIXEL_ID = "1368620035400609";

export function onlyDigits(value, limit) {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, limit);
}

export function formatDocument(value) {
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

export function formatPhone(value) {
  const digits = onlyDigits(value, 11);

  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }

  return digits.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

export function getCookie(name) {
  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.split("=")
    .slice(1)
    .join("=") || "";
}

export function getStoredLead() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

export function storeLead(lead) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lead));
}

export function enrichLead(lead) {
  return {
    ...lead,
    fbp: getCookie("_fbp"),
    fbc: getCookie("_fbc"),
  };
}

export function trackBrowserPurchase({ amount, eventId }) {
  if (typeof window === "undefined" || typeof window.fbq !== "function" || !eventId) return;

  window.fbq(
    "track",
    "Purchase",
    {
      currency: "BRL",
      value: Number(amount),
      content_name: "Protocolo 21 Dias",
    },
    { eventID: eventId },
  );
}

export async function createPix({ amount, lead }) {
  const response = await fetch("/api/create-pix", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: Number(amount),
      lead: enrichLead(lead),
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Falha ao gerar Pix.");
  trackBrowserPurchase({ amount, eventId: data.eventId });
  return data;
}

export async function checkPix(id) {
  const response = await fetch(`/api/check-pix?id=${encodeURIComponent(id)}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Falha ao consultar Pix.");
  return data;
}
