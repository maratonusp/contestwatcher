/* Commands /start, /stop and /help */
const logger = require('../logger');
const Bot = require('../bot');
const db = require('../db');

const start_stop = module.exports = {};

start_stop.init = function() {

	Bot.bot.on('message', (msg) => {
		// update database when chat migrates
		if (msg.migrate_from_chat_id !== undefined)
			db.user.migrate(msg.migrate_from_chat_id, msg.chat.id);
		// mark last activity
		db.user.get(msg.chat.id).set('last_activity', Date.now()).write();
	});


	Bot.bot.onText(/^\/start(@\w+)*$/, (message) => {
		let response = "";

		let id = message.chat.id;
		let user = db.user.get(id);

		if (user.get('notify').value() === true) {
			response = "Looks like you're already registered for reminders. ";
		} else {
			user
				.set('notify', true)
				.write();
			response = "You have been registered and will receive reminders for the contests! ";
		}
		response += "Use /stop if you want to stop receiving reminders.";
		Bot.sendSimplePlain(message.chat.id, response);
	});

	Bot.bot.onText(/^\/stop(@\w+)*$/m, (message) => {
		let response = "";

		let user = db.user.get(message.chat.id);

		if (user.get('notify').value() === false) {
			response = "Looks like you're already not registered for reminders. ";
		} else {
			user
				.set('notify', false)
				.write();
			response = "You have been unregistered and will not receive reminders for the contests :(. ";
		}
		response += "Use /start if you want to receive reminders.";
		Bot.sendSimplePlain(message.chat.id, response);
	});

	Bot.bot.onText(/^\/help(@\w+)*$/m, (message) => {
		Bot.sendSimplePlain(message.chat.id, "Hello, I am ContestWatcher Bot :D. I list programming contests from Codeforces, Topcoder, Codechef, CSAcademy and AtCoder.\n\n" +
			"You can control me by sending these commands: \n\n" +
			"/start - start receiving reminders before the contests. I'll send a reminder 1 day and another 1 hour before each contest.\n" +
			"/stop - stop receiving reminders.\n" +
			"/upcoming - show the next scheduled contests.\n" +
			"/running - show running contests.\n" +
			"/help_handles - info on how to add and remove codeforces handles.\n" +
			"/refresh - refresh the contest list. This is done automatically once per day.\n" +
			"/judges - list supported judges.\n" +
			"/enable judge - enable notifications for some judge.\n" +
			"/disable judge - disable notifications for some judge.\n" +
			"/help - shows this help message.");
	});

}
