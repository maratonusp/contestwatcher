const chai = require('chai');
const expect = chai.expect;
const rewire = require('rewire');
const sinon = require('sinon');
const schedule = require('node-schedule');

var alerts = rewire('./../alerts');
var db = require('./../db');
var bot = require('./../bot');

const upcoming_sample = require('./fixtures/upcoming-regular.js');
const users_sample = require('./fixtures/users-warn.js');

const day = 24 * 60 * 60 * 1000;

describe('warning_manager.flush_buffer', function () {
	let warning_manager = alerts.__get__('warning_manager');

	beforeEach(function() {
		warning_manager.buffer = [
			{ left: '1 hour', ev: upcoming_sample[2] },
			{ left: '1 hour', ev: upcoming_sample[3] },
			{ left: '1 day', ev: upcoming_sample[7] }
		];

		sinon.stub(db.low, 'get');
		db.low.get.withArgs('users').returns({ value: function () { return users_sample; } });

		sinon.stub(bot, 'sendMessage');
	});

	afterEach(function() {
		db.low.get.restore();
		bot.sendMessage.restore();
	});

	it("should clear buffer", function () {
		warning_manager.flush_buffer();
		expect(warning_manager.buffer).to.be.empty;
	});

	it("should send messages only for insterested users", function () {
		warning_manager.flush_buffer();
		expect(bot.sendMessage.calledWith(0)).to.be.true;
		expect(bot.sendMessage.calledWith(1)).to.be.true;
		expect(bot.sendMessage.calledWith(2)).to.be.true;
		expect(bot.sendMessage.calledWith(5)).to.be.false;
		expect(bot.sendMessage.calledWith(3)).to.be.false;
		expect(bot.sendMessage.calledWith(4)).to.be.false;
		expect(bot.sendMessage.callCount).to.eq(3);
	});

	it("should not inform about ignored judges", function () {
		warning_manager.flush_buffer();
		expect(bot.sendMessage.calledWith(4)).to.be.false;
		expect(bot.sendMessage.calledWithMatch(sinon.match.same(2),sinon.match(/codeforces/))).to.be.false;
	});
});

describe('warning_manager.add', function () {
	let warning_manager = alerts.__get__('warning_manager');

	beforeEach(function () {
		this.clock = sinon.useFakeTimers();
		sinon.stub(warning_manager, 'flush_buffer');
		warning_manager.buffer = [];
		
		// scheduler binds the function passed as callback, this means stubbing is ignored unless I change the code (bad) or redefine it here
		warning_manager.next_flush = new schedule.scheduleJob(new Date(Date.now() + 300000 * day), warning_manager.flush_buffer);
		warning_manager.next_flush.cancel();
	});

	afterEach(function () {
		this.clock.restore();
		warning_manager.flush_buffer.restore();
	});

	// i'm kind of testing the scheduler library in the two tests below
	// this is wrong but it's being useful now because their documentation is not perfect
  it("should reschedule exactly one flush in 30s", function () {
		warning_manager.add({ ev: upcoming_sample[2], left: '1 hour' });
		this.clock.tick(30*1000 + 7);
		expect(warning_manager.flush_buffer.calledOnce).to.be.true;

		this.clock.runAll();
		expect(warning_manager.flush_buffer.calledOnce).to.be.true;
	});

	it("should collect each event when they are added togheter", function () {
		warning_manager.add({ ev: upcoming_sample[2], left: '1 hour' });
		warning_manager.add({ ev: upcoming_sample[3], left: '1 hour' });
		warning_manager.add({ ev: upcoming_sample[7], left: '1 day' });
		expect(warning_manager.buffer).to.have.lengthOf(3);

		this.clock.tick(30*1000 + 7);
		expect(warning_manager.flush_buffer.calledOnce).to.be.true;

		this.clock.runAll();
		expect(warning_manager.flush_buffer.calledOnce).to.be.true;
	});

	it("should be able to reschedule again after the first call", function () {
		warning_manager.add({ ev: upcoming_sample[2], left: '1 hour' });
		this.clock.tick(30*1000 + 7);
		warning_manager.add({ ev: upcoming_sample[3], left: '1 hour' });

		this.clock.tick(30*1000 + 7);
		expect(warning_manager.flush_buffer.calledTwice).to.be.true;

		this.clock.runAll();
		expect(warning_manager.flush_buffer.calledTwice).to.be.true;
	});
});

