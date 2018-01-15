#!/usr/bin/env node
// Sets exception handlers
const logger = require('./logger');

// Initializes online judge fetchers
const fetch = require('./fetch').init();

// Creates bot and initiales message handlers
const bot = require('./bot');
const fs = require('fs');
bot.create_bot();
fs.readdirSync('./msg_handlers').forEach((file) => {
	if(file.endsWith('.js'))
		require('./msg_handlers/' + file).init();
});

// Db fix
const db = require('./db');
db.low
	.get('users')
	.value()
	.forEach(function (user) {
		var handles = user.cf_handles.map(function (handle) {
			return handle.toLowerCase();
		});
		db.low.get('users').find({ id: user.id }).assign({ cf_handles: handles }).write();
	});
