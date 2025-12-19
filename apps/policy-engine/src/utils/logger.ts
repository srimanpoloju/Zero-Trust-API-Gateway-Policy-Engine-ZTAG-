import pino from "pino";

const level =
  process.env.LOG_LEVEL ||
  process.env.PINO_LEVEL ||
  "info"; // fallback so it never becomes undefined

export const logger = pino({
  level,
  timestamp: pino.stdTimeFunctions.isoTime,
});

export const fastifyLoggerOptions = {
  level,
} as const;
