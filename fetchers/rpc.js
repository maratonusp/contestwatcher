const logger = require('../logger');
const jsdom = require('jsdom')
const EventEmitter = require('events');
const moment = require('moment-timezone');

module.exports = {
    name: "RPC",
    updateUpcoming: (upcoming) => {
        const emitter = new EventEmitter();

        jsdom.env("http://registro.redprogramacioncompetitiva.com/contests",
            ["http://code.jquery.com/jquery.js"],
            (err, window) => {
                if (err) {
                    logger.error("Failed on RPC.", err);
                    return;
                }

                const $ = window.$;
                const list = $("table:eq(0)").children('tbody').children('tr');

                list.each(function() {
                    
                    const row = $(this).children('td');
                    const name = row.eq(0).text();
                    const time = row.eq(1).find('time').attr("datetime");

                    contest = {
                        judge: 'RPC',
                        name: 'RPC - ' + name,
                        url: "http://registro.redprogramacioncompetitiva.com/contests",
                        time: moment.tz(time, 'YYYY-MM-DDTHH:mm:ssZ', 'UTC').toDate(),
                        duration: 5*3600
                    }

                    upcoming.push(contest);

                });

                emitter.emit('end');
            });

        return emitter;
    }
}

