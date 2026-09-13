const TelegramBot = require('node-telegram-bot-api');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const logger = require("../utils/logger");

const token = process.env.TELEGRAM_BOT_TOKEN;

// Initialize bot if token exists
let bot = null;
if (token) {
  bot = new TelegramBot(token, { polling: true });
  logger.info("🤖 Telegram Bot initialized and polling for messages.");
} else {
  logger.warn("⚠️ TELEGRAM_BOT_TOKEN is missing. Telegram bot is disabled.");
}

const generateSmartFallbackAnswer = (question) => {
  const qLower = question.toLowerCase();
  
  if (/business idea|retail|capital/i.test(qLower)) {
    return "Here is a great business idea based on your input:\n\n1. Mini Cold Storage & Agri-Logistics 🌾\n- Investment: ₹4,00,000 to ₹5,00,000\n- High demand in UP for preserving local produce.\n- Potential Profit: ₹40,000/month.\n\n2. Rural Retail Supermart 🏪\n- Fast-moving consumer goods tailored to local needs.\n- High turnover and margin.";
  }
  
  if (/scheme|yojana|government/i.test(qLower)) {
    return "Under MoSJE, there are schemes like NSFDC for SCs and NBCFDC for OBCs providing concessional loans up to ₹15 Lakhs for starting new businesses like retail stores. Let me know your category for specifics!";
  }
  
  if (/loan|interest/i.test(qLower)) {
    return "Loans up to ₹10 Lakh are available at 4-6% p.a. interest rates depending on the scheme and your category.";
  }
  
  if (/margin|contribution/i.test(qLower)) {
    return "You only need to contribute 5-10% of the project cost as margin money. The rest is covered by the loan and government subsidy.";
  }
  
  return "Thank you for reaching out to UdyamAI! 🙏 I can help you with:\n- New business ideas 💡\n- Government Schemes 📜\n- Loan information 💰\n\nWhat would you like to know?";
};

if (bot) {
  // Listen for any kind of message
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Ignore non-text messages
    if (!text) return;

    logger.info(`Received Telegram message from ${msg.chat.first_name || 'User'}: ${text}`);

    // Send a "typing..." action so the user knows the AI is thinking
    bot.sendChatAction(chatId, 'typing');

    let aiReply = "";

    try {
      const apiKey = process.env.GEMINI_API_KEY || "dummy_key_if_not_provided";
      if (apiKey !== "dummy_key_if_not_provided") {
        const genAI = new GoogleGenerativeAI(apiKey);
        // Using gemini-3.6-flash as required by the environment
        const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

        const prompt = `
INSTRUCTIONS:
1. You are UdyamAI, a helpful AI assistant for rural micro-entrepreneurs on Telegram.
2. Answer the user's question clearly, concisely, and empathetically.
3. Keep the response short and readable on a mobile screen.
4. Use emojis where appropriate. Use bullet points if needed.
5. User's question: "${text}"
`;
        
        // 15-second timeout so the user never has to wait forever, but gives Gemini enough time
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Gemini API Timeout (15s)")), 15000)
        );

        const result = await Promise.race([
          model.generateContent(prompt),
          timeoutPromise
        ]);

        aiReply = result.response.text();
      } else {
        throw new Error("Missing Gemini API Key");
      }
    } catch (error) {
      logger.error(`Gemini AI failed for Telegram: ${error.message}`);
      aiReply = generateSmartFallbackAnswer(text);
    }

    aiReply += "\n\n- Powered by UdyamAI";

    // Send the reply back to the chat (plain text to avoid strict Markdown crash)
    bot.sendMessage(chatId, aiReply);
  });

  // Handle polling errors
  bot.on("polling_error", (error) => {
    logger.error(`Telegram Polling Error: ${error.message}`);
  });
}

module.exports = bot;
