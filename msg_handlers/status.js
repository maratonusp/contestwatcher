/* Lists useful stats to admin */
const logger = require('../logger');
const Bot = require('../bot');
const db = require('../db');
const utils = require('../utils');
const html_msg = require('../html-msg');

const stat = module.exports = {};

stat.init = function() {
	/* If this command comes from adms, useful stats are returned */
	Bot.bot.onText(/^\/status(@\w+)*$/, (message) => {
		if(message.chat.id != utils.admin_id) return;
		let text = Bot.delete_invalid();
		let recent = 0, valid = 0, notified = 0;
		const now = Date.now();
		const judges = {
			codeforces: 0,
			codechef: 0,
			topcoder: 0,
			csacademy: 0,
			atcoder: 0
		}
		let total_cf_handles = 0;
		db.low
			.get('users')
			.value()
			.forEach((user) => {
				valid++;
				if (user.notify) {
					notified++;
					Object.keys(judges).forEach((judge) => {
						if(!user.ignore[judge])
							judges[judge]++;
					});
				}
				if(user.cf_handles)
					total_cf_handles += user.cf_handles.length;
				if (user.last_activity !== undefined && now - user.last_activity < 7 * 24 * 60 * 60 * 1000)
					recent++;
			});
		text += '\nValid users: ' + valid;
		text += '\nUsers with notification on: ' + notified;
		Object.keys(judges).forEach((judge) => {
			text += "\n" + judge + " notifications on: " + judges[judge];
		});
		text += '\nActive users in the last week: ' + recent;
		text += '\nCF handles total: ' + total_cf_handles;
		Bot.sendSimpleHtml(message.chat.id, html_msg.escape(text));
	});
}
