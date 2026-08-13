const required = ["XPAG_BASE_URL", "XPAG_CLIENT_ID", "XPAG_CLIENT_SECRET"];

function assertEnv() {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Configure na Vercel: ${missing.join(", ")}`);
  }
}

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
  if (!response.ok) {
    throw new Error(data.message || data.error || "Falha ao autenticar na XPag.");
  }

  return data.access_token || data.token;
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Metodo nao permitido." });
    return;
  }

  try {
    assertEnv();

    const { amount, lead } = request.body || {};
    if (!amount || !lead?.name || !lead?.email || !lead?.phone) {
      response.status(400).json({ error: "Dados incompletos." });
      return;
    }

    const token = await getToken();
    const pixResponse = await fetch(`${process.env.XPAG_BASE_URL}/pix/cash-in`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Number(amount),
        description: "Protocolo 21 Dias",
        external_id: `filho-${Date.now()}`,
        payer: {
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
        },
      }),
    });

    const data = await pixResponse.json().catch(() => ({}));
    if (!pixResponse.ok) {
      throw new Error(data.message || data.error || "Falha ao gerar Pix.");
    }

    response.status(200).json({
      id: data.id || data.transaction_id || data.txid || data.uuid,
      pixCode: data.pix_code || data.copy_paste || data.qr_code || data.emv,
      qrCodeImage: data.qr_code_image || data.qrcode_image || data.qr_code_base64,
      raw: data,
    });
  } catch (error) {
    response.status(500).json({ error: error.message || "Erro interno." });
  }
}
