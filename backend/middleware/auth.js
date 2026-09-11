const { ethers } = require("ethers");
const logger = require("../utils/logger");

const verifySignature = (req, res, next) => {
  try {
    const address = req.headers["x-address"];
    const message = req.headers["x-message"];
    const signature = req.headers["x-signature"];

    if (!address || !message || !signature) {
      return res.status(401).json({ error: "Missing authentication headers" });
    }

    // Verify the signature
    const recoveredAddress = ethers.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return res.status(403).json({ error: "Invalid signature or address mismatch" });
    }

    // Optional: add a simple replay protection by checking a timestamp inside the message
    // Assuming message format: "Login to MoSJE DApp: {timestamp}"
    const parts = message.split(":");
    if (parts.length > 1) {
      const timestamp = parseInt(parts[parts.length - 1].trim());
      if (!isNaN(timestamp)) {
        const now = Date.now();
        // Allow signature to be valid for 1 hour
        if (now - timestamp > 60 * 60 * 1000) {
          return res.status(401).json({ error: "Signature expired" });
        }
      }
    }

    // Attach user address to request
    req.userAddress = address.toLowerCase();
    next();
  } catch (err) {
    logger.error(`Auth Error: ${err.message}`);
    return res.status(401).json({ error: "Authentication failed" });
  }
};

module.exports = { verifySignature };
