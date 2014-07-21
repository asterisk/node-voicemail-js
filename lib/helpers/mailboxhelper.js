'use strict';

var Q = require('q');
var MessageHandler = require('../mailbox/messages.js');
var AccountHandler = require('../mailbox/account.js');

/*
 * MailboxHelper constructor.
 *
 * @params {ari-client} ari - ARI client
 * @params {string} domain - domain name
 * @params {string} mailboxNumber - mailbox number 
 * @params {Channel} channel - channel that entered the application 
 */
function MailboxHelper(ari, domain, mailboxNumber, channel) {
  this.ari = ari;
  this.domain = domain || 'default';
  this.mailboxNumber = mailboxNumber;
  this.channel = channel;

  this.context = undefined;
  this.mailbox = undefined;

  this.accountHandler = undefined;
  this.messageHandler = undefined;
  this.greetingHandler = undefined;
  this.notificationHandler = undefined;
  this.configHandler = undefined;
}

/**
 * Returns a promise that will be fulfilled once the MailboxHelper instance has
 * been inited.
 *
 * This will attempt to initialize a message handler if a mailbox number has
 * been provided.
 */
MailboxHelper.prototype.init = function() {
  var self = this;

  self.accountHandler = new AccountHandler(self.ari);

  var promise = self.accountHandler.getContext(self.domain)
    .then(function(context) {
      self.context = context;

      if (self.mailboxNumber) {
        return Q.all([
            self.accountHandler.getMailbox(self.mailboxNumber, context),
            MessageHandler.prototype.getFolders()
          ]);
      } else {
        return self;
      }
    });

  if (self.mailboxNumber) {
    promise = promise.then(function(results) {
      var mailbox = results[0];
      var folders = results[1];
      self.mailbox = mailbox;
      self.messageHandler = new MessageHandler(
        self.ari, mailbox, self.channel, folders);
      return self;
    });
  }

  return promise;
};

// TODO: method to load from mailboxNumber for cases where mailboxNumber is not
//       passed as Stasis application argument

module.exports = MailboxHelper;
