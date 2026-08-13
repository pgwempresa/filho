const required = ["XPAG_BASE_URL", "XPAG_CLIENT_ID", "XPAG_CLIENT_SECRET"];

function assertEnv() {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Configure na Vercel: ${missing.join(", ")}`);
  }
}

function xpagHeaders() {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Client-Id": process.env.XPAG_CLIENT_ID,
    "X-Client-Secret": process.env.XPAG_CLIENT_SECRET,
  };
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Metodo nao permitido." });
    return;
  }

  try {
    assertEnv();

    const { amount, lead } = request.body || {};
    if (!amount || !lead?.name || !lead?.email || !lead?.document || !lead?.phone) {
      response.status(400).json({ error: "Dados incompletos." });
      return;
    }

    const externalId = `protocolo-21-dias-${Date.now()}`;
    const pixResponse = await fetch(`${process.env.XPAG_BASE_URL}/cashin`, {
      method: "POST",
      headers: xpagHeaders(),
      body: JSON.stringify({
        currency: "BRL",
        amount: Number(amount),
        name: lead.name,
        document: String(lead.document).replace(/\D/g, ""),
        email: lead.email,
        phone: String(lead.phone).replace(/\D/g, ""),
        description: "Protocolo 21 Dias",
        external_id: externalId,
      }),
    });

    const data = await pixResponse.json().catch(() => ({}));
    if (!pixResponse.ok) {
      throw new Error(data.message || data.error || "Falha ao gerar Pix.");
    }

    response.status(200).json({
      id: data.request_number || data.transaction_id || data.id || data.txid || externalId,
      pixCode: data.copyPaste || data.pix_code || data.copy_paste || data.qr_code || data.code,
      qrCodeImage: data.qr_img || data.qr_url || data.qr_code_image || data.qrcode_image || data.qr_code_base64,
      raw: data,
    });
  } catch (error) {
    response.status(500).json({ error: error.message || "Erro interno." });
  }
}
