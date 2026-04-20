const mongoose = require("mongoose");

const StockSettingSchema = new mongoose.Schema(
  {
    symbol: { type: String, default: "" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StockSetting", StockSettingSchema);
