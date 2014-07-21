'use strict';

var Q = require('q');
var MailboxHelper = require('./helpers/mailboxhelper.js');

/**
 * VoicemailBase constructor. Shared behavior between voicemail and
 * voicemailmain.
 *
 * @param {ari-client~Client} ari - ARI client
 * @param {string} appName - either voicemail or voicemailmain
 */
function VoicemailBase(ari, appName) {
  this.ari = ari;
  this.appName = appName;
}

/**
 * Returns true if the StasisStart event is intended for the current
 * voicemail application.
 *
 * @param {Object} event - StasisStart event
 */
VoicemailBase.prototype.isOwnStasisStart = function(event) {
  return event.application === this.appName;
};

/**
 * Answer incoming channel and returns a promise containing a mailbox helper.
 *
 * @param {Object} event - the event object
 * @param {ari-client~Channel} channel - the channel entering Stasis
 * @returns {Q} mailboxHelper - a promise containing a mailbox helper instance
 */
VoicemailBase.prototype.init = function (event, channel) {
  var answer = Q.denodeify(channel.answer.bind(channel));
  answer().done();

  var domain = event.args[0];
  // TODO: wire in ability to ask for mailbox number
  var mailboxNumber = event.args[1];
  var mailboxHelper = new MailboxHelper(
      this.ari, domain, mailboxNumber, channel);
  return mailboxHelper.init();
};

module.exports = VoicemailBase;
