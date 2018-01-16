/* Commands regarding dealing with individual judges */
const logger = require('../logger');
const Bot = require('../bot');
const db = require('../db');
const html_msg = require('../html-msg');

const judges = module.exports = {};

judges.init = function() {
	const bot = Bot.bot;

	/* Enables notifications from a given judge */
	bot.onText(/^\/enable(@\w+)*/m, (message) => {
		let pars = message.text.split(' ');
		let response = "";
		if (pars.length < 2) {
			response = "No judge specified.";
		} else {
			let user = db.user.get(message.chat.id);
			let judge = pars[1];

			let ignored = user
				.has('ignore.' + judge)
				.value();

			if (ignored === true) {
				user
					.unset('ignore.' + judge)
					.write();
				response = "Ok! Now this judge no longer ignored for you!";
				logger.info("Enable " + judge + " on " + message.chat.id);
			} else {
				response = "You are not ignoring this judge.";
			}
		}

		Bot.sendSimpleHtml(message.chat.id, html_msg.escape(response));
	});

	/* Disables notifications from a given judge */
	bot.onText(/^\/disable(@\w+)*/m, (message) => {
		let pars = message.text.split(' ');
		let response = "";
		if (pars.length < 2) {
			response = "No judge specified.";
		} else {
			let user = db.user.get(message.chat.id);
			let judge = pars[1];

			let ignored = user
				.has('ignore.' + judge)
				.value();

			if (ignored === false) {
				user
					.set('ignore.' + judge, true)
					.write();
				response = "Ok! Now this judge is now ignored for you!";
				logger.info("Disable " + judge + " on " + message.chat.id);
			} else {
				response = "You are already ignoring this judge.";
			}
		}

		Bot.sendSimpleHtml(message.chat.id, html_msg.escape(response));
	});

	/* List all judges and their status */
	bot.onText(/^\/judges(@\w+)*$/m, (message) => {
		let user = db.user.get(message.chat.id);

		let response = "You can /enable or /disable judges with the commands as you wish. Try typing /enable calendar.\n\n";
		response += "Supported Judges: \n"

		let vals = [
			['codeforces', ''],
			['topcoder', ''],
			['codechef', ''],
			['csacademy', ''],
			['atcoder', ''],
			['calendar', ' : manually inputed. (codejam, yandex, local events, etc)']
		];

		for (let i = 0; i < vals.length; i++) {
			let state = user
				.has('ignore.' + vals[i][0])
				.value();

			if (state === true)
				response += '[ignored] ';
			response += vals[i][0] + vals[i][1] + '\n';
		}

		Bot.sendSimpleHtml(message.chat.id, html_msg.escape(response));
	});

}
