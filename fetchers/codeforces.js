const http = require('http');
const EventEmitter = require('events');
const schedule = require('node-schedule');
const bot = require('../bot');
const db = require('../db');
const qs = require('querystring');
const process = require('process');

/* Calls method name with arguments args (from codeforces API), returns an emitter that calls 'end' returning the parsed JSON when the request ends. The emitter returns 'error' instead if something went wrong */
call_cf_api = function(name, args) {
  const emitter = new EventEmitter();
  http.get('http://codeforces.com/api/' + name + '?' + qs.stringify(args), (res) => {
    if (res.statusCode !== 200) {
      console.log('Call to ' + name + ' failed [' + res.statusCode + ']');
      res.resume();
      emitter.emit('error');
      return;
    }
    res.setEncoding('utf8');

    let data = '';

    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      try {
        const obj = JSON.parse(data);
        if (obj.status == "FAILED") {
          console.log('Call to ' + name + ' failed.\nComment: ' + obj.comment);
          emitter.emit('error');
          return;
        }
        emitter.emit('end', obj.result);
      } catch(e) { emmiter.emit('error'); }
    }).on('error', (e) => {
      console.log('Call to ' + name ' failed\n' + e.message);
      emitter.emit('error');
    });
  });

  return emitter;
};

const contest_end_handlers = [];

/* Sends msg to all users that receive codeforces notifications */
simple_msg_all = function(msg) {
  db.low
    .get('users')
    .reject((user) => { return !user.notify || user.ignore["codeforces"]; })
    .map('id')
    .value()
    .forEach((id) => {
      bot.bot.sendMessage(id, msg, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      });
    });
}

/* Called when ratings are changed */
process_final = function(ev, contest_id) {
  simple_msg_all('Ratings for [' + ev.name + '](' + ev.url + ') are out!');
}

/* Called when system testing ends, checks for rating changes */
process_ratings = function(ev, contest_id) {
  simple_msg_all('System testing has finished for [' + ev.name + '](' + ev.url + '). Waiting for rating changes.');
  var count_all = 0;
  var ratings_wait;
  ratings_wait = schedule.scheduleJob('/20 * * * * *', (handle) => {
    call_cf_api('contest.ratingChanges', {contestId: contest_id})
      .on('end', (obj) => {
        if (obj.length > 0) {
          ratings_wait.cancel();
          process_final(ev, contest_id);
        }
        if (count_all++ > 1440 * 3) // 1 day
          ratings_wait.cancel();
      }).on('error', () => {
        if (count_all++ > 1440 * 3) // 1 day
          ratings_wait.cancel()
      });
  });
}

/* Called when system testing starts, checks for end of system testing */
process_systest = function(ev, contest_id) {
  simple_msg_all('System testing has started for [' + ev.name + '](' + ev.url + ').');
  var count_all = 0;
  var systest_wait;
  systest_wait = schedule.scheduleJob('/20 * * * * *', (handle) => {
    call_cf_api('contest.standings', {contestId: contest_id, from: 1, count: 1})
      .on('end', (obj) => {
        const c = obj.contest;
        if (c.phase == 'FINISHED') {
          systest_wait.cancel();
          process_ratings(ev, contest_id);
        }
        if (count_all++ > 1440 * 3) // 1 day
          systest_wait.cancel();
      }).on('error', () => {
        if (count_all++ > 1440 * 3) // 1 day
          systest_wait.cancel()
      });
  });
}

/* Called when contest ends, checks for start of system testing */
process_contest_end = function(ev, contest_id) {
  simple_msg_all('[' + ev.name + '](' + ev.url + ') has just ended. Waiting for system testing.');
  var count_all = 0;
  var systest_wait;
  systest_wait = schedule.scheduleJob('/20 * * * * *', (handle) => {
    call_cf_api('contest.standings', {contestId: contest_id, from: 1, count: 1})
      .on('end', (obj) => {
        const c = obj.contest;
        if (c.phase == 'SYSTEM_TEST' || c.phase == 'FINISHED') {
          systest_wait.cancel();
          process_systest(ev, contest_id);
        }
        if (count_all++ > 1440 * 3) // 1 day
          systest_wait.cancel();
      }).on('error', () => {
        if (count_all++ > 1440 * 3) // 1 day
          systest_wait.cancel()
      });
  });
};


module.exports = {
  updateUpcoming: (upcoming) => {
    const emitter = new EventEmitter();

    contest_end_handlers.forEach((h) => { if (h) h.cancel(); });
    contest_end_handlers.length = 0;

    call_cf_api('contest.list', null).on('end', (parsedData) => {
      try {
        upcoming.length = 0;
        parsedData.result.forEach( (el) => {
          if (el.phase === "BEFORE" || el.phase === "CODING") {
            const ev = {
              judge: 'codeforces',
              name: el.name,
              url: 'http://codeforces.com/contests/' + el.id,
              time: new Date(el.startTimeSeconds*1000),
              duration: el.durationSeconds
            };
            upcoming.push(ev);
            if (el.type === "CF")
              contest_end_handlers.push(schedule.scheduleJob(new Date((el.startTimeSeconds + el.durationSeconds) * 1000),
                    () => { process_contest_end(ev, el.id); }));
          }
        });

        upcoming.sort( (a, b) => { return a.time - b.time; });

        emitter.emit('end');
      } catch (e) {
        console.log('Parse Failed Codeforces\n' + e.message);
      }
    });

    return emitter;
  }
};
