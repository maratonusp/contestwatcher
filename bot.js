const Bot = require('node-telegram-bot-api');
const dateformat = require('dateformat');
const process = require('process');

const db = require('./db');

const num = (x, pos) => {
  x = Math.floor(x)
  if (x == 0) return "";
  return x + pos;
};

// returns the timeanddate link for given date
const time_link = (name, d) => {
  return "https://www.timeanddate.com/worldclock/fixedtime.html?" +
    "msg=" + encodeURIComponent(name) +
    "&year=" + d.getUTCFullYear() +
    "&month=" + (d.getUTCMonth() + 1).toString() +
    "&day=" + d.getUTCDate() +
    "&hour=" + d.getUTCHours() +
    "&min=" + d.getUTCMinutes() +
    "&sec=" + d.getUTCSeconds();
};

let last_refresh = new Date(0);

module.exports = {
  create_bot: (upcoming, judgefetcher) => {
    const bot = new Bot(process.env.TELEGRAM_TOKEN, {polling: true});

    const send = function(msg, txt) {
      bot.sendMessage(msg.chat.id, txt, {
        parse_mode: 'html', 
        disable_web_page_preview: true
      });
    };

    bot.onText(/^\/upcoming(@\w+)*$/, (message) => {
      const maxContests = 7;
      var validContests = 0;
      var result = "";

      upcoming.forEach( (entry) => {
        if (entry.time < Date.now())
          return;

        validContests++;

        if (validContests <= maxContests) {
          const d = entry.duration / 60
          const min = Math.ceil((entry.time.getTime() - Date.now()) / (1000 * 60))
          result +=
            '<a href="' + entry.url + '">' + entry.name + "</a> " +
            "(" + Math.floor(d / 60) + "h" + (d % 60 == 0? "" : (d % 60 < 10? "0" : "") + (d % 60).toString())+ ")\n" +
            "starts in <a href=\"" + time_link(entry.name, entry.time) + '">' +  num(min / (60 * 24), 'd ') + num((min / 60) % 24, 'h ') + (min % 60).toString() + "m</a>" +
            "\n\n";
        }
      });

      if (maxContests < validContests)
        result += "And other " + (validContests - maxContests) + " scheduled after those...";

      if (result == "")
        result = "No upcoming contests :(";

      send(message, result);
    });

    bot.onText(/^\/refresh(@\w+)*$/, (message) => {
      if (Date.now() - last_refresh < 1000 * 60 * 10) {
        send(message, "Contest list was refreshed less than 10 minutes ago.");
      } else {
        send(message, "Refreshing contest list... Please wait a bit before using /upcoming.");
        judgefetcher.updateUpcoming(upcoming);
        last_refresh = Date.now();
      }
    });

    bot.onText(/^\/start(@\w+)*$/, (message) => {
      var response = "";
      const users = db.get('users');
      if (!users.find({ id : message.chat.id }).isUndefined()) {
        response = "Looks like you're already registered for reminders. ";
      } else {
        users
          .push({ id : message.chat.id, ignore: ['calendar'] })
          .write();
        response = "You have been registered and will receive reminders for the contests!";
      }
      console.log("Registering user " + message.chat.id);
      send(message, response);
    });

    bot.onText(/^\/stop(@\w+)*$/m, (message) => {
      db.get('users')
        .remove({ id : message.chat.id })
        .write();
      console.log("Deleting user " + message.chat.id);
      send(message, "You will no longer receive reminders for the contests :(. Use /start if you want to receive reminders again.");
    });

    bot.onText(/^\/help(@\w+)*$/, (message) => {
      send(message, "Hello, I am ContestWatcher Bot :D. I list programming contests from Codeforces, Topcoder, Codechef and CSAcademy.\n\n" +
           "You can control me by sending these commands: \n\n" +
           "/start - Start receiving reminders before the contests. I'll send a reminder 1 day and another 1 hour before each contest.\n" +
           "/stop - Stop receiving reminders.\n" +
           "/upcoming - show the next scheduled contests.\n" +
           "/refresh - resfresh the contest list. This is done automatically once per day.\n" +
           "/help - shows this help message.");
    });

    bot.onText(/^\/hue(@\w+)*$/, (message) => {
        bot.sendAudio(message.chat.id, 'audio/gas.ogg');
    });

    module.exports.bot = bot;
  }
};
