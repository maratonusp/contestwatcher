const EventEmitter = require('events');
const schedule = require('node-schedule');
const bot = require('../bot');
const db = require('../db');
const cfAPI = require('../judgeAPIs/cfAPI');
const html_msg = require('../html-msg');

const contest_end_handlers = [];

flush_cf_msgs = function(buffer, rejectExtra) {
  if(buffer.length === 0)
    return;
  let msg = buffer.join('\n');
  buffer.length = 0;
  db.low
    .get('users')
    .reject((user) => { return !user.notify || user.ignore["codeforces"] || (rejectExtra && rejectExtra(user)); })
    .map('id')
    .value()
    .forEach((id) => {
      bot.sendMessage(id, msg, {
        parse_mode: 'html',
        disable_web_page_preview: true
      });
    });
}

/* Schedules msg to all users that receive codeforces notifications. (tries to group messages together) */
const cf_simple_buffer = [];
simple_msg_all = function(msg) {
  cf_simple_buffer.push(msg);
  let in15s = new Date(Date.now() + 15 * 1000);
  schedule.scheduleJob(in15s, () => flush_cf_msgs(cf_simple_buffer, null));
}

const in_contest_ids = new Set();
var in_contest_handles = [];

/* Schedules msg to all users in current contest. (tries to group messages together) */
const cf_contest_buffer = [];
contest_msg_all = function(msg) {
  cf_contest_buffer.push(msg);
  let in15s = new Date(Date.now() + 15 * 1000);
  schedule.scheduleJob(in15s, () => flush_cf_msgs(cf_contest_buffer, (user) => !in_contest_ids.has(user.id)));
}

/* Called when ratings are changed */
process_final = function(ratings, ev, contest_id) {
  const mp = new Map();
  ratings.forEach((r) => mp.set(r.handle, r));
  db.low
    .get('users')
    .reject((user) => { return !user.notify || user.ignore["codeforces"] || !in_contest_ids.has(user.id); })
    .value()
    .forEach((user) => {
      let msg = 'Ratings for ' + html_msg.make_link(ev.name, ev.url) + ' are out!';
      let rs = []; // ratings for handles from user
      user.cf_handles.forEach((h) => {
        if(mp.has(h))
          rs.push(mp.get(h));
      });
      rs.sort((a, b) => a.rank - b.rank);
      rs.forEach((r) => {
        let prefix = "";
        if(r.newRating >= r.oldRating) prefix = "+";
        msg += '\n\n<b>' + html_msg.escape(r.handle) + '</b>\n' + html_msg.escape(r.oldRating + ' → '+ r.newRating + ' (' + prefix + (r.newRating - r.oldRating) + ')');
      });
      bot.sendMessage(user.id, msg, { parse_mode: 'html', disable_web_page_preview: true });
    });
}

/* Called when system testing ends, checks for rating changes */
process_ratings = function(ev, contest_id) {
  contest_msg_all('System testing has finished for ' + html_msg.make_link(ev.name, ev.url) + '. Waiting for rating changes.');
  cfAPI.wait_for_condition_on_api_call('contest.ratingChanges', {contestId: contest_id},
    /* condition */ (obj) => obj.length > 0,
    /* callback */  (obj) => process_final(obj, ev, contest_id));
}

/* Called when system testing starts, checks for end of system testing */
process_systest = function(ev, contest_id) {
  contest_msg_all('System testing has started for ' + html_msg.make_link(ev.name, ev.url) + '.');
  cfAPI.wait_for_condition_on_api_call('contest.standings', {contestId: contest_id, from: 1, count: 1},
    /* condition */ (obj) => obj.contest.phase == 'FINISHED',
    /* callback */  () => process_ratings(ev, contest_id));
}

/* Called when contest ends, checks for start of system testing */
process_contest_end = function(ev, contest_id) {
  contest_msg_all(html_msg.make_link(ev.name, ev.url) + ' has just ended. Waiting for system testing.');
  cfAPI.wait_for_condition_on_api_call('contest.standings', {contestId: contest_id, from: 1, count: 1},
    /* condition */ (obj) => obj.contest.phase == 'SYSTEM_TEST' || obj.contest.phase == 'FINISHED',
    /* callback */  () => process_systest(ev, contest_id));
}

/* Checks if contest really ended (was not extended) and collects participating handles. */
prelim_contest_end = function(ev, contest_id) {
  in_contest_ids.clear();
  in_contest_handles.length = 0;
  const user_handles = new Set();
  db.low
    .get('users')
    .map('cf_handles')
    .value()
    .forEach((hs) => { if(hs) hs.forEach((h) => user_handles.add(h)); });
  console.log("Total handle count: " + user_handles.size);
  cfAPI.call_cf_api('contest.standings', {contestId: contest_id, showUnofficial: true}, 2)
    .on('end', (obj) => {
      const handles_in_contest = new Set();
      obj.rows.forEach((row) => row.party.members.forEach((m) => { if(user_handles.has(m.handle)) handles_in_contest.add(m.handle); }));
      console.log("CF contest " + ev.name + " has " + handles_in_contest.size + " participants.");
      if(handles_in_contest.size === 0) return;
      in_contest_handles = Array.from(handles_in_contest);

      db.low
        .get('users')
        .value()
        .forEach((user) => {
          if(user.cf_handles)
            user.cf_handles.forEach((h) => { if(handles_in_contest.has(h)) in_contest_ids.add(user.id); });
        });
      console.log("CF contest " + ev.name + " has participants from " + in_contest_ids.size + " chats.");

      cfAPI.wait_for_condition_on_api_call('contest.standings', {contestId: contest_id, from: 1, count: 1},
        /* condition */ (obj) => obj.contest.phase !== 'BEFORE' && obj.contest.phase !== 'CODING',
        /* callback */  () => process_contest_end(ev, contest_id));
    });
}

module.exports = {
  name: "codeforces",
  updateUpcoming: (upcoming) => {
    const emitter = new EventEmitter();

    contest_end_handlers.forEach((h) => { if (h) h.cancel(); });
    contest_end_handlers.length = 0;

    cfAPI.call_cf_api('contest.list', null, 1).on('end', (parsedData) => {
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
              contest_end_handlers.push(schedule.scheduleJob(new Date((el.startTimeSeconds + el.durationSeconds - 60) * 1000),
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
  },
  announceContest: (ev, left) => { simple_msg_all(html_msg.make_link(ev.name, ev.url) + html_msg.escape(' will start in ' + left + '.')); }
};
