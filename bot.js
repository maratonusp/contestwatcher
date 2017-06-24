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
// ID of group that controls this bot
const admin_id = -212740289;

module.exports = {
  create_bot: (upcoming, judgefetcher) => {
    const bot = new Bot(process.env.TELEGRAM_TOKEN, {polling: true});

    /* stores messages sent by the last broadcast
     * keys = chatIds, values = messageIds */
    var last_broadcast = {};

    const send = function(msg, txt) {
      bot.sendMessage(msg.chat.id, txt, {
        parse_mode: 'html', 
        disable_web_page_preview: true
      });
    };

    bot.onText(/./, (message) => {
      // mark last activity
      db.user.get(message.chat.id).set('last_activity', Date.now()).write();
    });

    /* If this command comes from adms, replies to them with the same message.
     * Used to test if /broadcast is correctly formatted */
    bot.onText(/^\/mock_broadcast(@w+)? .*$/, (message) => {
      if(message.chat.id != admin_id) return;
      var text = message.text.slice(message.text.indexOf(' ') + 1);
      bot.sendMessage(message.chat.id, text, {
            parse_mode: 'Markdown',
            disable_web_page_preview: true
      });
    });

    /* If this command comes from adms, sends the messsage after the command
     * to all users */
    bot.onText(/^\/broadcast(@w+)? .*$/, (message) => {
      if(message.chat.id != admin_id) return;
      var text = message.text.slice(message.text.indexOf(' ') + 1);
      last_broadcast = {};
      db.low
        .get('users')
        .map('id')
        .value()
        .forEach((id) => {
          bot.sendMessage(id, text, {
            parse_mode: 'Markdown',
            disable_web_page_preview: true
          }).then((msg) => {
            last_broadcast[id] = msg.message_id;
          });
        });
    });

    /* If this command comes from adms, edits the last sent
     * broadcast message. Use with care. */
    bot.onText(/^\/edit_broadcast(@w+)? .*$/, (message) => {
      if(message.chat.id != admin_id) return;
      var text = message.text.slice(message.text.indexOf(' ') + 1);
      db.low
        .get('users')
        .map('id')
        .value()
        .forEach((id) => {
          if(last_broadcast[id] === undefined) return;
          bot.editMessageText(text, {
            chat_id: id,
            message_id: last_broadcast[id],
            parse_mode: 'Markdown',
            disable_web_page_preview: true
          });
        });
    });

    /* If this command comes from adms, useful stats are returned */
    bot.onText(/^\/status(@w+)*$/, (message) => {
      if(message.chat.id != admin_id) return;
      let count = 0;
      const now = Date.now();
      db.low
        .get('users')
        .map('last_activity')
        .value()
        .forEach((time) => {
          if (time !== undefined && now - time < 7 * 24 * 60 * 60 * 1000)
            count++;
        });
      var text = 'Active users in the last week: ' + count;
      send(message, text);
    });

    bot.onText(/^\/running(@\w+)*$/, (message) => {
      const user = db.user.get(message.chat.id);
      const maxContests = 7;
      var validContests = 0;
      var result = "";

      upcoming.forEach( (entry) => {
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
            '<a href="' + entry.url + '">' + entry.name + "</a> " +
            "(" + Math.floor(d / 60) + "h" + (d % 60 == 0? "" : (d % 60 < 10? "0" : "") + (d % 60).toString())+ ")\n" +
            "ends in <a href=\"" + time_link(entry.name, entry.time) + '">' +  num(min / (60 * 24), 'd ') + num((min / 60) % 24, 'h ') + (min % 60).toString() + "m</a>" +
            "\n\n";
        }
      });

      if (maxContests < validContests)
        result += "And other " + (validContests - maxContests) + " running besides those...";

      if (result == "")
        result = "No running contests :(";

      send(message, result);
    });

    bot.onText(/^\/upcoming(@\w+)*$/, (message) => {
      const user = db.user.get(message.chat.id);
      const maxContests = 7;
      var validContests = 0;
      var result = "";

      upcoming.forEach( (entry) => {
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
            '<a href="' + entry.url + '">' + entry.name + "</a> " +
            "(" + Math.floor(d / 60) + "h" + (d % 60 == 0? "" : (d % 60 < 10? "0" : "") + (d % 60).toString())+ ")\n" +
            "starts in <a href=\"" + time_link(entry.name, entry.time) + '">' +  num(min / (60 * 24), 'd ') + num((min / 60) % 24, 'h ') + (min % 60).toString() + "m</a>" +
            "\n\n";
        }
      });

      if (maxContests < validContests)
        result += "And other " + (validContests - maxContests) + " scheduled in the next 2 weeks...";

      if (result == "")
        result = "No upcoming contests :(";

      send(message, result);
    });

    bot.onText(/^\/refresh(@\w+)*$/, (message) => {
      if (Date.now() - last_refresh.getTime() < 1000 * 60 * 10) {
        send(message, "Contest list was refreshed less than 10 minutes ago.");
      } else {
        send(message, "Refreshing contest list... Please wait a bit before using /upcoming.");
        judgefetcher.updateUpcoming(upcoming);
        last_refresh = new Date();
      }
    });

    bot.onText(/^\/start(@\w+)*$/, (message) => {
      var response = "";

      var id = message.chat.id;
      var user = db.user.get(id);

      if (user.get('notify').value() === true) {
        response = "Looks like you're already registered for reminders. ";
      } else {
        user
          .set('notify', true)
          .write();
        response = "You have been registered and will receive reminders for the contests! ";
      }
      response += "Use /stop if you want to stop receiving reminders.";
      send(message, response);
    });

    bot.onText(/^\/stop(@\w+)*$/m, (message) => {
      var response = "";

      var user = db.user.get(message.chat.id);

      if (user.get('notify').value() === false) {
        response = "Looks like you're already not registered for reminders. ";
      } else {
        user
          .set('notify', false)
          .write();
        response = "You have been unregistered and will not receive reminders for the contests :(. ";
      }
      response += "Use /start if you want to receive reminders.";
      send(message, response);
    });

    bot.onText(/^\/enable(@\w+)*/m, (message) => {
      var pars = message.text.split(' ');
      var response = "";
      if (pars.length < 2) {
        response = "No judge specified.";
      } else {
        var user = db.user.get(message.chat.id);
        var judge = pars[1];

        var ignored = user
          .has('ignore.' + judge)
          .value();

        if (ignored === true) {
          user
            .unset('ignore.' + judge)
            .write();
          response = "Ok! Now this judge no longer ignored for you!";
          console.log("Enable " + judge + " on " + message.chat.id);
        } else {
          response = "You are not ignoring this judge.";
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
        var user = db.user.get(message.chat.id);
        var judge = pars[1];

        var ignored = user
          .has('ignore.' + judge)
          .value();

        if (ignored === false) {
          user
            .set('ignore.' + judge, true)
            .write();
          response = "Ok! Now this judge is now ignored for you!";
          console.log("Disable " + judge + " on " + message.chat.id);
        } else {
          response = "You are already ignoring this judge.";
        }
      }

      send(message, response);
    });

    bot.onText(/^\/judges(@\w+)*$/m, (message) => {
      var user = db.user.get(message.chat.id);

      var response = "You can /enable or /disable judges with the commands as you wish. Try typing /enable calendar.\n\n";
      response += "Supported Judges: \n"

      var vals = [
        ['codeforces', ''],
        ['topcoder', ''], 
        ['codechef', ''],
        ['csacademy', ''],
        ['atcoder', ''],
        ['calendar', ' : manually inputed. (codejam, yandex, local events, etc)']
      ];

      for (var i = 0; i < vals.length; i++) {
        var state = user
          .has('ignore.' + vals[i][0])
          .value();

        if (state === true)
          response += '[ignored] ';
        response += vals[i][0] + vals[i][1] + '\n';
      }

      send(message, response);
    });

    bot.onText(/^\/help(@\w+)*$/m, (message) => {
      send(message, "Hello, I am ContestWatcher Bot :D. I list programming contests from Codeforces, Topcoder, Codechef, CSAcademy and AtCoder.\n\n" +
           "You can control me by sending these commands: \n\n" +
           "/start - Start receiving reminders before the contests. I'll send a reminder 1 day and another 1 hour before each contest.\n" +
           "/stop - Stop receiving reminders.\n" +
           "/upcoming - show the next scheduled contests.\n" +
           "/running - show running contests.\n" +
           "/refresh - refresh the contest list. This is done automatically once per day.\n" +
           "/judges - list supported judges.\n" +
           "/enable judge - enable notifications for some judge.\n" +
           "/disable judge - disable notifications for some judge.\n" +
           "/help - shows this help message.");
    });

    bot.onText(/^\/hue(@\w+)*$/, (message) => {
        bot.sendAudio(message.chat.id, 'audio/gas.ogg');
    });

    module.exports.bot = bot;
  }
};
