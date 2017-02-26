const fs = require('fs');
const Bot = require('node-telegram-bot-api');
const dateformat = require('dateformat');
const process = require('process');

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

const formatMessage = (upcoming) => {
  const maxContests = 7;
  var validContests = 0;
  var result = "";

  upcoming.forEach( (entry) => {
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

  return result;
}

const save_users = function(users) {
  console.log("Saving " + Object.keys(users).length + " users.");
  fs.writeFileSync("./users.json", JSON.stringify(Object.keys(users)));
};

let last_refresh = new Date(0);

module.exports = {
  registered_users: {},
  create_bot: (upcoming, judgefetcher) => {
    const bot = new Bot(process.env.TELEGRAM_TOKEN, {polling: true});

    try {
      const data = fs.readFileSync('./users.json');
      if (data) {
        const users = JSON.parse(data.toString());
        users.forEach((user) => {
          module.exports.registered_users[user] = true;
        });
        console.log("Reading " + users.length + " users.");
      }
    } catch(e) {
      console.log('Could not read users.json');
    }

    const send = function(msg, txt) {
      bot.sendMessage(msg.chat.id, txt, {parse_mode: 'html', disable_web_page_preview: true});
    };

    bot.onText(/^\/upcoming(@\w+)*$/, (message) => {
      send(message, formatMessage(upcoming));
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
      module.exports.registered_users[message.chat.id] = true;
      send(message, "You have been registered and will receive reminders for the contests! Use /stop if you don't want to receive reminders anymore.");
      console.log("Registering user " + message.chat.id);
      save_users(module.exports.registered_users);
    });
    bot.onText(/^\/stop(@\w+)*$/m, (message) => {
      delete module.exports.registered_users[message.chat.id];
      send(message, "You will no longer receive reminders for the contests :(. Use /start if you want to receive reminders again.");
      console.log("Deleting user " + message.chat.id);
      save_users(module.exports.registered_users);
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
