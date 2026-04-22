const paymentService = require("../services/payment.service");
const { success } = require("../utils/response");
const { parsePagination } = require("../utils/pagination");

const charge = async (req, res) => {
  const result = await paymentService.charge(req.body, req.idempotencyKey, req.correlationId);
  success(req, res, result, result.replayed ? 200 : 201);
};

const refund = async (req, res) => {
  const p = await paymentService.refund(parseInt(req.params.id), req.correlationId);
  success(req, res, p);
};

const list = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { status, method, order_id } = req.query;
  const result = await paymentService.list({
    page,
    limit,
    skip,
    filters: { status, method, order_id },
  });
  success(req, res, result);
};

const getById = async (req, res) => {
  const p = await paymentService.getById(parseInt(req.params.id));
  success(req, res, p);
};

const getByOrderId = async (req, res) => {
  const p = await paymentService.getByOrderId(parseInt(req.params.orderId));
  success(req, res, p);
};

module.exports = { charge, refund, list, getById, getByOrderId };
