const BotAPI = require('node-telegram-bot-api');
const dateformat = require('dateformat');
const process = require('process');
const html_msg = require('./html-msg');
const EventEmitter = require('events');
const cfAPI = require('./judgeAPIs/cfAPI')

const botan = require('botanio')(process.env.BOTANIO_TOKEN);
const using_botanio = (process.env.BOTANIO_TOKEN !== undefined);
console.log("Using botan.io: " + using_botanio);

const db = require('./db');

const num = (x, pos) => {
  x = Math.floor(x)
  if (x == 0) return "";
  return x + pos;
};

// returns the timeanddate link for given date
const time_link = (name, d) => {
  return "https://www.timeanddate.com/worldclock/fixedtime.html?" +
    "msg=" + encodeURIComponent(name) +
    "&year=" + d.getUTCFullYear() +
    "&month=" + (d.getUTCMonth() + 1).toString() +
    "&day=" + d.getUTCDate() +
    "&hour=" + d.getUTCHours() +
    "&min=" + d.getUTCMinutes() +
    "&sec=" + d.getUTCSeconds();
};

let last_refresh = new Date(0);
// ID of group that controls this bot
const admin_id = -212740289;

var invalid_users = new Set();
var Bot = module.exports = {}

/* Marks invalid users that have blocked the bot */
function mark_invalid() {
  let text = "Deleting " + invalid_users.size + " invalid users.";
  db.low
    .get('users')
    .remove((user) => { return invalid_users.has(user.id); })
    .write();
  invalid_users.clear();
  return text;
}

let add_handle_reply_msg = "Please send me your handle. :D";

/* Adds CF handle to handle list */
function add_handles(message) {
  if(message.text.indexOf(' ') === -1) {
    Bot.sendMessage(message.chat.id, add_handle_reply_msg, {
      reply_to_message_id: message.message_id,
      reply_markup: {
        force_reply: true,
        selective: true
      }
    });
    return;
  }
  const emitter = new EventEmitter();
  const user = db.user.get(message.chat.id);

  emitter.on('add', (handles, wrong_handles) => {
    Array.from(handles).forEach((h) => user.get('cf_handles').push(h).write());
    if (wrong_handles.length == 0) emitter.emit('end', "Handles added successfully :)");
    else {
      wrong_handles.sort()
      wrong_handles = wrong_handles.map((h) => '<code>' + html_msg.escape(h) + '</code>')
      emitter.emit('end', "These handles could not be added: " + wrong_handles.join(', ') + '.')
    }
  });
  emitter.on('end', (txt, handles) => {
    Bot.sendMessage(message.chat.id, txt, {
      parse_mode: 'html',
      disable_web_page_preview: true
    });
  });

  const user_cur = new Set(user.get('cf_handles').value());
  const allHandles =
    Array.from(new Set(
      message.text.slice(message.text.indexOf(' ') + 1)
      .trim().split(' ')))
      .map((h) => h.trim()).
      filter((h) => h.length > 0 && !user_cur.has(h));
  if(!user.has('cf_handles').value())
    user.set('cf_handles', []).write();
  if(allHandles.length === 0)
    emitter.emit('end', "No new handles to add.");
  else {
    if (allHandles.length > 100) {
      console.log('User ' + message.chat.id + ' tried to add more than 100 handles.');
      emitter.emit('end', "I'm not about to do that.");
    } else {
      const handles_set = new Set(allHandles);
      cfAPI.call_cf_api('user.info', {handles: allHandles.join(';')}, 1).on('error', () => {
        var wrong_handles = []
        var handlesToAdd = allHandles.length
        emitter.on('check', (handle) => {
          cfAPI.call_cf_api('user.info', {handles: handle}, 2).on('error', () => {
            wrong_handles.push(handle);
            handles_set.delete(handle)
            if (--handlesToAdd == 0) emitter.emit('add', handles_set, wrong_handles);
          }).on('end', () => {
            if (--handlesToAdd == 0) emitter.emit('add', handles_set, wrong_handles);
          });
        });
        for (var i in allHandles) {
          emitter.emit('check', allHandles[i]);
        }
      }).on('end', () => {
        emitter.emit('add', handles_set, [])
      })
    }
  }
}

/* Lists added CF handles */
function list_handles(message) {
  const user = db.user.get(message.chat.id);
  let msg;
  if(!user.has('cf_handles').value() || user.get('cf_handles').size().value() == 0)
    msg = "No Codeforces handles.";
  else
    msg = "Codeforces handles: " + user.get('cf_handles').value().join(', ');
  Bot.sendMessage(message.chat.id, msg, {})
}

