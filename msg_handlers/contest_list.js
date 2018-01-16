/* Commands to deal with the list of contests: upcoming, running, etc. */
const logger = require('../logger');
const Bot = require('../bot');
const html_msg = require('../html-msg');
const fetch = require('../fetch');
const db = require('../db');

const contest_list = module.exports = {};

// returns the timeanddate link for given date
const time_link = function(name, d) {
	return "https://www.timeanddate.com/worldclock/fixedtime.html?" +
		"msg=" + encodeURIComponent(name) +
		"&year=" + d.getUTCFullYear() +
		"&month=" + (d.getUTCMonth() + 1).toString() +
		"&day=" + d.getUTCDate() +
		"&hour=" + d.getUTCHours() +
		"&min=" + d.getUTCMinutes() +
		"&sec=" + d.getUTCSeconds();
};

/* returns a string of number x with suffix, unless it is 0
 * used to print dates */
const num = function(x, suffix) {
	x = Math.floor(x)
	if (x == 0) return "";
	return x + suffix;
};


// last time refresh was called
let last_refresh = new Date(0);

contest_list.init = function() {
	const bot = Bot.bot;

	bot.onText(/^\/running(@\w+)*$/, (message) => {
		const user = db.user.get(message.chat.id);
		const maxContests = 7;
		let validContests = 0;
		let result = "";

		fetch.upcoming.forEach( (entry) => {
			if (entry.time.getTime() > Date.now())
				return;
			if (entry.time.getTime() + (entry.duration * 1000) < Date.now())
				return;
			if (user.has('ignore.' + entry.judge).value() === true)
				return;

			validContests++;

			if (validContests <= maxContests) {
				const d = entry.duration / 60;
				const min = Math.ceil((entry.time.getTime() + entry.duration*1000 - Date.now()) / (1000 * 60));
				result +=
					html_msg.make_link(entry.name, entry.url) +
					html_msg.escape(" (" + Math.floor(d / 60) + "h" + (d % 60 == 0? "" : (d % 60 < 10? "0" : "") + (d % 60).toString())+ ")\nends in ") +
					html_msg.make_link(num(min / (60 * 24), 'd ') + num((min / 60) % 24, 'h ') + (min % 60).toString() + "m", time_link(entry.name, entry.time)) +
					"\n\n";
			}
		});

		if (maxContests < validContests)
			result += html_msg.escape("And other " + (validContests - maxContests) + " running besides those...");

		if (result == "")
			result = html_msg.escape("No running contests :(");

		Bot.sendSimpleHtml(message.chat.id, result);
	});

	bot.onText(/^\/upcoming(@\w+)*$/, (message) => {
		const user = db.user.get(message.chat.id);
		const maxContests = 7;
		let validContests = 0;
		let result = "";

		fetch.upcoming.forEach( (entry) => {
			if (entry.time.getTime() < Date.now())
				return;
			if (entry.time.getTime() > Date.now() + 14 * 24 * 60 * 60 * 1000) // at most 14 days
				return;
			if (user.has('ignore.' + entry.judge).value() === true)
				return;

			validContests++;

			if (validContests <= maxContests) {
				const d = entry.duration / 60
				const min = Math.ceil((entry.time.getTime() - Date.now()) / (1000 * 60))
				result +=
					html_msg.make_link(entry.name, entry.url) + " " +
					html_msg.escape("(" + Math.floor(d / 60) + "h" + (d % 60 == 0? "" : (d % 60 < 10? "0" : "") + (d % 60).toString())+ ")\n") +
					"starts in " + html_msg.make_link(num(min / (60 * 24), 'd ') + num((min / 60) % 24, 'h ') + (min % 60).toString() + "m", time_link(entry.name, entry.time)) +
					"\n\n";
			}
		});

		if (maxContests < validContests)
			result += html_msg.escape("And other " + (validContests - maxContests) + " scheduled in the next 2 weeks...");

		if (result == "")
			result = html_msg.escape("No upcoming contests :(");

		Bot.sendSimpleHtml(message.chat.id, result);
	});

	bot.onText(/^\/refresh(@\w+)*$/, (message) => {
		if (Date.now() - last_refresh.getTime() < 1000 * 60 * 10) {
			Bot.sendSimpleHtml(message.chat.id, html_msg.escape("Contest list was refreshed less than 10 minutes ago."));
		} else {
			fetch.updateUpcoming();
			Bot.sendSimpleHtml(message.chat.id, html_msg.escape("Refreshing contest list... Please wait a bit before using /upcoming."));
			last_refresh = new Date();
		}
	});

}
