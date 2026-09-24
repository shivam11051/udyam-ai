const TelegramBot = require('node-telegram-bot-api');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const logger = require("../utils/logger");

const token = process.env.TELEGRAM_BOT_TOKEN;

// ─────────────────────────────────────────────────────────────────────────────
// SINGLETON GUARD: Prevents multiple instances from polling simultaneously.
// If this module is required more than once (e.g. hot-reload, test suites),
// we reuse the same bot instance instead of creating a new one.
// ─────────────────────────────────────────────────────────────────────────────
if (global.__udyamTelegramBot__) {
  logger.warn("⚠️ Telegram bot already running — reusing existing instance (singleton guard).");
  module.exports = global.__udyamTelegramBot__;
  return; // Skip re-initialization entirely
}

let bot = null;

if (!token) {
  logger.warn("⚠️ TELEGRAM_BOT_TOKEN is missing. Telegram bot is disabled.");
  module.exports = null;
  return;
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1: Delete any stale webhook + clear pending updates BEFORE starting
// long-polling. This is the root cause of 409 Conflicts when a server
// restarts — the old webhook/update session is still active on Telegram.
// ─────────────────────────────────────────────────────────────────────────────
const axios = require("axios");

async function clearAndStart() {
  try {
    // Delete webhook (no-op if polling was already active; prevents hybrid conflict)
    await axios.post(`https://api.telegram.org/bot${token}/deleteWebhook`, {
      drop_pending_updates: true  // <-- clears the pending update queue too
    });
    logger.info("🧹 Telegram webhook deleted + pending updates cleared.");
  } catch (err) {
    logger.warn(`Could not delete webhook: ${err.message}`);
  }

  // Small delay to let Telegram fully release any previous connection
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Start bot with polling
  bot = new TelegramBot(token, {
    polling: {
      interval: 2000,       // poll every 2 seconds
      autoStart: true,
      params: {
        timeout: 10,        // long-poll timeout in seconds
        allowed_updates: ["message"]
      }
    }
  });

  // Save to global singleton so no second instance can be created
  global.__udyamTelegramBot__ = bot;

  logger.info("🤖 Telegram Bot initialized and polling for messages.");

  // ── MESSAGE HANDLER ────────────────────────────────────────────────────────
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    if (!text) return;

    logger.info(`Received Telegram message from ${msg.chat.first_name || "User"}: ${text}`);
    bot.sendChatAction(chatId, "typing");

    let aiReply = "";

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("Missing Gemini API Key");

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

      const prompt = `
INSTRUCTIONS:
1. You are UdyamAI, a helpful AI assistant for rural micro-entrepreneurs on Telegram.
2. Answer the user's question clearly, concisely, and empathetically.
3. Keep the response short and readable on a mobile screen.
4. Use emojis where appropriate. Use bullet points if needed.
5. User's question: "${text}"
`;

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Gemini API Timeout (15s)")), 15000)
      );

      const result = await Promise.race([
        model.generateContent(prompt),
        timeoutPromise
      ]);

      aiReply = result.response.text();
    } catch (error) {
      logger.error(`Gemini AI failed for Telegram: ${error.message}`);
      aiReply = generateSmartFallbackAnswer(text);
    }

    aiReply += "\n\n- Powered by UdyamAI";
    bot.sendMessage(chatId, aiReply);
  });

  // ── POLLING ERROR HANDLER (with 409 self-heal) ────────────────────────────
  let consecutiveErrors = 0;
  bot.on("polling_error", async (error) => {
    consecutiveErrors++;
    logger.error(`Telegram Polling Error: ${error.message}`);

    if (error.code === "ETELEGRAM" && error.message.includes("409")) {
      // 409 = another instance is polling. Back off and let it die naturally.
      const backoffMs = Math.min(1000 * Math.pow(2, consecutiveErrors), 30000);
      logger.warn(`409 Conflict detected — backing off ${backoffMs}ms before retrying...`);
      
      await bot.stopPolling();
      await new Promise(resolve => setTimeout(resolve, backoffMs));
      
      bot.startPolling();
      logger.info("🔄 Polling restarted after 409 backoff.");
    }
  });

  bot.on("polling_success", () => {
    consecutiveErrors = 0; // reset on success
  });

  // ── GRACEFUL SHUTDOWN ──────────────────────────────────────────────────────
  // Stop polling cleanly when the process exits so Telegram releases the
  // connection before the new instance starts (prevents 409 on restart).
  const shutdown = async (signal) => {
    logger.info(`${signal} received — stopping Telegram bot polling gracefully...`);
    try {
      await bot.stopPolling();
      global.__udyamTelegramBot__ = null;
      logger.info("✅ Telegram bot stopped cleanly.");
    } catch (e) {
      logger.warn(`Error during bot shutdown: ${e.message}`);
    }
    process.exit(0);
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

// ─────────────────────────────────────────────────────────────────────────────
const generateSmartFallbackAnswer = (question) => {
  const qLower = question.toLowerCase();

  if (/business idea|retail|capital/i.test(qLower)) {
    return "Here is a great business idea based on your input:\n\n1. Mini Cold Storage & Agri-Logistics 🌾\n- Investment: ₹4,00,000 to ₹5,00,000\n- High demand in UP for preserving local produce.\n- Potential Profit: ₹40,000/month.\n\n2. Rural Retail Supermart 🏪\n- Fast-moving consumer goods tailored to local needs.\n- High turnover and margin.";
  }
  if (/scheme|yojana|government/i.test(qLower)) {
    return "Under MoSJE, schemes like NSFDC for SCs and NBCFDC for OBCs provide concessional loans up to ₹15 Lakhs. Let me know your category for specifics!";
  }
  if (/loan|interest/i.test(qLower)) {
    return "Loans up to ₹10 Lakh are available at 4-6% p.a. interest rates depending on the scheme and your category.";
  }
  if (/margin|contribution/i.test(qLower)) {
    return "You only need to contribute 5-10% of the project cost as margin money. The rest is covered by the loan and government subsidy.";
  }
  return "Thank you for reaching out to UdyamAI! 🙏 I can help you with:\n- New business ideas 💡\n- Government Schemes 📜\n- Loan information 💰\n\nWhat would you like to know?";
};

// Kick off the async startup
clearAndStart().catch(err => logger.error(`Telegram bot startup failed: ${err.message}`));

module.exports = { getBot: () => bot };
