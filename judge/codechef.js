const jsdom = require('jsdom')
const EventEmitter = require('events');
const moment = require('moment-timezone')

module.exports = {
  updateUpcoming: (upcoming) => {
    const emitter = new EventEmitter();

    jsdom.env("https://www.codechef.com/contests",
        ["http://code.jquery.com/jquery.js"],
        (err, window) => {
          if (err) {
            console.log("Failed on CodeChef.");
            res.resume();
            return;
          }
          const $ = window.$
          const list = $("table.dataTable:eq(1)").children('tbody').children()
          upcoming.length = 0;
          list.find('a').each((i, x) => {
            if (/Challenge|Cook|Lunchtime/.test(x.text)) {
              const contest = list.eq(i).children(); // contest to be added
              const start = moment.tz(contest.filter('.start_date').text(), 'Asia/Colombo').toDate();
              const end = moment.tz(contest.filter('.end_date').text(), 'Asia/Colombo').toDate();
              upcoming.push({
                judge: 'codechef',
                name: x.text,
                url: x.href,
                time: start,
                duration: (end.getTime() - start.getTime()) / 1000
              });
            }
          });

          emitter.emit('end');
        });

    return emitter;
  }
}
