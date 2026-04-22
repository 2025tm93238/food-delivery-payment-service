const express = require("express");
const paymentRoutes = require("./payment.routes");

const router = express.Router();

router.use("/payments", paymentRoutes);

module.exports = router;
