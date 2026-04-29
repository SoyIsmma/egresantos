import { Router, type IRouter } from "express";

const router: IRouter = Router();

// ===== Firebase REST configuration (uses public Web API key; same project) =====
const FB_PROJECT = "egresantos-nights";
const FB_API_KEY = "AIzaSyA6zu8iS12VNlU-i7J8yJIc4IQZV4aM-m0";
const FB_REST = `https://firestore.googleapis.com/v1/projects/${FB_PROJECT}/databases/(default)/documents`;

const MP_BASE = "https://api.mercadopago.com";
const MP_TOKEN = process.env["MP_ACCESS_TOKEN"] ?? "";

const TOKEN_RE = /^ISM-\d{4}-[A-Z]{2}$/;

function publicBaseUrl(req: import("express").Request): string {
  const replitDomains = process.env["REPLIT_DOMAINS"]?.split(",")[0]?.trim();
  if (replitDomains) return `https://${replitDomains}`;
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}

// ===== Firestore REST helpers =====
type FsValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { timestampValue: string }
  | { mapValue: { fields: Record<string, FsValue> } };

function toFs(v: unknown): FsValue {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") {
    return Number.isInteger(v)
      ? { integerValue: String(v) }
      : { doubleValue: v };
  }
  return { stringValue: String(v) };
}

function fromFs(v: FsValue | undefined): unknown {
  if (!v) return undefined;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("timestampValue" in v) return v.timestampValue;
  return undefined;
}

async function findVentaByToken(
  token: string,
): Promise<{ id: string; data: Record<string, unknown> } | null> {
  const body = {
    structuredQuery: {
      from: [{ collectionId: "ventas" }],
      where: {
        fieldFilter: {
          field: { fieldPath: "token" },
          op: "EQUAL",
          value: { stringValue: token },
        },
      },
      limit: 1,
    },
  };
  const r = await fetch(`${FB_REST}:runQuery?key=${FB_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    throw new Error(`firestore_query_failed: ${r.status}`);
  }
  const rows = (await r.json()) as Array<{
    document?: { name: string; fields: Record<string, FsValue> };
  }>;
  for (const row of rows) {
    if (!row.document) continue;
    const id = row.document.name.split("/").pop()!;
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row.document.fields)) {
      data[k] = fromFs(v);
    }
    return { id, data };
  }
  return null;
}

async function patchVenta(
  id: string,
  updates: Record<string, unknown>,
): Promise<void> {
  const fieldPaths = Object.keys(updates);
  const params = new URLSearchParams();
  for (const fp of fieldPaths) params.append("updateMask.fieldPaths", fp);
  params.append("key", FB_API_KEY);
  const fields: Record<string, FsValue> = {};
  for (const [k, v] of Object.entries(updates)) fields[k] = toFs(v);
  const r = await fetch(
    `${FB_REST}/ventas/${encodeURIComponent(id)}?${params.toString()}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    },
  );
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`firestore_patch_failed: ${r.status} ${text}`);
  }
}

