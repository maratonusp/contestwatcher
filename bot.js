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
      db.read();
      var users = db.get('users');
      if (users.find({ id : message.chat.id }).value() !== undefined) {
        response = "Looks like you're already registered for reminders. ";
      } else {
        users
          .push({ id : message.chat.id, notify: true, ignore: {'calendar': true} })
          .write();
        response = "You have been registered and will receive reminders for the contests! ";
        console.log("Registering user " + message.chat.id);
      }
      response += "Use /stop if you want to stop receiving reminders.";
      send(message, response);
    });

    bot.onText(/^\/stop(@\w+)*$/m, (message) => {
      var users = db.get('users');
      var response = "";
      if (users.find({ id : message.chat.id }).value() === undefined) {
        response += "You are not currently receiving reminders. ";
      } else {
        response += "You will no longer receive reminders for the contests :(. ";
        users
          .remove({ id : message.chat.id })
          .write();
        console.log("Deleting user " + message.chat.id);
      }
      response += "Use /start if you want to receive reminders again.";
      send(message, response);
    });

    bot.onText(/^\/enable(@\w+)*/m, (message) => {
      var pars = message.text.split(' ');
      var response = "";
      if (pars.length < 2) {
        response = "No judge specified.";
      } else {
        var judge = pars[1];
        var user = db
          .get('users')
          .find({ id: message.chat.id });
        if (user.value() === undefined) {
          response = "Use /start to receive reminders.";
        } else {
          var ignored = user
            .has('ignore.' + judge)
            .value();
          if (ignored) {
            user
              .unset('ignore.' + judge)
              .write();
            response = "Ok! Now this judge no longer ignored for you!";
            console.log("Enable " + judge + " on " + message.chat.id);
          } else {
            response = "You are not ignoring this judge.";
          }
        }
      }

      send(message, response);
    });

    bot.onText(/^\/disable(@\w+)*/m, (message) => {
      var pars = message.text.split(' ');
      var response = "";
      if (pars.length < 2) {
        response = "No judge specified.";
      } else {
        var judge = pars[1];
        var user = db
          .get('users')
          .find({ id: message.chat.id });
        if (user.value() === undefined) {
          response = "Use /start to receive reminders.";
        } else {
          var ignored = user
            .has('ignore.' + judge)
            .value();
          if (ignored) {
            response = "You are already ignoring this judge.";
          } else {
            user.set('ignore.' + judge, true)
              .write();
            response = "Ok! Now this judge is ignored for you!";
            console.log("Disable " + judge + " on " + message.chat.id);
          }
        }
      }

      send(message, response);
    });

    bot.onText(/^\/judges(@\w+)*$/m, (message) => {
      send(message, "You can /enable or /disable judges with the commands as you wish. Try typing /enable calendar. The currently supperted judges are: \n\n" +
        "codeforces : codeforces.com" + "\n" + 
        "topcoder : topcoder.com" + "\n" +
        "codechef : codechef.com" + "\n" +
        "csacademy : csacademy.com" + "\n" +
        "calendar : manually inputed by the creators of the bot (codejam, yandex, local events, etc)" + "\n");
    });

    bot.onText(/^\/help(@\w+)*$/, (message) => {
      send(message, "Hello, I am ContestWatcher Bot :D. I list programming contests from Codeforces, Topcoder, Codechef and CSAcademy.\n\n" +
           "You can control me by sending these commands: \n\n" +
           "/start - Start receiving reminders before the contests. I'll send a reminder 1 day and another 1 hour before each contest.\n" +
           "/stop - Stop receiving reminders.\n" +
           "/upcoming - show the next scheduled contests.\n" +
           "/refresh - refresh the contest list. This is done automatically once per day.\n" +
           "/judges - list supported judges.\n" +
           "/enable <judge> - enable notifications for some judge.\n" +
           "/disable <judge> - disable notifications for some judge.\n" +
           "/help - shows this help message.");
    });

    bot.onText(/^\/hue(@\w+)*$/, (message) => {
        bot.sendAudio(message.chat.id, 'audio/gas.ogg');
    });

    module.exports.bot = bot;
  }
};
