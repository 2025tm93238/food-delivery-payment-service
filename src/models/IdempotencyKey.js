const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const IdempotencyKey = sequelize.define("IdempotencyKey", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  key: { type: DataTypes.STRING, unique: true, allowNull: false },
  order_id: { type: DataTypes.INTEGER },
  response_code: { type: DataTypes.INTEGER },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { timestamps: false, tableName: "idempotency_keys" });

module.exports = IdempotencyKey;
