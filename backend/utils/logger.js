const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const parseLevel = (value) => {
  const normalized = (value || "").toLowerCase();
  return Object.prototype.hasOwnProperty.call(levels, normalized) ? normalized : "info";
};

const currentLevel = parseLevel(process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"));

const shouldLog = (level) => {
  if (process.env.NODE_ENV === "test") return false;
  return levels[level] <= levels[currentLevel];
};

const write = (level, ...args) => {
  if (!shouldLog(level)) return;

  const method = level === "error" ? "error" : level === "warn" ? "warn" : "log";
  console[method](`[${level.toUpperCase()}]`, ...args);
};

const logger = {
  error: (...args) => write("error", ...args),
  warn: (...args) => write("warn", ...args),
  info: (...args) => write("info", ...args),
  debug: (...args) => write("debug", ...args),
};

export default logger;
