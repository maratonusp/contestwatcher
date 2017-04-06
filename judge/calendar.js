const EventEmitter = require('events');
const ical = require('ical');

module.exports = {
  updateUpcoming: (upcoming) => {
    const emitter = new EventEmitter();

    ical.fromURL(
      'https://calendar.google.com/calendar/ical/t313lnucdcm49hus40p3bjhq44%40group.calendar.google.com/public/basic.ics',
      {},
      (err, data) => {
        upcoming.length = 0;

        for (var key in data) {
          if (!data.hasOwnProperty(key))
            continue;
          var el = data[key];

          var entry = {
            judge: 'calendar',
            name: el.summary,
            url: 'https://calendar.google.com/calendar/embed?src=t313lnucdcm49hus40p3bjhq44%40group.calendar.google.com&ctz=America/Sao_Paulo',
            time: new Date(el.start),
            duration: (el.end - el.start) / 1000
          };

          var url;
          if (typeof el.description !== 'undefined')
            url = el.description.split(/\s/g)[0];
          if (typeof url !== 'undefined' && /^http/.test(url))
            entry.url = url;

          if (entry.time >= Date.now())
            upcoming.push(entry);
        }

        upcoming.sort( (a, b) => { return a.time - b.time; });

        emitter.emit('end');
      }
    );

    return emitter;
  }
};
