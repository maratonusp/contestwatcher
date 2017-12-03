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

const logger = new winston.Logger({
  transports: [
    new winston.transports.Console({
      timestamp: function() {
        return Date.now();
      },
      level: "debug",
      handleExceptions: true,
      json: false,
      colorize: true,
      formatter: function(options) {
        date = dateFormat(new Date(options.timestamp()), 'yyyy-mm-dd hh:mm');
        return '[' + date + ']' + ' ' +
          winston.config.colorize(options.level, options.level.toUpperCase()) + ' ' +
          (options.message ? options.message : '') +
          (options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '');
      }
    })
  ]
});

module.exports = logger;