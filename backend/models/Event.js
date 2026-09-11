const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  eventType: {
    type: String,
    enum: ["MarginDeposited", "LoanApproved", "EMIPaid", "LoanClosed", "SCATransferInitiated", "SCATransferCompleted"],
    required: true,
    index: true,
  },
  user: {
    type: String, // Maps to entrepreneur, borrower, previousSCA
    index: true,
  },
  amount: String,
  remaining: String,
  newSCA: String,
  transactionHash: {
    type: String,
    unique: true,
    sparse: true,
  },
  blockNumber: Number,
  status: {
    type: String,
    enum: ["success", "pending", "failed"],
    default: "success",
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 7776000, // 90 days TTL
  },
});

// Indexes for fast queries
eventSchema.index({ user: 1, timestamp: -1 });
eventSchema.index({ eventType: 1, timestamp: -1 });

module.exports = mongoose.model("Event", eventSchema);