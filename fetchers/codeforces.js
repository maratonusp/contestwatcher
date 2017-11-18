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

  emitter.on('error', (extra_info) => {
    console.log('Call to ' + name + ' failed. ' + extra_info);
  });

  http.get('http://codeforces.com/api/' + name + '?' + qs.stringify(args), (res) => {
    if (res.statusCode !== 200) {
      res.resume();
      emitter.emit('error', 'Status Code: ' + res.statusCode);
      return;
    }
    res.setEncoding('utf8');

    let data = '';

    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      try {
        const obj = JSON.parse(data);
        if (obj.status == "FAILED") {
          emitter.emit('error', 'Comment: ' + obj.comment);
          return;
        }
        emitter.emit('end', obj.result);
      } catch(e) { emmiter.emit('error', ''); }
    }).on('error', (e) => {
      emitter.emit('error', e.message);
    });
  }).on('error', (e) => {
    emitter.emit('error', e.message);
  });

  return emitter;
};

/* Calls cf api function 'name' every 30 seconds until condition is satisfied, and then calls callback. Tries at most for a day, if it is not satisfied, then it gives up. */
wait_for_condition_on_api_call = function(name, args, condition, callback) {
  const emitter = new EventEmitter();
  var count_calls = 0;
  var handle = schedule.scheduleJob('/30 * * * * *', () => {
    call_cf_api(name, args)
      .on('end', (obj) => {
        if (condition(obj)) {
          handle.cancel();
          callback(obj);
        } else if (count_calls++ > 2 * 60 * 24) // 1 day
          handle.cancel();
      }).on('error', () => {
        if (count_all++ > 2 * 60 * 24) // 1 day
          handle.cancel()
      });
  });
}

const contest_end_handlers = [];

const cf_msg_buffer = [];

flush_cf_msgs = function() {
  if(cf_msg_buffer.length === 0)
    return;
  var msg = cf_msg_buffer.join('\n');
  cf_msg_buffer.length = 0;
  db.low
    .get('users')
    .reject((user) => { return !user.notify || user.ignore["codeforces"]; })
    .map('id')
    .value()
    .forEach((id) => {
      bot.sendMessage(id, msg, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      });
    });
}

/* Schedules msg to all users that receive codeforces notifications. (tries to group messages together) */
simple_msg_all = function(msg) {
  cf_msg_buffer.push(msg)
  var in15s = new Date(Date.now() + 15 * 1000);
  schedule.scheduleJob(in15s, flush_cf_msgs);
}

/* Called when ratings are changed */
process_final = function(ev, contest_id) {
  simple_msg_all('Ratings for [' + ev.name + '](' + ev.url + ') are out!');
}

/* Called when system testing ends, checks for rating changes */
process_ratings = function(ev, contest_id) {
  simple_msg_all('System testing has finished for [' + ev.name + '](' + ev.url + '). Waiting for rating changes.');
  wait_for_condition_on_api_call('contest.ratingChanges', {contestId: contest_id},
    /* condition */ (obj) => obj.length > 0,
    /* callback */  () => process_final(ev, contest_id));
}

/* Called when system testing starts, checks for end of system testing */
process_systest = function(ev, contest_id) {
  simple_msg_all('System testing has started for [' + ev.name + '](' + ev.url + ').');
  wait_for_condition_on_api_call('contest.standings', {contestId: contest_id, from: 1, count: 1},
    /* condition */ (obj) => obj.contest.phase == 'FINISHED',
    /* callback */  () => process_ratings(ev, contest_id));
}

/* Called when contest ends, checks for start of system testing */
process_contest_end = function(ev, contest_id) {
  simple_msg_all('[' + ev.name + '](' + ev.url + ') has just ended. Waiting for system testing.');
  wait_for_condition_on_api_call('contest.standings', {contestId: contest_id, from: 1, count: 1},
    /* condition */ (obj) => obj.contest.phase == 'SYSTEM_TEST' || obj.contest.phase == 'FINISHED',
    /* callback */  () => process_systest(ev, contest_id));
}

/* Checks if contest really ended. (was not extended) */
prelim_contest_end = function(ev, contest_id) {
  wait_for_condition_on_api_call('contest.standings', {contestId: contest_id, from: 1, count: 1},
    /* condition */ (obj) => obj.contest.phase !== 'BEFORE' && obj.contest.phase !== 'CODING',
    /* callback */  () => process_contest_end(ev, contest_id));
}


module.exports = {
  updateUpcoming: (upcoming) => {
    const emitter = new EventEmitter();

    contest_end_handlers.forEach((h) => { if (h) h.cancel(); });
    contest_end_handlers.length = 0;

    call_cf_api('contest.list', null).on('end', (parsedData) => {
      try {
        upcoming.length = 0;
        parsedData.forEach( (el) => {
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
              contest_end_handlers.push(schedule.scheduleJob(new Date((el.startTimeSeconds + el.durationSeconds - 15) * 1000),
                    () => { prelim_contest_end(ev, el.id); }));
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
