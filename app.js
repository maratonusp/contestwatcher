#!/usr/bin/env node
const dateFormat = require('dateformat')
const schedule = require('node-schedule');
const url = require('url');
const fs = require('fs');

const judge = require('./fetch');
const bot = require('./bot');

// fetcher
judge.updateUpcoming();

// Update everyday at 3am
const rule = new schedule.RecurrenceRule();
rule.hour = 3;
rule.minute = 0;
rule.second = 0;
schedule.scheduleJob(rule, () => { judge.updateUpcoming(); });

// Creating bot
bot.create_bot();
// Adding extra message handlers
fs.readdirSync('./msg_handlers').forEach((file) => {
	if(file.endsWith('.js'))
		require('./msg_handlers/' + file).init();
});
