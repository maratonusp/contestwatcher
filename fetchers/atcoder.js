const jsdom = require('jsdom')
const EventEmitter = require('events');
const moment = require('moment-timezone');

function isNumeric(string) {
    return !isNaN(string);
}

/* Validate a duration array
Expected format ['HH', 'mm'];
*/
function valid(duration){
    return duration.length == 2
    && isNumeric(duration[0])
    && isNumeric(duration[1])
    && parseInt(duration[1]) < 60;
}

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
          upcoming.length = 0;
          const $ = window.$;
          /* There's no specific classes or ids for the tables.
            We gather information of the tables that follow the "Active Contests" and "Upcoming Contests" headers.
          */
          var contests = $(':header:contains("Active Contests"), :header:contains("Upcoming Contests") + div').children('table').children('tbody').children('tr');
          contests.each(function (){
              const row = $(this).children('td');
              const name = row.eq(1).find('a').text();

              /* There's always this practice contest */
              if(name == 'practice contest') return;

              const start = moment.tz(row.eq(0).find('a').text(), 'YYYY/MM/DD HH:mm', 'Asia/Tokyo');
              const duration = row.eq(2).text().split(':'); /* HH:mm */
              const url = row.eq(1).find('a').attr('href');
              if(!start.isValid() || !valid(duration)) {
                console.log("AtCoder invalid dates for " + name);
                console.log("\t Start: " + start);
                console.log("\t Duration: " + duration);
                return;
              }
              upcoming.push({
                judge: 'atcoder',
                name: name,
                url: url,
                time: start.toDate(),
                duration: duration[0] * 3600 + duration[1] * 60
              });
            });
          emitter.emit('end');
        });

    return emitter;
  }
}
