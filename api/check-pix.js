const paidStatuses = new Set(["paid", "approved", "completed", "confirmed", "settled"]);

function xpagHeaders() {
  return {
    Accept: "application/json",
    "X-Client-Id": process.env.XPAG_CLIENT_ID,
    "X-Client-Secret": process.env.XPAG_CLIENT_SECRET,
  };
}

export default async function handler(request, response) {
  try {
    const { id } = request.query || {};
    if (!id) {
      response.status(400).json({ error: "ID ausente." });
      return;
    }

    const queryKey = String(id).startsWith("protocolo-21-dias-") ? "external_id" : "request_number";
    const statusResponse = await fetch(
      `${process.env.XPAG_BASE_URL}/consult-transaction?${queryKey}=${encodeURIComponent(id)}`,
      { headers: xpagHeaders() },
    );

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
