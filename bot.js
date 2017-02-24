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
      result +=
        dateformat(entry.time, "dd mmm yyyy HH:mm") + " | " + 
        "[" + entry.name + "](" + entry.url + ") " + 
        "(" + (entry.duration/60) + "min)" + 
        "  \n";
    }
  });

  if (maxContests < validContests)
    result += "And other " + (validContests - maxContests) + " scheduled after those...";

  return result;
}

module.exports = (upcoming, judgefetcher) => {
  const bot = new Bot({token: process.env.TELEGRAM_TOKEN});

  bot.on('error', (err) => {
    console.log('Bot Error: ' + err.message);
  });

  bot.on('message', function (message) {
    if (message.text == '/upcoming') {
      bot.sendMessage({
        chat_id: message.from.id,
        text: formatMessage(upcoming),
        parse_mode: 'Markdown'
      });
    } else if (message.text == '/refresh') {
      judgefetcher.updateUpcoming(upcoming);
    }

  });

  bot.start();
}
