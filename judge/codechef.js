const jsdom = require('jsdom')
const EventEmitter = require('events');

module.exports = {
  updateUpcoming: (upcoming) => {
    const emitter = new EventEmitter();

    jsdom.env("https://www.codechef.com/contests",
        ["http://code.jquery.com/jquery.js"],
        (err, window) => {
          if (err) {
            console.log("Failed on CSAcademy.");
            res.resume();
            return;
          }
          const $ = window.$
          const list = $("table.dataTable:eq(1)").children('tbody').children()
          upcoming.lenght = 0;
          list.find('a').each((i, x) => {
            if (/Challenge|Cook|Lunchtime/.test(x.text)) {
              const contest = list.eq(i).children(); // contest to be added
              const start = new Date(contest.filter('.start_date').text());
              const end = new Date(contest.filter('.end_date').text());
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
