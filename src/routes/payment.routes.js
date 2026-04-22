const express = require("express");
const validate = require("../middleware/validate");
const idempotencyKey = require("../middleware/idempotencyKey");
const { charge } = require("../validators/payment.validator");
const ctrl = require("../controllers/payment.controller");

const router = express.Router();

router.post("/charge", idempotencyKey, validate(charge), ctrl.charge);
router.post("/:id/refund", ctrl.refund);
router.get("/", ctrl.list);
router.get("/by-order/:orderId", ctrl.getByOrderId);
router.get("/:id", ctrl.getById);

module.exports = router;
