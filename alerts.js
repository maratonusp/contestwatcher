const schedule = require('node-schedule');
const bot = require('./bot');

const event_handlers = []

const sec = 1000;
const min = 60 * sec;
const hour = 60 * min;
const day = 24 * hour;

const alerts = module.exports = {}

warn = function (ev, left) {
  for (const id in bot.registered_users) {
    bot.bot.sendMessage(id, '[' + ev.name + '](' + ev.url + ') will start in ' + left + '.', { parse_mode: 'Markdown', disable_web_page_preview: true });
  }
};

alerts.reset_alerts = function(upcoming) {
  event_handlers.forEach((h) => { if (h) h.cancel(); });
  event_handlers.length = 0;
  upcoming.forEach((ev) => {
    event_handlers.push(schedule.scheduleJob(new Date(ev.time.getTime() - day), () => { warn(ev, '1 day'); }));
    event_handlers.push(schedule.scheduleJob(new Date(ev.time.getTime() - hour), () => { warn(ev, '1 hour'); }));
  });
};
