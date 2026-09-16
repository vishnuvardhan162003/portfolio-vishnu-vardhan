import winston from 'winston'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Winston logger — centralised logging for the Eduzyra backend.
 *
 * Transports:
 *   - Console (colorized, development)
 *   - logs/error.log (errors only)
 *   - logs/combined.log (all levels)
 *
 * Format: timestamp + level + message + metadata (JSON in prod, pretty in dev)
 *
 * Exports:
 *   - default: logger (the Winston instance)
 *   - stream: { write } — for Morgan to pipe HTTP logs into
 */

// Ensure logs/ directory exists
const logsDir = path.resolve(process.cwd(), 'logs')
if (!fs.existsSync(logsDir)) {
  try {
    fs.mkdirSync(logsDir, { recursive: true })
  } catch {
    // Ignore — logging is best-effort, not critical
  }
}

const isProd = process.env.NODE_ENV === 'production'

const logger = winston.createLogger({
  level: isProd ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'eduzyra-api' },
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
})

// Always log to the console too — containerized platforms (Render, etc.)
// capture stdout/stderr, not files written inside the ephemeral filesystem.
logger.add(
  new winston.transports.Console({
    format: isProd
      ? winston.format.combine(winston.format.timestamp(), winston.format.json())
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({ format: 'HH:mm:ss' }),
          winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
            const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : ''
            return `${timestamp} ${level}: ${message}${metaStr}`
          }),
        ),
  }),
)

// Stream for Morgan — pipes HTTP request logs into Winston
logger.stream = {
  write: (message) => {
    logger.info(message.trim())
  },
}

export default logger
export const stream = logger.stream