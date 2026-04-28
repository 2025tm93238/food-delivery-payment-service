const { Op } = require("sequelize");
const Payment = require("../models/Payment");
const IdempotencyKey = require("../models/IdempotencyKey");
const { errors } = require("../utils/errors");
const httpClient = require("../utils/httpClient");
const { paymentsFailedTotal } = require("../middleware/metrics");

const getNextPaymentId = async () => {
  const row = await Payment.findOne({ order: [["payment_id", "DESC"]] });
  return (row?.payment_id ?? 0) + 1;
};

const makeReference = () => {
  const ts = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PAY${ts}-${rand}`;
};

const charge = async (
  { order_id, amount, method, simulate_failure },
  idempotencyKey,
  correlationId
) => {
  const existingKey = await IdempotencyKey.findOne({ where: { key: idempotencyKey } });
  if (existingKey) {
    const payment = await Payment.findOne({ where: { order_id: existingKey.order_id } });
    return { payment: payment?.toJSON(), replayed: true };
  }

  const existingPayment = await Payment.findOne({ where: { order_id } });
  if (existingPayment && existingPayment.status === "SUCCESS") {
    throw errors.conflict("PAYMENT_ALREADY_EXISTS", `Payment for order ${order_id} already succeeded`);
  }

  let status;
  if (simulate_failure) status = "FAILED";
  else if (method === "COD") status = "PENDING";
  else status = "SUCCESS";

  if (status === "FAILED") {
    paymentsFailedTotal.inc({ method, reason: "simulated" });
  }
  const payment_id = existingPayment?.payment_id ?? (await getNextPaymentId());
  const payload = {
    payment_id,
    order_id,
    amount,
    method,
    status,
    reference: makeReference(),
    created_at: new Date(),
  };

  const payment = existingPayment
    ? await existingPayment.update(payload)
    : await Payment.create(payload);

  await IdempotencyKey.create({
    key: idempotencyKey,
    order_id,
    response_code: 200,
    created_at: new Date(),
  });

  httpClient.updateOrderPaymentStatus(order_id, status, correlationId);
  httpClient.sendNotification(
    {
      userId: String(order_id),
      type: status === "SUCCESS" ? "PAYMENT_SUCCESS" : "ORDER_PLACED",
      channel: "EMAIL",
      message: `Payment ${status.toLowerCase()} for order ${order_id}, amount ₹${amount}`,
      metadata: { order_id, payment_id, amount, method, status },
    },
    correlationId
  );

  return { payment: payment.toJSON(), replayed: false };
};

const refund = async (payment_id, correlationId) => {
  const payment = await Payment.findOne({ where: { payment_id } });
  if (!payment) throw errors.notFound("PAYMENT_NOT_FOUND", `Payment ${payment_id} not found`);
  if (payment.status === "REFUNDED") {
    throw errors.conflict("PAYMENT_ALREADY_REFUNDED", `Payment ${payment_id} is already refunded`);
  }
  if (payment.status !== "SUCCESS") {
    throw errors.badRequest(
      "PAYMENT_NOT_REFUNDABLE",
      `Only SUCCESS payments can be refunded (current: ${payment.status})`
    );
  }

  await payment.update({ status: "REFUNDED", refunded_at: new Date() });

  httpClient.updateOrderPaymentStatus(payment.order_id, "FAILED", correlationId);
  httpClient.sendNotification(
    {
      userId: String(payment.order_id),
      type: "PAYMENT_FAILED",
      channel: "EMAIL",
      message: `Refund processed for order ${payment.order_id}, amount ₹${payment.amount}`,
      metadata: { order_id: payment.order_id, payment_id, amount: payment.amount },
    },
    correlationId
  );

  return payment.toJSON();
};

const list = async ({ page, limit, skip, filters }) => {
  const where = {};
  if (filters.status) where.status = filters.status;
  if (filters.method) where.method = filters.method;
  if (filters.order_id) where.order_id = parseInt(filters.order_id);

  const { rows, count } = await Payment.findAndCountAll({
    where,
    order: [["payment_id", "DESC"]],
    offset: skip,
    limit,
  });
  return {
    items: rows.map((r) => r.toJSON()),
    page,
    limit,
    total: count,
    totalPages: Math.ceil(count / limit),
  };
};

const getById = async (payment_id) => {
  const p = await Payment.findOne({ where: { payment_id } });
  if (!p) throw errors.notFound("PAYMENT_NOT_FOUND", `Payment ${payment_id} not found`);
  return p.toJSON();
};

const getByOrderId = async (order_id) => {
  const p = await Payment.findOne({ where: { order_id } });
  if (!p) throw errors.notFound("PAYMENT_NOT_FOUND", `Payment for order ${order_id} not found`);
  return p.toJSON();
};

module.exports = { charge, refund, list, getById, getByOrderId };
