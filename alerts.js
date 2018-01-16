const logger = require('./logger')
const schedule = require('node-schedule');
const bot = require('./bot');
const db = require('./db');
const html_msg = require('./html-msg');

let event_handlers = []

const sec = 1000;
const min = 60 * sec;
const hour = 60 * min;
const day = 24 * hour;

const alerts = module.exports = {}

/* Manages contest warning messages */
const warning_manager = (function () {
	var instance = {};

	instance.buffer = [];

	instance.flush_buffer = function () {
		db.low
			.get('users')
			.value()
			.forEach(function (user) {
				if (!user.notify) return;

				var message = instance.buffer.reduce((message, warning) => {
					var ev = warning.ev;
					if (!user.ignore[ev.judge])
						message += html_msg.make_link(ev.name, ev.url) + html_msg.escape(' will start in ' + warning.left + '.') + '\n';
					return message;
				}, "");
				
				if (message !== "")
					bot.sendSimpleHtml(user.id, message);
			});
		instance.buffer = [];
	};

	// dummy flush 300000 days from now, never called
	instance.next_flush = new schedule.scheduleJob(new Date(Date.now() + 300000 * day), instance.flush_buffer);
	instance.next_flush.cancel();

	instance.add = function(ev, left) {
		instance.buffer.push({ ev: ev, left: left });
		instance.next_flush.reschedule(new Date(Date.now() + 30 * 1000));
	}

	return instance;
}());
	
alerts.reset_alerts = () => {
	logger.info("Erasing all alerts for upcoming events");
	event_handlers.forEach((handler) => { 
		if(handler) handler.cancel(); 
	});
	event_handlers = [];
};

alerts.add_alerts = (upcoming, fetcher) => {
	logger.info("Registering " + upcoming.length + " " + fetcher.name + " events");
	upcoming.forEach((ev) => {
		event_handlers.push(schedule.scheduleJob(new Date(ev.time.getTime() - day), () => { warning_manager.add(ev, '1 day', fetcher); }));
		event_handlers.push(schedule.scheduleJob(new Date(ev.time.getTime() - hour), () => { warning_manager.add(ev, '1 hour', fetcher); }));
	});
}