// ===== POST /api/mp/preference =====
// Body: { token, tipo, cantidad, total, nombre?, dni? }
// Returns: { init_point, sandbox_init_point, preference_id }
router.post("/mp/preference", async (req, res) => {
  try {
    if (!MP_TOKEN) {
      req.log.error("MP_ACCESS_TOKEN missing");
      return res.status(500).json({ error: "server_not_configured" });
    }
    const { token, tipo, cantidad, total, nombre, dni } = req.body ?? {};
    if (!token || !TOKEN_RE.test(String(token))) {
      return res.status(400).json({ error: "invalid_token" });
    }
    const tipoStr = String(tipo || "general").toLowerCase();
    const qty = Math.max(1, Number(cantidad || 1));
    const unit = Number(total) / qty;
    if (!Number.isFinite(unit) || unit <= 0) {
      return res.status(400).json({ error: "invalid_total" });
    }

    const base = publicBaseUrl(req);
    const successUrl = `${base}/success.html?token=${encodeURIComponent(token)}`;
    const notificationUrl = `${base}/api/mp/webhook`;

    const body = {
      items: [
        {
          id: `${tipoStr}-${token}`,
          title: `Entrada ${tipoStr.toUpperCase()} — EGRESANTOS`,
          description: `Token ${token}${nombre ? ` · ${nombre}` : ""}`,
          quantity: qty,
          currency_id: "ARS",
          unit_price: unit,
        },
      ],
      external_reference: token,
      statement_descriptor: "EGRESANTOS",
      back_urls: {
        success: successUrl,
        pending: successUrl,
        failure: successUrl,
      },
      auto_return: "approved",
      notification_url: notificationUrl,
      metadata: {
        token,
        tipo: tipoStr,
        dni: dni ?? null,
        nombre: nombre ?? null,
      },
    };

    const r = await fetch(`${MP_BASE}/checkout/preferences`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = (await r.json()) as Record<string, unknown>;
    if (!r.ok) {
      req.log.error({ status: r.status, data }, "MP preference create failed");
      return res.status(502).json({ error: "mp_error", detail: data });
    }

    return res.json({
      init_point: data["init_point"],
      sandbox_init_point: data["sandbox_init_point"],
      preference_id: data["id"],
    });
  } catch (err) {
    req.log.error({ err }, "preference create exception");
    return res.status(500).json({ error: "internal_error" });
  }
});

// ===== POST /api/mp/webhook =====
// Mercado Pago notification. We process "payment" topic and confirm by external_reference.
router.post("/mp/webhook", async (req, res) => {
  // Always 200 so MP doesn't retry
  res.status(200).json({ received: true });

  try {
    if (!MP_TOKEN) {
      req.log.error("MP webhook hit but MP_ACCESS_TOKEN missing");
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const q = req.query as Record<string, string | undefined>;
    const topic = String(
      body["type"] || body["topic"] || q["type"] || q["topic"] || "",
    );
    const dataObj = (body["data"] as Record<string, unknown>) || {};
    const paymentId = String(
      dataObj["id"] ?? body["id"] ?? q["id"] ?? q["data.id"] ?? "",
    );
    if (!paymentId) {
      req.log.warn({ body, query: q }, "MP webhook without paymentId");
      return;
    }
    if (topic && !["payment", "merchant_order"].includes(topic)) {
      req.log.info({ topic }, "MP webhook ignored (not a payment)");
      return;
    }

    const r = await fetch(
      `${MP_BASE}/v1/payments/${encodeURIComponent(paymentId)}`,
      { headers: { Authorization: `Bearer ${MP_TOKEN}` } },
    );
    if (!r.ok) {
      req.log.error({ status: r.status, paymentId }, "MP payment fetch failed");
      return;
    }
    const payment = (await r.json()) as Record<string, unknown>;
    const status = String(payment["status"] ?? "");
    const externalRef = String(payment["external_reference"] ?? "");
    const amount = Number(payment["transaction_amount"] ?? 0);
    const payerEmail =
      ((payment["payer"] as Record<string, unknown>)?.["email"] as string) ?? "";

    if (!externalRef || !TOKEN_RE.test(externalRef)) {
      req.log.warn(
        { externalRef, paymentId },
        "MP webhook: external_reference is not an EGRESANTOS token",
      );
      return;
    }
    if (status !== "approved") {
      req.log.info(
        { status, paymentId, externalRef },
        "MP webhook: payment not approved yet",
      );
      return;
    }

    const sale = await findVentaByToken(externalRef);
    if (!sale) {
      req.log.warn({ externalRef }, "MP webhook: no sale matches token");
      return;
    }
    if ((sale.data["estado"] as string) === "ingresado") {
      // Already used at the door — don't downgrade
      return;
    }
    await patchVenta(sale.id, {
      estado: "confirmada",
      metodo: "mercadopago",
      mpPaymentId: paymentId,
      mpAmount: amount,
      mpPayerEmail: payerEmail,
      mpConfirmedAt: new Date().toISOString(),
    });
    req.log.info(
      { token: externalRef, paymentId },
      "MP webhook: sale confirmed",
    );
  } catch (err) {
    req.log.error({ err }, "MP webhook handler exception");
  }
});

export default router;
