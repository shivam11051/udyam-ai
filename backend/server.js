require("dotenv").config();
const express    = require("express");
const cors       = require("cors");
const helmet     = require("helmet");
const rateLimit  = require("express-rate-limit");
const logger     = require("./utils/logger");
const mongoose   = require("mongoose");


// ── 1. ENV VALIDATION ─────────────────────────────────────────────
const REQUIRED_ENV = ["GEMINI_API_KEY"];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error("❌ Missing required environment variables:", missing.join(", "));
  console.error("   Please create backend/.env with these values.");
  process.exit(1);
}

// ── 2. APP SETUP ──────────────────────────────────────────────────
const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || "https://shivam11051.github.io",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization", "x-signature", "x-address", "x-message"],
}));

app.use(express.json({ limit: "10kb" }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use("/api", limiter);

// ── 3. ROUTES ─────────────────────────────────────────────────────
const aiRouter = require("./routes/ai");
const usersRouter = require("./routes/users");
const historyRouter = require("./routes/history");
const analyticsRouter = require("./routes/analytics");

app.use("/api/ai", aiRouter);
app.use("/api/users", usersRouter);
app.use("/api/history", historyRouter);
app.use("/api/analytics", analyticsRouter);

// ── 4. HEALTH CHECK ───────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "✅ UdyamAI Backend running",
    version: "1.0.0",
    timestamp: new Date()
  });
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`);
  res.status(500).json({ error: "Internal server error" });
});

// ── 5. START SERVER ───────────────────────────────────────────────
const PORT = process.env.PORT || 5001;

if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
      logger.info("✅ MongoDB connected successfully");
      app.listen(PORT, () => {
        logger.info(`🚀 Server running on port ${PORT}`);
      });
    })
    .catch(err => {
      logger.error(`❌ MongoDB connection error: ${err.message}`);
      process.exit(1);
    });
} else {
  logger.warn("⚠️ MONGODB_URI not found. Starting without database.");
  app.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
  });
}