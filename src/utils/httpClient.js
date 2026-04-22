const axios = require("axios");
const { logger } = require("../middleware/logger");

const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || "http://localhost:3003";
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || "http://localhost:3006";

const post = async (baseUrl, path, body, correlationId) => {
  try {
    const res = await axios.post(`${baseUrl}${path}`, body, {
      headers: { "X-Correlation-Id": correlationId },
      timeout: 5000,
    });
    return res.data;
  } catch (err) {
    logger.warn("downstream_call_failed", {
      correlationId,
      url: `${baseUrl}${path}`,
      status: err.response?.status,
      error: err.response?.data || err.message,
    });
    return null;
  }
};

const patch = async (baseUrl, path, body, correlationId) => {
  try {
    const res = await axios.patch(`${baseUrl}${path}`, body, {
      headers: { "X-Correlation-Id": correlationId },
      timeout: 5000,
    });
    return res.data;
  } catch (err) {
    logger.warn("downstream_call_failed", {
      correlationId,
      url: `${baseUrl}${path}`,
      status: err.response?.status,
      error: err.response?.data || err.message,
    });
    return null;
  }
};

const updateOrderPaymentStatus = (orderId, paymentStatus, correlationId) =>
  patch(ORDER_SERVICE_URL, `/v1/orders/${orderId}/payment-status`, { payment_status: paymentStatus }, correlationId);

const sendNotification = (payload, correlationId) =>
  post(NOTIFICATION_SERVICE_URL, "/v1/notifications", payload, correlationId);

module.exports = { updateOrderPaymentStatus, sendNotification };
