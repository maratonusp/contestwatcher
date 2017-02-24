const http = require('http');
const EventEmitter = require('events');

module.exports = {
  updateUpcoming: (upcoming) => {
    const emitter = new EventEmitter();

    http.get('http://codeforces.com/api/contest.list', (res) => {
      let error;

      if (res.statusCode !== 200) {
        error = new Error('Fetch Failed [' + res.statusCode + '] Codeforces');
      }

      if (error) {
        console.log(error.message);
        res.resume(); // free
        return;
      }
      
      res.setEncoding('utf8');

      let rawData = '';

      res.on('data', (chunk) => rawData += chunk);
      res.on('end', () => {
        try {
          let parsedData = JSON.parse(rawData);

          upcoming.length = 0;
          parsedData.result.forEach( (el) => {
            if (el.phase === "BEFORE") {
              upcoming.push({
                judge: 'codeforces',
                name: el.name,
                url: 'http://codeforces.com/contests/' + el.id,
                time: new Date(el.startTimeSeconds*1000),
                duration: el.durationSeconds
              });
            }
          });

          upcoming.sort( (a, b) => { return a.time - b.time; });

          emitter.emit('end');
        } catch (e) {
          console.log('Parse Failed Codeforces\n' + e.message);
        }
      });
    }).on('error', (e) => {
      console.log('Request Error Codeforces\n' + e.message);
    });

    return emitter;
  }
};
