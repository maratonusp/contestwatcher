const codeforces = require('./codeforces');
const Semaphore = require('async-semaphore');

var updateMerge_semaphore = new Semaphore(1, true);

var spec_upcoming = {
  codeforces: []
};

const updateMerge = function (judge_name, current, adding) {
  updateMerge_semaphore.acquire( () => {
    console.log('updating ' + judge_name);
    var i = 0, j = 0;
    var old = Array.from(current);
    current.length = 0;

    while (i < old.length && j < adding.length) {
      if (old[i].judge === judge_name) {
        i++;
      } else if (old[i].time < adding[j].time) {
        current.push(old[i]);
        i++;
      } else {
        current.push(adding[j]);
        j++;
      }
    }

    while (i < old.length) {
      if (old[i].judge === judge_name) {
        i++;
      } else {
        current.push(old[i]);
        i++;
      }
    }

    while (j < adding.length) {
      current.push(adding[j]);
      j++;
    }
    updateMerge_semaphore.release();
  });
};

module.exports = {
  updateUpcoming: (upcoming) => {
    codeforces.updateUpcoming(spec_upcoming.codeforces)
      .on('end', () => { updateMerge('codeforces', upcoming, spec_upcoming.codeforces); } );
  }
};
