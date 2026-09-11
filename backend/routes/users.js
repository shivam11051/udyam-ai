const express = require("express");
const router  = express.Router();
const { ethers } = require("ethers");
const User    = require("../models/User");
const Event   = require("../models/Event");
const logger  = require("../utils/logger");
const { verifySignature } = require("../middleware/auth");

// Helper: validate address
function validateAddress(req, res) {
  const { address } = req.params;
  if (!ethers.isAddress(address)) {
    res.status(400).json({ error: "Invalid Ethereum address" });
    return false;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────
// GET /api/users/:address
// ─────────────────────────────────────────────────────────────────
router.get("/:address", async (req, res) => {
  if (!validateAddress(req, res)) return;

  try {
    const { address } = req.params;
    const normalized  = address.toLowerCase();

    let user = await User.findOne({ address: normalized }).lean();

    if (!user) {
      // Return a default profile if user not yet in DB
      return res.json({
        status: "✅",
        data: {
          address:        normalized,
          creditScore:    100,
          trustScore:     100,
          totalGroups:    0,
          activeGroup:    null,
          onTimePayments: 0,
          latePayments:   0,
          missedPayments: 0,
          joinedAt:       null,
          exists:         false,
        },
      });
    }

    res.json({ status: "✅", data: { ...user, exists: true } });
  } catch (error) {
    logger.error(`GET /users/${req.params.address} error: ${error.message}`);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/users/:address  — upsert profile
// ─────────────────────────────────────────────────────────────────
router.post("/:address", verifySignature, async (req, res) => {
  if (!validateAddress(req, res)) return;

  try {
    const { address } = req.params;
    const normalized  = address.toLowerCase();

    // Ensure users can only update their own profile unless they are an admin.
    // For simplicity, we restrict users to their own profiles.
    if (req.userAddress !== normalized) {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    const updates     = req.body;

    // Whitelist fields that can be updated.
    // IMPORTANT: creditScore and trustScore should NOT be user-updatable in a real app
    // without admin check, but for MVP we restrict it to specific safe fields if possible.
    const allowed = [
      "activeGroup", "lastSeen", "investmentProfile"
    ];
    const filtered = {};
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        filtered[key] = updates[key];
      }
    }

    const user = await User.findOneAndUpdate(
      { address: normalized },
      {
        $set: { ...filtered, address: normalized, updatedAt: new Date() },
        $setOnInsert: { joinedAt: new Date() },
      },
      { upsert: true, new: true, runValidators: true }
    ).lean();

    res.json({ status: "✅", data: user });
  } catch (error) {
    logger.error(`POST /users/${req.params.address} error: ${error.message}`);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /api/users/:address/credit  — EMI payment history from events
// ─────────────────────────────────────────────────────────────────
router.get("/:address/credit", async (req, res) => {
  if (!validateAddress(req, res)) return;

  try {
    const { address } = req.params;
    const normalized  = address.toLowerCase();

    // Use exact match instead of regex
    const events = await Event.find({
      eventType: { $in: ["EMIPaid"] },
      user: normalized,
    })
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();

    const emiPaid   = events.filter(e => e.eventType === "EMIPaid");

    res.json({
      status: "✅",
      data: {
        address:       normalized,
        totalPaid:     emiPaid.length,
        totalMissed:   0,
        history:       events,
      },
    });
  } catch (error) {
    logger.error(`GET /users/${req.params.address}/credit error: ${error.message}`);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
