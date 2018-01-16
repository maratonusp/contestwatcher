const winston = require('winston');
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

winston.remove(winston.transports.Console);

winston.add(winston.transports.Console, {
	level: 'debug',
	json: false,
	colorize: true,
	formatter: getFormatter,
	handleExceptions: true,
	humanReadableUnhandledException: true
});

winston.add(winston.transports.File, {
	level: 'debug',
	filename: './run.log',
	json: false,
	colorize: false,
	formatter: getFormatter,
	maxsize: 100000, // 100 KB
	maxFiles: 5,
	tailable: true,
	zippedArchive: true,
	handleExceptions: true,
	humanReadableUnhandledException: true
});

module.exports = winston;
