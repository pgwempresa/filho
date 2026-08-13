const paidStatuses = new Set(["paid", "approved", "completed", "confirmed", "settled"]);

async function getToken() {
  const response = await fetch(`${process.env.XPAG_BASE_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: process.env.XPAG_CLIENT_ID,
      client_secret: process.env.XPAG_CLIENT_SECRET,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || "Falha ao autenticar.");
  return data.access_token || data.token;
}

export default async function handler(request, response) {
  try {
    const { id } = request.query || {};
    if (!id) {
      response.status(400).json({ error: "ID ausente." });
      return;
    }

    const token = await getToken();
    const statusResponse = await fetch(`${process.env.XPAG_BASE_URL}/pix/cash-in/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await statusResponse.json().catch(() => ({}));
    if (!statusResponse.ok) {
      throw new Error(data.message || data.error || "Falha ao consultar Pix.");
    }

    const status = String(data.status || data.payment_status || "").toLowerCase();
    response.status(200).json({
      paid: paidStatuses.has(status),
      status,
      raw: data,
    });
  } catch (error) {
    response.status(500).json({ error: error.message || "Erro interno." });
  }
}