/* Removes CF handle from handle list */
function rem_handles(message) {
  let msg;
  if(message.text.indexOf(' ') === -1)
    msg = "No handles to remove.";
  else {
    const user = db.user.get(message.chat.id);
    const hs = new Set(message.text.slice(message.text.indexOf(' ') + 1).split(' '))
    if(!user.has('cf_handles').value())
      user.set('cf_handles', []).write();
    user.get('cf_handles').remove((h) => hs.has(h)).write();
    msg = "Handles removed successfully :)";
  }
  Bot.sendMessage(message.chat.id, msg, {});
}

/* Shows help message for handles */
function help_handles(message) {
  let msg = "You can have a list of codeforces handles to watch. If you have " +
    "codeforces notifications enabled, you will be notified about all contests, " +
    "but you will only receive information regarding the system testing and " +
    "rating changes for contests that some user with handle on " +
    "your handle list is participating.\n\n" +
    "The following commands are for handling your handles:\n" +
    "/add_handles h1 h2 h3 - add codeforce handles to your handle list\n" +
    "/rem_handles h1 h2 h3 - remove codeforce handles to your handle list\n" +
    "/list_handles - list codeforce handles in your handle list\n";
  Bot.sendMessage(message.chat.id, msg, {});
}

Bot.create_bot = (upcoming, judgefetcher) => {
  const bot = new BotAPI(process.env.TELEGRAM_TOKEN, {polling: true});

  /* stores messages sent by the last broadcast
   * keys = chatIds, values = messageIds */
  let last_broadcast = {};

  const send = function(msg, txt) {
    Bot.sendMessage(msg.chat.id, txt, {
      parse_mode: 'html',
      disable_web_page_preview: true
    });
  };

  // will match ANYTHING
  bot.on('message', (msg) => {
    // mark last activity
    db.user.get(msg.chat.id).set('last_activity', Date.now()).write();
    // check for reply on handle add
    if(msg.reply_to_message) {
      let rp = msg.reply_to_message;
      if(rp.text === add_handle_reply_msg) {
        let cp = JSON.parse(JSON.stringify(msg)); // deep copy
        cp.text = "/add_handles " + cp.text;
        add_handles(cp);
      }
    }
  });

  // botanio stuff
  if(using_botanio) {
    bot.onText(/^\/\w+/, (message) => {
      const command = message.text.match(/^\/(\w+)/)[1];
      botan.track(message, command, (err, res, body) => {
        if(err)
          console.log("Botan.io error: " + err);
      });
    });
  }

  /* CF handles stuff */
  bot.onText(/^\/list_handles(@\w+)*$/, list_handles);
  bot.onText(/^\/help_handles(@\w+)*$/, help_handles);
  bot.onText(/^\/add_handles(@\w+)* ?.*$/, add_handles);
  bot.onText(/^\/rem_handles(@\w+)* ?.*$/, rem_handles);

  /* If this command comes from adms, replies to them with the same message.
   * Used to test if /broadcast is correctly formatted */
  bot.onText(/^\/mock_broadcast(@\w+)* .*$/, (message) => {
    if(message.chat.id != admin_id) return;
    let text = message.text.slice(message.text.indexOf(' ') + 1);
    Bot.sendMessage(message.chat.id, text, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    });
  });

  /* If this command comes from adms, sends the messsage after the command
   * to all users */
  bot.onText(/^\/broadcast(@\w+)* .*$/, (message) => {
    if(message.chat.id != admin_id) return;
    let text = message.text.slice(message.text.indexOf(' ') + 1);
    last_broadcast = {};
    db.low
      .get('users')
      .map('id')
      .value()
      .forEach((id) => {
        Bot.sendMessage(id, text, {
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        }).then((msg) => {
          last_broadcast[id] = msg.message_id;
        });
      });
  });

  /* If this command comes from adms, edits the last sent
   * broadcast message. Use with care. */
  bot.onText(/^\/edit_broadcast(@\w+)* .*$/, (message) => {
    if(message.chat.id != admin_id) return;
    let text = message.text.slice(message.text.indexOf(' ') + 1);
    db.low
      .get('users')
      .map('id')
      .value()
      .forEach((id) => {
        if(last_broadcast[id] === undefined) return;
        bot.editMessageText(text, {
          chat_id: id,
          message_id: last_broadcast[id],
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        });
      });
  });

  /* If this command comes from adms, useful stats are returned */
  bot.onText(/^\/status(@\w+)*$/, (message) => {
    if(message.chat.id != admin_id) return;
    let text = mark_invalid();
    let recent = 0, valid = 0, notified = 0;
    const now = Date.now();
    const judges = {
      codeforces: 0,
      codechef: 0,
      topcoder: 0,
      csacademy: 0,
      atcoder: 0
    }
    let total_cf_handles = 0;
    db.low
      .get('users')
      .value()
      .forEach((user) => {
        valid++;
        if (user.notify) {
          notified++;
          Object.keys(judges).forEach((judge) => {
            if(!user.ignore[judge])
              judges[judge]++;
          });
        }
        if(user.cf_handles)
          total_cf_handles += user.cf_handles.length;
        if (user.last_activity !== undefined && now - user.last_activity < 7 * 24 * 60 * 60 * 1000)
          recent++;
      });
    text += '\nValid users: ' + valid;
    text += '\nUsers with notification on: ' + notified;
    Object.keys(judges).forEach((judge) => {
      text += "\n" + judge + " notifications on: " + judges[judge];
    });
    text += '\nActive users in the last week: ' + recent;
    text += '\nCF handles total: ' + total_cf_handles;
    send(message, html_msg.escape(text));
  });

  bot.onText(/^\/running(@\w+)*$/, (message) => {
    const user = db.user.get(message.chat.id);
    const maxContests = 7;
    let validContests = 0;
    let result = "";

    upcoming.forEach( (entry) => {
      if (entry.time.getTime() > Date.now())
        return;
      if (entry.time.getTime() + (entry.duration * 1000) < Date.now())
        return;
      if (user.has('ignore.' + entry.judge).value() === true)
        return;

      validContests++;

      if (validContests <= maxContests) {
        const d = entry.duration / 60;
        const min = Math.ceil((entry.time.getTime() + entry.duration*1000 - Date.now()) / (1000 * 60));
        result +=
          html_msg.make_link(entry.name, entry.url) +
          html_msg.escape(" (" + Math.floor(d / 60) + "h" + (d % 60 == 0? "" : (d % 60 < 10? "0" : "") + (d % 60).toString())+ ")\nends in ") +
          html_msg.make_link(num(min / (60 * 24), 'd ') + num((min / 60) % 24, 'h ') + (min % 60).toString() + "m", time_link(entry.name, entry.time)) +
          "\n\n";
      }
    });

    if (maxContests < validContests)
      result += html_msg.escape("And other " + (validContests - maxContests) + " running besides those...");

    if (result == "")
      result = html_msg.escape("No running contests :(");

    send(message, result);
  });

  bot.onText(/^\/upcoming(@\w+)*$/, (message) => {
    const user = db.user.get(message.chat.id);
    const maxContests = 7;
    let validContests = 0;
    let result = "";

    upcoming.forEach( (entry) => {
      if (entry.time.getTime() < Date.now())
        return;
      if (entry.time.getTime() > Date.now() + 14 * 24 * 60 * 60 * 1000) // at most 14 days
        return;
      if (user.has('ignore.' + entry.judge).value() === true)
        return;

      validContests++;

      if (validContests <= maxContests) {
        const d = entry.duration / 60
        const min = Math.ceil((entry.time.getTime() - Date.now()) / (1000 * 60))
        result +=
          html_msg.make_link(entry.name, entry.url) + " " +
          html_msg.escape("(" + Math.floor(d / 60) + "h" + (d % 60 == 0? "" : (d % 60 < 10? "0" : "") + (d % 60).toString())+ ")\n") +
          "starts in " + html_msg.make_link(num(min / (60 * 24), 'd ') + num((min / 60) % 24, 'h ') + (min % 60).toString() + "m", time_link(entry.name, entry.time)) +
          "\n\n";
      }
    });

    if (maxContests < validContests)
      result += html_msg.escape("And other " + (validContests - maxContests) + " scheduled in the next 2 weeks...");

    if (result == "")
      result = html_msg.escape("No upcoming contests :(");

    send(message, result);
  });

  bot.onText(/^\/refresh(@\w+)*$/, (message) => {
    if (Date.now() - last_refresh.getTime() < 1000 * 60 * 10) {
      send(message, html_msg.escape("Contest list was refreshed less than 10 minutes ago."));
    } else {
      send(message, html_msg.escape("Refreshing contest list... Please wait a bit before using /upcoming."));
      judgefetcher.updateUpcoming(upcoming);
      last_refresh = new Date();
    }
  });

  bot.onText(/^\/start(@\w+)*$/, (message) => {
    let response = "";

    let id = message.chat.id;
    let user = db.user.get(id);

    if (user.get('notify').value() === true) {
      response = "Looks like you're already registered for reminders. ";
    } else {
      user
        .set('notify', true)
        .write();
      response = "You have been registered and will receive reminders for the contests! ";
    }
    response += "Use /stop if you want to stop receiving reminders.";
    send(message, html_msg.escape(response));
  });

  bot.onText(/^\/stop(@\w+)*$/m, (message) => {
    let response = "";

    let user = db.user.get(message.chat.id);

    if (user.get('notify').value() === false) {
      response = "Looks like you're already not registered for reminders. ";
    } else {
      user
        .set('notify', false)
        .write();
      response = "You have been unregistered and will not receive reminders for the contests :(. ";
    }
    response += "Use /start if you want to receive reminders.";
    send(message, html_msg.escape(response));
  });

  bot.onText(/^\/enable(@\w+)*/m, (message) => {
    let pars = message.text.split(' ');
    let response = "";
    if (pars.length < 2) {
      response = "No judge specified.";
    } else {
      let user = db.user.get(message.chat.id);
      let judge = pars[1];

      let ignored = user
        .has('ignore.' + judge)
        .value();

      if (ignored === true) {
        user
          .unset('ignore.' + judge)
          .write();
        response = "Ok! Now this judge no longer ignored for you!";
        console.log("Enable " + judge + " on " + message.chat.id);
      } else {
        response = "You are not ignoring this judge.";
      }
    }

    send(message, html_msg.escape(response));
  });

  bot.onText(/^\/disable(@\w+)*/m, (message) => {
    let pars = message.text.split(' ');
    let response = "";
    if (pars.length < 2) {
      response = "No judge specified.";
    } else {
      let user = db.user.get(message.chat.id);
      let judge = pars[1];

      let ignored = user
        .has('ignore.' + judge)
        .value();

      if (ignored === false) {
        user
          .set('ignore.' + judge, true)
          .write();
        response = "Ok! Now this judge is now ignored for you!";
        console.log("Disable " + judge + " on " + message.chat.id);
      } else {
        response = "You are already ignoring this judge.";
      }
    }

    send(message, html_msg.escape(response));
  });

  bot.onText(/^\/judges(@\w+)*$/m, (message) => {
    let user = db.user.get(message.chat.id);

    let response = "You can /enable or /disable judges with the commands as you wish. Try typing /enable calendar.\n\n";
    response += "Supported Judges: \n"

    let vals = [
      ['codeforces', ''],
      ['topcoder', ''],
      ['codechef', ''],
      ['csacademy', ''],
      ['atcoder', ''],
      ['calendar', ' : manually inputed. (codejam, yandex, local events, etc)']
    ];

    for (let i = 0; i < vals.length; i++) {
      let state = user
        .has('ignore.' + vals[i][0])
        .value();

      if (state === true)
        response += '[ignored] ';
      response += vals[i][0] + vals[i][1] + '\n';
    }

    send(message, html_msg.escape(response));
  });

  bot.onText(/^\/help(@\w+)*$/m, (message) => {
    send(message, html_msg.escape("Hello, I am ContestWatcher Bot :D. I list programming contests from Codeforces, Topcoder, Codechef, CSAcademy and AtCoder.\n\n" +
      "You can control me by sending these commands: \n\n" +
      "/start - start receiving reminders before the contests. I'll send a reminder 1 day and another 1 hour before each contest.\n" +
      "/stop - stop receiving reminders.\n" +
      "/upcoming - show the next scheduled contests.\n" +
      "/running - show running contests.\n" +
      "/help_handles - info on how to add and remove codeforces handles.\n" +
      "/refresh - refresh the contest list. This is done automatically once per day.\n" +
      "/judges - list supported judges.\n" +
      "/enable judge - enable notifications for some judge.\n" +
      "/disable judge - disable notifications for some judge.\n" +
      "/help - shows this help message."));
  });

  // bot.onText(/^\/hue(@\w+)*$/, (message) => {
  //   bot.sendAudio(message.chat.id, 'audio/gas.ogg');
  // });

  Bot.bot = bot;
  Bot.sendMessage(admin_id, "<code>Booting up.</code>", {parse_mode: 'html'});
}

/* Tries to send a message, logging errors. */
Bot.sendMessage = (chatId, text, options) => {
  let promise = Bot.bot.sendMessage(chatId, text, options);
  promise.catch((error) => {
    console.log("Error while sending message: " + error.code + "\n" + JSON.stringify(error.response.body));
    console.log("Original message: " + text);
    console.log("Options: " + JSON.stringify(options));
    const err = error.response.body.error_code;
    // if the bot has been "banned" by this chat
    if (err === 400 || err === 403)
      invalid_users.add(chatId);
  });
  return promise;
}

