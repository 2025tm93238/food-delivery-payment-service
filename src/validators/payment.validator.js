const Joi = require("joi");

const charge = Joi.object({
  order_id: Joi.number().integer().positive().required(),
  amount: Joi.number().positive().precision(2).required(),
  method: Joi.string().valid("CARD", "UPI", "COD", "WALLET").required(),
  simulate_failure: Joi.boolean().optional(),
});

const refund = Joi.object({});

module.exports = { charge, refund };
