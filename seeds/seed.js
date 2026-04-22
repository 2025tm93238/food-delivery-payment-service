require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const fs = require("fs");
const readline = require("readline");
const { connectDB } = require("../src/config/db");
const Payment = require("../src/models/Payment");
const IdempotencyKey = require("../src/models/IdempotencyKey");

async function parseCSV(filePath) {
  const results = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity,
  });
  let headers = null;
  for await (const line of rl) {
    if (!line.trim()) continue;
    if (!headers) {
      headers = line.split(",").map((h) => h.trim());
    } else {
      const values = line.split(",").map((v) => v.trim());
      const obj = {};
      headers.forEach((h, i) => (obj[h] = values[i] ?? null));
      results.push(obj);
    }
  }
  return results;
}

async function seed() {
  if (!process.env.DB_NAME) {
    console.error("❌ DB_NAME not set in .env");
    process.exit(1);
  }

  try {
    await connectDB();
  } catch {
    console.error("❌ Cannot connect to PostgreSQL.");
    console.error("   Start it with: brew services start postgresql");
    console.error(`   DB: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
    process.exit(1);
  }

  const dataDir = require("path").resolve(__dirname, "data");
  const paymentsFile = `${dataDir}/ofd_payments.csv`;

  if (!fs.existsSync(paymentsFile)) {
    console.error("❌ Missing CSV file in seeds/data/");
    console.error("   Required: ofd_payments.csv");
    process.exit(1);
  }

  const paymentsRaw = await parseCSV(paymentsFile);

  await IdempotencyKey.destroy({ where: {} });
  await Payment.destroy({ where: {} });

  const payments = paymentsRaw.map((r) => ({
    payment_id: parseInt(r.payment_id),
    order_id: parseInt(r.order_id),
    amount: parseFloat(r.amount),
    method: r.method,
    status: r.status,
    reference: r.reference,
    created_at: new Date(r.created_at),
  }));

  // Seed idempotency_keys from payment references (one per payment)
  const idempotencyKeys = paymentsRaw.map((r) => ({
    key: r.reference,
    order_id: parseInt(r.order_id),
    response_code: r.status === "SUCCESS" ? 200 : r.status === "FAILED" ? 402 : 202,
    created_at: new Date(r.created_at),
  }));

  await Payment.bulkCreate(payments);
  await IdempotencyKey.bulkCreate(idempotencyKeys);

  console.log(`✅ Seeded ${payments.length} payments, ${idempotencyKeys.length} idempotency keys`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
