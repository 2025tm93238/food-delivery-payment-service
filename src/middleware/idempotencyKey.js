const { errors } = require("../utils/errors");

module.exports = (req, res, next) => {
  const key = req.get("Idempotency-Key");
  if (!key || !key.trim()) {
    return next(
      errors.badRequest(
        "IDEMPOTENCY_KEY_REQUIRED",
        "Idempotency-Key header is required for this endpoint"
      )
    );
  }
  req.idempotencyKey = key.trim();
  next();
};
