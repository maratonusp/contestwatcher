#!/usr/bin/env node

// Sets exception handlers
const logger = require('./logger');
logger.info("Booting up.");

// Evolves the database
require('./db_evolution').evolve();

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
