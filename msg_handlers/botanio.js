/* Sending data to botanio */
const logger = require('../logger');
const botan = require('botanio')(process.env.BOTANIO_TOKEN);
const using_botanio = (process.env.BOTANIO_TOKEN !== undefined);
const Bot = require('../bot');
logger.info("Using botan.io: " + using_botanio);

const botanio = module.exports = {};

botanio.init = function() {
	// botanio tracks commands data
	if(using_botanio) {
		Bot.bot.onText(/^\/\w+/, (message) => {
			const command = message.text.match(/^\/(\w+)/)[1];
			botan.track(message, command, (err, res, body) => {
				if(err)
					logger.error("Botan.io error: " + err);
			});
		});
	}
}
