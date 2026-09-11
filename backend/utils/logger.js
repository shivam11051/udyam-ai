const fs = require("fs");
const path = require("path");

const logsDir = path.join(__dirname, "../logs");

// Create logs directory if it doesn't exist
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

const getTimestamp = () => new Date().toISOString();

const appendLog = (file, data) => {
  fs.promises.appendFile(path.join(logsDir, file), data + "\n").catch(err => {
    console.error(`Failed to write to log file ${file}:`, err);
  });
};

const logger = {
  info: (message) => {
    const log = `[${getTimestamp()}] ℹ️ INFO: ${message}`;
    console.log(log);
    appendLog("app.log", log);
  },

  error: (message) => {
    const log = `[${getTimestamp()}] ❌ ERROR: ${message}`;
    console.error(log);
    appendLog("error.log", log);
  },

  warn: (message) => {
    const log = `[${getTimestamp()}] ⚠️ WARNING: ${message}`;
    console.warn(log);
    appendLog("app.log", log);
  },

  debug: (message) => {
    if (process.env.DEBUG === "true") {
      const log = `[${getTimestamp()}] 🐛 DEBUG: ${message}`;
      console.log(log);
      appendLog("debug.log", log);
    }
  },
};

module.exports = logger;