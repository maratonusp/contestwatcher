const codeforces = require('./codeforces');
const codechef = require('./codechef');
const topcoder = require('./topcoder');
const csacademy = require('./csacademy');
const alerts = require('../alerts');

const Semaphore = require('async-semaphore');

var updateMerge_semaphore = new Semaphore(1, true);

var spec_upcoming = {
  codeforces: [],
  codechef: [],
  topcoder: [],
  csacademy: []
};

const updateMerge = function (judge_name, current, adding) {
  updateMerge_semaphore.acquire( () => {
    console.log('updating ' + judge_name);
    var i = 0, j = 0;
    var old = Array.from(current);
    current.length = 0;

    while (i < old.length || j < adding.length) {
      if (i < old.length && old[i].judge === judge_name) {
        i++;
      } else if (j == adding.length || (i < old.length && old[i].time < adding[j].time)) {
        current.push(old[i]);
        i++;
      } else {
        current.push(adding[j]);
        j++;
      }
    }

    alerts.reset_alerts(current);
    updateMerge_semaphore.release();
  });
};

module.exports = {
  updateUpcoming: (upcoming) => {
    codeforces.updateUpcoming(spec_upcoming.codeforces)
      .on('end', () => { updateMerge('codeforces', upcoming, spec_upcoming.codeforces); });
    codechef.updateUpcoming(spec_upcoming.codechef)
      .on('end', () => { updateMerge('codechef', upcoming, spec_upcoming.codechef); });
    topcoder.updateUpcoming(spec_upcoming.topcoder)
      .on('end', () => { updateMerge('topcoder', upcoming, spec_upcoming.topcoder); });
    csacademy.updateUpcoming(spec_upcoming.csacademy)
      .on('end', () => { updateMerge('csacademy', upcoming, spec_upcoming.csacademy); });
  }
};
