/* Commands regarding broadcasting messages from the admins */
const logger = require('../logger');
const Bot = require('../bot');
const db = require('../db');
const utils = require('../utils');

const broadcast = module.exports = {};

/* stores messages sent by the last broadcast
 * keys = chatIds, values = messageIds */
let last_broadcast = {};

broadcast.init = function() {
	const bot = Bot.bot;

	/* If this command comes from adms, replies to them with the same message.
	 * Used to test if /broadcast is correctly formatted */
	bot.onText(/^\/mock_broadcast(@\w+)* .*$/, (message) => {
		if(message.chat.id != utils.admin_id) return;
		let text = message.text.slice(message.text.indexOf(' ') + 1);
		Bot.sendMessage(message.chat.id, text, {
			parse_mode: 'Markdown',
			disable_web_page_preview: true
		});
	});

	/* If this command comes from adms, sends the messsage after the command
	 * to all users */
	bot.onText(/^\/broadcast(@\w+)* .*$/, (message) => {
		if(message.chat.id != utils.admin_id) return;
		let text = message.text.slice(message.text.indexOf(' ') + 1);
		last_broadcast = {};
		db.low
			.get('users')
			.map('id')
			.value()
			.forEach((id) => {
				Bot.sendMessage(id, text, {
					parse_mode: 'Markdown',
					disable_web_page_preview: true
				}).then((msg) => {
					last_broadcast[id] = msg.message_id;
				});
			});
	});

	/* If this command comes from adms, edits the last sent
	 * broadcast message. Use with care. */
	bot.onText(/^\/edit_broadcast(@\w+)* .*$/, (message) => {
		if(message.chat.id != utils.admin_id) return;
		let text = message.text.slice(message.text.indexOf(' ') + 1);
		db.low
			.get('users')
			.map('id')
			.value()
			.forEach((id) => {
				if(last_broadcast[id] === undefined) return;
				bot.editMessageText(text, {
					chat_id: id,
					message_id: last_broadcast[id],
					parse_mode: 'Markdown',
					disable_web_page_preview: true
				});
			});
	});
}
