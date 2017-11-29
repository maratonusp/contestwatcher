#!/usr/bin/env node
const dateFormat = require('dateformat')
const schedule = require('node-schedule');
const url = require('url');
const fs = require('fs');

const old_log = console.log
console.log = (str) => {
  str = dateFormat(new Date(), "UTC:[dd/mm/yy HH:MM:ss] ") + str
  fs.appendFile('run.log', str.toString() + '\n', function (err) {});
  old_log(str);
}

const judge = require('./fetch');
const bot = require('./bot');

// fetcher
var upcoming = [];
judge.updateUpcoming(upcoming);

// Update everyday at 3am
const rule = new schedule.RecurrenceRule();
rule.hour = 3;
rule.minute = 0;
rule.second = 0;
schedule.scheduleJob(rule, () => { judge.updateUpcoming(upcoming); });

// bot
bot.create_bot(upcoming, judge);
