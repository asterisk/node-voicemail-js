'use strict';

// TODO: convert to property accessors to mark properties as dirty
//       for updating
/**
 * Mailbox constructor.
 *
 * @param {Context} context - a context instance
 * @param {int} mailboxNumber -  mailbox number
 */
function Mailbox(context, mailboxNumber) {
  this.context = context;
  this.mailboxNumber = mailboxNumber;
  this.mailboxName = undefined;
  this.password = undefined;
  this.name = undefined;
  this.email = undefined;
  this.greetingBusy = undefined;
  this.greetingAway = undefined;
  this.greetingName = undefined;

  this._id = undefined;
}

/*
 *Object.defineProperty(t, 'name', {get: function () {return 'me';}, enumerable: true, configurable: true});
 * */
module.exports = Mailbox;
