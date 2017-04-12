const https = require('https');
const EventEmitter = require('events');

module.exports = {
  updateUpcoming: (upcoming) => {
    const emitter = new EventEmitter();

    https.get('https://csacademy.com/contests/', (res) => {
      let error;

      if (res.statusCode !== 200) {
        error = new Error('Fetch Failed [' + res.statusCode + '] CSAcademy');
      }

      if (error) {
        console.log(error.message);
        res.resume(); // free
        return;
      }

      res.setEncoding('utf8');

      let rawData = '';

      upcoming.length = 0
      res.on('data', (chunk) => rawData += chunk);
      res.on('end', () => {
        try {
          let entryRegex = /\{\"longName\".+?\}/g;
          let matched = [];

          while ((matched = entryRegex.exec(rawData)) !== null) {
            var el = JSON.parse(matched[0]);

            if (/\s-\s(algorithms|interviews)$/.test(el.longName) || /^Virtual/.test(el.longName))
              continue;
            if (el.startTime == null)
              continue;

            var entry = {
              judge: 'csacademy',
              name: el.longName,
              url: 'https://csacademy.com/contest/' + el.name,
              time: new Date(el.startTime * 1000),
              duration: el.endTime - el.startTime
            };

            var ending = entry.time;
            ending.setSeconds(ending.getSeconds() + entry.duration);
            if (ending >= Date.now())
              upcoming.push(entry);
          }

          upcoming.sort( (a,b) => { return a.time - b.time; });

          emitter.emit('end');
        } catch (e) {
          console.log('Parse Failed CSAcademy\n' + e.message);
        }
      });
    }).on('error', (e) => {
      console.log('Request Error CSAcademy\n' + e.message);
    });

    return emitter;
  }
};
