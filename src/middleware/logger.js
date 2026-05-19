'use strict';

/**
 * Lightweight request logger for development.
 * In production you'd swap this for morgan or a structured logger (pino/winston).
 */
function requestLogger(req, res, next) {
  if (process.env.NODE_ENV === 'test') return next();

  const start = Date.now();

  res.on('finish', () => {
    const ms     = Date.now() - start;
    const status = res.statusCode;
    const color  =
      status >= 500 ? '\x1b[31m' :   // red
      status >= 400 ? '\x1b[33m' :   // yellow
      status >= 300 ? '\x1b[36m' :   // cyan
                      '\x1b[32m';    // green
    const reset  = '\x1b[0m';
    console.log(`${color}${req.method} ${req.originalUrl} ${status} — ${ms}ms${reset}`);
  });

  next();
}

module.exports = { requestLogger };
