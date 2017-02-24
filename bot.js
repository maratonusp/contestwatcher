const Bot = require('node-telegram-bot');
const dateformat = require('dateformat');
const process = require('process');

const formatMessage = (upcoming) => {
  var result = "";

  upcoming.forEach( (entry) => {
    result += 
      dateformat(entry.time, "HH:MM dd mmm yyyy") + " | " + 
      "[" + entry.name + "](" + entry.url + ")" + 
      "  \n";
  });

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
