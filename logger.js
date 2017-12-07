const winston = require("winston");
const dateFormat = require('dateformat');

/**
 * logger.info("message");
 * logger.warn("message");
 * logger.error("message");
 * You can use metadata too
 * logger.info("message", {foo: bar});
 * 
 * For more details: https://github.com/winstonjs/winston/tree/2.x
 */

function getDate() {
  return dateFormat(new Date(), "UTC:[dd/mm/yy HH:MM]");
}

function getFormatter(options) {
  date = getDate();
  level = options.level.toUpperCase();
  if (options.colorize)
    level = winston.config.colorize(options.level, level)
  return date + ' ' + level + ': ' +
    (options.message ? options.message : '') +
    (options.meta && Object.keys(options.meta).length ? '\n'+ JSON.stringify(options.meta) : '');
}

const logger = new winston.Logger({
  transports: [
    new winston.transports.Console({
      level: "debug",
      handleExceptions: true,
      json: false,
      colorize: true,
      formatter: getFormatter
    }),
    new (winston.transports.File)({
      filename: 'run.log', 
      json: false,
      colorize: false,
      formatter: getFormatter
    })
  ]
});

module.exports = logger;