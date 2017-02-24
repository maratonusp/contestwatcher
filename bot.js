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


    bot.on('message', function (message) {
      const send = function(msg) {
        bot.sendMessage({
          chat_id: message.from.id,
          text: msg,
          parse_mode: 'Markdown'
        });
      };
      if (message.text == '/upcoming') {
        send(formatMessage(upcoming));
      } else if (message.text == '/refresh') {
        if (Date.now() - last_refresh < 1000 * 60 * 10) {
          send("Contest list was refreshed less than 10 minutes ago.");
        } else {
          send("Refreshing contest list... Please wait a bit before using /upcoming.");
          judgefetcher.updateUpcoming(upcoming);
          last_refresh = Date.now();
        }
      } else if (message.text == '/start') {
        module.exports.registered_users[message.from.id] = true;
        send("You have been registered and will receive reminders for the contests! Use /stop if you don't want to receive reminders anymore.");
        console.log("Registering user " + message.from.id);
      } else if (message.text == '/stop') {
        delete module.exports.registered_users[message.from.id];
        send("You will no longer receive reminders for the contests :(. Use /start if you want to receive reminders again.");
        console.log("Deleting user " + message.from.id);
      } else if (message.text == '/help') {
        send("Hello, I am ContestWatcher Bot :D. I list programming contests from Codeforces, Topcoder, Codechef and CSAcademy.\n\n" +
             "You can control me by sending these commands: \n\n" +
             "/start - Start receiving reminders before the contests. I'll send a reminder 1 day and another 1 hour before each contest.\n" +
             "/stop - Stop receiving reminders.\n" +
             "/upcoming - show the next scheduled contests.\n" +
             "/refresh - resfresh the contest list. This is done automatically once per day.\n" +
             "/help - shows this help message.");

      }
    });

    bot.start();
    module.exports.bot = bot;
  }
};
