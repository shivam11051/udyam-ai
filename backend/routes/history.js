const express = require("express");
const router = express.Router();
const Event = require("../models/Event");
const logger = require("../utils/logger");

// Validation helper for pagination
function validatePagination(limit, skip) {
  const validatedLimit = Math.min(Math.max(Number(limit) || 100, 1), 200); // 1-200
  const validatedSkip = Math.max(Number(skip) || 0, 0); // >= 0
  return { validatedLimit, validatedSkip };
}

// ─────────────────────────────────────────────
// GET events for a user
// ─────────────────────────────────────────────
router.get("/:address", async (req, res) => {
  try {
    const { address } = req.params;
    const { limit = 100, skip = 0, type } = req.query;

    const normalized = address.toLowerCase();

    // Validate pagination
    const { validatedLimit, validatedSkip } = validatePagination(limit, skip);

    // Validate type if provided
    const validEventTypes = [
      "MarginDeposited", "LoanApproved", "EMIPaid", "LoanClosed", "SCATransferInitiated", "SCATransferCompleted"
    ];
    if (type && !validEventTypes.includes(type)) {
      return res.status(400).json({ error: "Invalid event type" });
    }

    let query = Event.find({ user: normalized });

    if (type) {
      query = query.where("eventType").equals(type);
    }

    const total = await Event.countDocuments(query.getFilter());
    const events = await query
      .sort({ timestamp: -1 })
      .limit(validatedLimit)
      .skip(validatedSkip)
      .lean();

    res.json({
      status: "✅",
      count: events.length,
      total,
      limit: validatedLimit,
      skip: validatedSkip,
      data: events,
    });
  } catch (error) {
    logger.error(`Error fetching history for user: ${error.message}`);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─────────────────────────────────────────────
// GET all events (global)
// ─────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { limit = 100, skip = 0, type } = req.query;

    // Validate pagination
    const { validatedLimit, validatedSkip } = validatePagination(limit, skip);

    // Validate type if provided
    const validEventTypes = [
      "MarginDeposited", "LoanApproved", "EMIPaid", "LoanClosed", "SCATransferInitiated", "SCATransferCompleted"
    ];
    if (type && !validEventTypes.includes(type)) {
      return res.status(400).json({ error: "Invalid event type" });
    }

    let query = Event.find();

    if (type) {
      query = query.where("eventType").equals(type);
    }

    const total = await Event.countDocuments(query.getFilter());
    const events = await query
      .sort({ timestamp: -1 })
      .limit(validatedLimit)
      .skip(validatedSkip)
      .lean();

    res.json({
      status: "✅",
      count: events.length,
      total,
      limit: validatedLimit,
      skip: validatedSkip,
      data: events,
    });
  } catch (error) {
    logger.error(`Error fetching global history: ${error.message}`);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─────────────────────────────────────────────
// GET Etherscan logs (CORS proxy)
// ─────────────────────────────────────────────
router.get("/etherscan/logs/:address", async (req, res) => {
  try {
    const { address } = req.params;
    
    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({ error: "Invalid contract address" });
    }

    const apiKey = process.env.ETHERSCAN_API_KEY || "";
    
    // Build the API URL without "latest" - use specific blocks instead
    let apiUrl = `https://sepolia.etherscan.io/api?module=logs&action=getLogs&address=${address}&fromBlock=0&toBlock=99999999`;
    
    // Mask key for logging
    const maskedUrl = apiUrl + (apiKey ? `&apikey=***MASKED***` : "");
    if (apiKey) {
      apiUrl += `&apikey=${apiKey}`;
    }
    
    console.log(`📡 [BACKEND] Calling Etherscan: ${maskedUrl}`);
    logger.info(`📡 Calling Etherscan: ${maskedUrl}`);
    
    const response = await fetch(apiUrl);
    const data = await response.json();

    res.json(data);
  } catch (error) {
    logger.error(`Error fetching Etherscan logs: ${error.message}`);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;