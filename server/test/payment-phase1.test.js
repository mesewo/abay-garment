import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import express from "express";
import { webhookRouter } from "../routes/payment/paymentVerify.js";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("2-store checkout creates one shared tx_ref", async () => {
  const source = await read("../controllers/shop/order-controller.js");
  assert.match(source, /const tx_ref = `checkout_\$\{crypto\.randomUUID\(\)\}`;[\s\S]*?for \(const items of ordersMap\.values\(\)\)[\s\S]*?tx_ref,/);
});

test("cancelled or expired paid order attempts stock re-reservation and records refund need on failure", async () => {
  const source = await read("../routes/payment/paymentVerify.js");
  const initiate = await read("../routes/payment/payment.js");
  assert.match(initiate, /order\.orderStatus !== "pending" \|\| \(order\.expiresAt && order\.expiresAt <= now\)/);
  assert.match(source, /order\.stockReleased/);
  assert.match(source, /quantity: \{ \$gte: item\.quantity \}/);
  assert.match(source, /paymentStatus: "paid"[\s\S]*?needsRefund: true/);
});

test("verification is idempotent for orders already marked paid", async () => {
  const source = await read("../routes/payment/paymentVerify.js");
  assert.match(source, /if \(order\.paymentStatus === "paid"\) continue/);
});

test("verification rejects underpayment while allowing one cent tolerance", async () => {
  const source = await read("../routes/payment/paymentVerify.js");
  assert.match(source, /roundedPaidAmount - total\)\.toFixed\(2\)\) < -0\.01/);
});

test("webhook checks that express.raw delivered a Buffer before parsing", async () => {
  const priorSecret = process.env.CHAPA_WEBHOOK_SECRET;
  process.env.CHAPA_WEBHOOK_SECRET = "test-secret";
  const app = express();
  app.use("/api/payment/webhook", express.raw({ type: "application/json" }), webhookRouter);
  const webServer = app.listen(0);
  try {
    const { port } = webServer.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/payment/webhook`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tx_ref: "test-reference" }),
    });
    assert.equal(response.status, 401, "handler parsed raw Buffer and rejected missing signature");
  } finally {
    await new Promise((resolve) => webServer.close(resolve));
    if (priorSecret === undefined) delete process.env.CHAPA_WEBHOOK_SECRET;
    else process.env.CHAPA_WEBHOOK_SECRET = priorSecret;
  }
  const source = await read("../routes/payment/paymentVerify.js");
  const serverSource = await read("../server.js");
  assert.match(source, /if \(!Buffer\.isBuffer\(req\.body\)\) return res\.sendStatus\(400\)/);
  assert.ok(serverSource.indexOf('express.raw({ type: "application/json"') < serverSource.indexOf("app.use(express.json"));
  assert.match(serverSource, /app\.use\("\/api\/payment\/webhook"[^\n]*webhookRouter\)/);
});
