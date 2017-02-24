const Bot = require('node-telegram-bot');
const dateformat = require('dateformat');
const process = require('process');

const formatMessage = (upcoming) => {
  const maxContests = 7;
  var validContests = 0;
  var result = "";

  upcoming.forEach( (entry) => {
    validContests++;

    if (validContests <= maxContests) {
      const d = entry.duration / 60
      result +=
        dateformat(entry.time, "dd mmm yyyy HH:mm") + " | " + 
        "[" + entry.name + "](" + entry.url + ") " + 
        "(" + (d / 60) + "h" + (d % 60 == 0? "" : (d % 60).toString())+ ")" +
        "  \n";
    }
  });

  if (maxContests < validContests)
    result += "And other " + (validContests - maxContests) + " scheduled after those...";

  return result;
}

let last_refresh = new Date(0);

module.exports = {
  registered_users: {},
  create_bot: (upcoming, judgefetcher) => {
    const bot = new Bot({token: process.env.TELEGRAM_TOKEN});

    bot.on('error', (err) => {
      console.log('Bot Error: ' + err.message);
    });
    const send = function(msg, txt) {
      bot.sendMessage({
        chat_id: msg.chat.id,
        text: txt,
        parse_mode: 'Markdown'
      });
    };

    bot.on('upcoming', (message) => {
      send(message, formatMessage(upcoming));
    }).on('refresh', (message) => {
      if (Date.now() - last_refresh < 1000 * 60 * 10) {
        send(message, "Contest list was refreshed less than 10 minutes ago.");
      } else {
        send(message, "Refreshing contest list... Please wait a bit before using /upcoming.");
        judgefetcher.updateUpcoming(upcoming);
        last_refresh = Date.now();
      }
    }).on('start', (message) => {
      module.exports.registered_users[message.chat.id] = true;
      send(message, "You have been registered and will receive reminders for the contests! Use /stop if you don't want to receive reminders anymore.");
      console.log("Registering user " + message.chat.id);
    }).on('stop', (message) => {
      delete module.exports.registered_users[message.chat.id];
      send(message, "You will no longer receive reminders for the contests :(. Use /start if you want to receive reminders again.");
      console.log("Deleting user " + message.chat.id);
    }).on('help', (message) => {
      send(message, "Hello, I am ContestWatcher Bot :D. I list programming contests from Codeforces, Topcoder, Codechef and CSAcademy.\n\n" +
           "You can control me by sending these commands: \n\n" +
           "/start - Start receiving reminders before the contests. I'll send a reminder 1 day and another 1 hour before each contest.\n" +
           "/stop - Stop receiving reminders.\n" +
           "/upcoming - show the next scheduled contests.\n" +
           "/refresh - resfresh the contest list. This is done automatically once per day.\n" +
           "/help - shows this help message.");

      });

    bot.start();
    module.exports.bot = bot;
  }
};
