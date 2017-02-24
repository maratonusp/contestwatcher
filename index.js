const http = require('http');
const schedule = require('node-schedule');

const judge = require('./judge/index');
const bot = require('./bot');

const hostname = '127.0.0.1';
const port = 3000;

// fetcher
var upcoming = [];
judge.updateUpcoming(upcoming);

// Update everyday at 3am
const rule = new schedule.RecurrenceRule();
rule.hour = 3;
rule.minute = 0;
rule.second = 0;
schedule.scheduleJob(rule, () => { judge.updateUpcoming(upcoming); });

// bot
bot.create_bot(upcoming, judge);

// server
const server = http.createServer((req, res) => {
  res.end(JSON.stringify(upcoming));
});

server.listen(port, hostname, () => {
  console.log('Server running at http://' + hostname + ':' + port + '/');
});
