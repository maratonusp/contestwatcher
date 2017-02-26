const EventEmitter = require('events');
const ical = require('ical');

module.exports = {
  updateUpcoming: (upcoming) => {
    const emitter = new EventEmitter();

    ical.fromURL(
      'https://calendar.google.com/calendar/ical/appirio.com_bhga3musitat85mhdrng9035jg%40group.calendar.google.com/public/basic.ics', 
      {},
      (err, data) => {
        upcoming.length = 0;

        for (var key in data) {
          if (!data.hasOwnProperty(key))
            continue;
          var el = data[key];

          if (/(SRM|TCO)/g.test(el.summary)) {
            var entry = {
              judge: 'topcoder',
              name: el.summary,
              url: 'http://topcoder.com/',
              time: new Date(el.start),
              duration: (el.end - el.start) / 1000
            };

            if (entry.time >= Date.now())
              upcoming.push(entry);
          }
        }

        upcoming.sort( (a, b) => { return a.time - b.time; });

        emitter.emit('end');
      }
    );

    return emitter;
  }
};
