const jsdom = require('jsdom')
const EventEmitter = require('events');
const moment = require('moment-timezone');

module.exports = {
  updateUpcoming: (upcoming) => {
    const emitter = new EventEmitter();

    jsdom.env("https://atcoder.jp/contest",
        ["http://code.jquery.com/jquery.js"],
        (err, window) => {
          if (err) {
            console.log("Failed on AtCoder.");
            return;
          }
          const $ = window.$;
          var list = $('div.table-responsive').children('table:lt(2)').children('tbody').children('tr').slice(1);
          for(var i = 0; i < list.length; i++) {
            const info = list.eq(i).children('td');
            const _name = info.eq(1).find('a').text();
            const _start = moment.tz(info.first().find('a').text(), 'YYYY/MM/DD HH:mm', 'Asia/Tokyo');
            const _dur = info.eq(2).text().match(/(\d+):(\d+)/);
            if(!_start.isValid() || _dur.length < 3) {
              console.log("AtCoder invalid dates for " + _name)
              continue;
            }
            console.log(info.eq(1).find('a').attr('href'))
            upcoming.push({
              judge: 'atcoder',
              name: _name,
              url: info.eq(1).find('a').attr('href'),
              time: _start.toDate(),
              duration: _dur[1] * 3600 + _dur[2] * 60
            });
          }
          emitter.emit('end');
        });

    return emitter;
  }
}
