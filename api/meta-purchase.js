function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

async function sha256(value) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function getClientIp(request) {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return request.headers["x-real-ip"] || "";
}

async function buildUserData(lead, request) {
  const document = String(lead?.document || "").replace(/\D/g, "");
  const phone = String(lead?.phone || "").replace(/\D/g, "");
  const [firstName = "", ...lastNameParts] = normalize(lead?.name).split(/\s+/).filter(Boolean);
  const lastName = lastNameParts.join(" ");

  const userData = {
    client_user_agent: request.headers["user-agent"] || "",
    client_ip_address: getClientIp(request),
  };

  if (lead?.email) userData.em = [await sha256(normalize(lead.email))];
  if (phone) userData.ph = [await sha256(phone)];
  if (document) userData.external_id = [await sha256(document)];
  if (firstName) userData.fn = [await sha256(firstName)];
  if (lastName) userData.ln = [await sha256(lastName)];
  if (lead?.fbp) userData.fbp = lead.fbp;
  if (lead?.fbc) userData.fbc = lead.fbc;

  return userData;
}

export async function sendMetaPurchase({ amount, lead, request, eventId }) {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;

  if (!pixelId || !accessToken) {
    return { skipped: true, reason: "META_PIXEL_ID/META_ACCESS_TOKEN ausente" };
  }

  const payload = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: "website",
        event_source_url: request.headers.referer || "",
        user_data: await buildUserData(lead, request),
        custom_data: {
          currency: "BRL",
          value: Number(amount),
          content_name: "Protocolo 21 Dias",
        },
      },
    ],
  };

  const metaResponse = await fetch(
    `https://graph.facebook.com/v20.0/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(accessToken)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  const data = await metaResponse.json().catch(() => ({}));
  return {
    ok: metaResponse.ok,
    status: metaResponse.status,
    data,
  };
}
