const http = require('http');
const schedule = require('node-schedule');
const process = require('process');
const url = require('url');
const fs = require('fs');

const judge = require('./judge/index');
const bot = require('./bot');

const hostname = 'localhost';
const port = (process.env.PORT || 3000);

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
  var reqpath = url.parse(req.url, true).pathname;
  if (reqpath == '/log') {
    fs.readFile('./run.log', 'utf8', function (err, data) {
      if (err)
        res.end('ERROR: Could not read log.');
        res.end(err);
      else
        res.end(data);
    });
  } else {
    res.end(JSON.stringify(upcoming));
  }
});

server.listen(port, hostname, () => {
  console.log('Server running at http://' + hostname + ':' + port + '/');
});
