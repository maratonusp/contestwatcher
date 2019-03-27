/* Lists useful stats to admin */
const logger = require('../logger');
const Bot = require('../bot');
const db = require('../db');
const html_msg = require('../html-msg');

const update = module.exports = {};

update.init = function() {
	/* If this command comes from adms, useful stats are returned */
	Bot.bot.onText(/^\/update$/, (message) => {
		text = "User already up-to-date!";

		let user = db.user.get(message.chat);
		const is_group = message.chat.type == "group";
		if(user.get('is_group').value() != is_group) {
			user.set('is_group', is_group).write();
			text = "User updated! Chat type: " + (is_group ? "group" : "user");
		}

		Bot.sendSimpleHtml(message.chat.id, html_msg.escape(text));
	});
};

// vim:noet
