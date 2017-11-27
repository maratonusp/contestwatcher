const schedule = require('node-schedule');
const bot = require('./bot');
const db = require('./db');
const html_msg = require('./html-msg');

const event_handlers = []

const sec = 1000;
const min = 60 * sec;
const hour = 60 * min;
const day = 24 * hour;

const alerts = module.exports = {}

warn = function (ev, left, fetcher) {
  var message = html_msg.make_link(ev.name, ev.url) + html_msg.escape(' will start in ' + left + '.');
  if(fetcher.announceContest !== undefined)
    fetcher.announceContest(ev, left);
  else // default behavior
    db.low
      .get('users')
      .reject(function(user) {
        return !user.notify || user.ignore[ev.judge]
      })
      .map('id')
      .value()
      .forEach(function (id) {
        bot.sendMessage(id, message, {
          parse_mode: 'html',
          disable_web_page_preview: true
        });
    });
};

alerts.reset_alerts = function(upcoming, get_fetcher) {
  event_handlers.forEach((h) => { if (h) h.cancel(); });
  event_handlers.length = 0;
  upcoming.forEach((ev) => {
    const fetcher = get_fetcher(ev.judge).object;
    event_handlers.push(schedule.scheduleJob(new Date(ev.time.getTime() - day), () => { warn(ev, '1 day', fetcher); }));
    event_handlers.push(schedule.scheduleJob(new Date(ev.time.getTime() - hour), () => { warn(ev, '1 hour', fetcher); }));
  });
};
