const http = require('http');
const judge = require('./judge/index');

const hostname = '127.0.0.1';
const port = 3000;

// fetcher
var upcoming = [];
judge.updateUpcoming(upcoming);

// bot
const bot = require('./bot')(upcoming, judge);

// server
const server = http.createServer((req, res) => {
  res.end(JSON.stringify(upcoming));
});

server.listen(port, hostname, () => {
  console.log('Server running at http://' + hostname + ':' + port + '/');
});
