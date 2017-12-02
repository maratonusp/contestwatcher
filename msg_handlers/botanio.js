/* Sending data to botanio */
const botan = require('botanio')(process.env.BOTANIO_TOKEN);
const using_botanio = (process.env.BOTANIO_TOKEN !== undefined);
console.log("Using botan.io: " + using_botanio);

const botanio = module.exports = {};

botanio.init = function() {
  // botanio tracks commands data
  if(using_botanio) {
    bot.onText(/^\/\w+/, (message) => {
      const command = message.text.match(/^\/(\w+)/)[1];
      botan.track(message, command, (err, res, body) => {
        if(err)
          console.log("Botan.io error: " + err);
      });
    });
  }
}
