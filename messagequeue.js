const logger = require('./logger');
const db = require('./db');

const USER_LIMIT  = 30; // 30 messages/sec
const GROUP_LIMIT = 20; // 20 messages/min

var mq = module.exports = {};

// Delays messages based on burst and time limits
class DelayQueue {
  constructor(name, callback, burst_limit = 30, time_limit = 1000) {
    this.name  = name;
    this.callback = callback;
    this.burst_limit = burst_limit;
    this.time_limit  = time_limit;

    this.queue = [];
    this.sent  = [];
    this.hibernating = true;
  }

  push(message) {
    //logger.info("push message to " + this.name + ". [" + this.queue.length + " / " + this.sent.length + "]");
    this.queue.push(message);
    if (this.hibernating)
      this.run();
  }


  run() {
    //logger.info("queue [" + this.name + "] running!");
    this.hibernating = false;

    let now = Date.now();
    while (this.sent.length && now - this.sent[0] > this.time_limit) this.sent.shift();

    while (this.queue.length) {
      if (this.sent.length >= this.burst_limit) {
        let timeout = now - this.sent[0] + this.time_limit;
        //logger.info("queue [" + this.name + "] timed-out for " + timeout + "ms.");
        setTimeout(this.run.bind(this), timeout);
        break;
      }
      this.sent.push(Date.now());
      this.callback(this.queue.shift());
    }

    if (this.queue.length == 0) {
      this.hibernating = true;
      //logger.info("queue [" + this.name + "] is hibernating!");
    }
  }
}


// Manage messages to avoid Telegram flood limits
class MessageQueue {
  constructor(callback) {
    this.all_queue   = new DelayQueue("all_queue", callback, 30, 1000);
    this.group_queue = new DelayQueue("group_queue", this.group_to_all.bind(this), 20, 60000);
  }

  push(chat_id, text, options) {
    //logger.info("message queue push: {" + chat_id + ", \"" + text + "\"");

    let user = db.user.get_by_id(chat_id);

    const message =
      {
        chat_id : chat_id,
        text    : text,
        options : options
      };

    if (user.get('is_group').value())
      this.group_queue.push(message);
    else
      this.all_queue.push(message);
  }

  group_to_all(message) {
    //logger.info("group to all: " + message.text);
    this.all_queue.push(message);
  }
}

mq.MessageQueue = MessageQueue;
