const BotAPI = require('node-telegram-bot-api');
const process = require('process');
const html_msg = require('./html-msg');
const utils = require('./utils');
const logger = require('./logger');

const db = require('./db');

var invalid_users = new Set();
var Bot = module.exports = {}

/* Delete invalid users that have blocked the bot */
Bot.delete_invalid = function() {
	let text = "Deleting " + invalid_users.size + " invalid users.";
	db.low
		.get('users')
		.remove((user) => { return invalid_users.has(user.id); })
		.write();
	invalid_users.clear();
	return text;
}

Bot.create_bot = function() {
	const bot = new BotAPI(process.env.TELEGRAM_TOKEN, {polling: true});

	const send = function(msg, txt) {
		Bot.sendMessage(msg.chat.id, txt, {
			parse_mode: 'html',
			disable_web_page_preview: true
		});
	};

	Bot.bot = bot;

	Bot.sendMessage(utils.admin_id, "<code>Booting up.</code>", {parse_mode: 'html'});
}

/* Tries to send a message, logging errors. */
Bot.sendMessage = function(chatId, text, options) {
	let promise = Bot.bot.sendMessage(chatId, text, options);
	promise.catch((error) => {
		logger.error("Error while sending message: " + error.code + "\n" + JSON.stringify(error.response.body));
		logger.error("Original message: " + text);
		logger.error("Options: " + JSON.stringify(options));
		const err = error.response.body.error_code;
		// if the bot has been "banned" by this chat
		if (err === 400 || err === 403)
			invalid_users.add(chatId);
	});
	return promise;
}

/* Sends simple html message */
Bot.sendSimpleHtml = (chatId, text) => Bot.sendMessage(chatId, text, {
	parse_mode: 'html',
	disable_web_page_preview: true
});

/* Sends simple markdown message */
Bot.sendSimpleMarkdown = (chatId, text) => Bot.sendMessage(chatId, text, {
	parse_mode: 'markdown',
	disable_web_page_preview: true
});

/* Sends simple plain message */
Bot.sendSimplePlain = (chatId, text) => Bot.sendMessage(chatId, text, {
	disable_web_page_preview: true
});
