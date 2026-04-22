const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Payment = sequelize.define("Payment", {
  payment_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: false },
  order_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  method: {
    type: DataTypes.ENUM("CARD", "UPI", "COD", "WALLET"),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM("PENDING", "SUCCESS", "FAILED", "REFUNDED"),
    allowNull: false,
  },
  reference: { type: DataTypes.STRING, unique: true },
  created_at: { type: DataTypes.DATE },
  refunded_at: { type: DataTypes.DATE },
}, { timestamps: false, tableName: "payments" });

module.exports = Payment;
