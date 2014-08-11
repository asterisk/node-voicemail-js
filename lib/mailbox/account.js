'use strict';

var Q = require('q');
var dbprovider = require('../../data/db.js');

/***
 * Account handler constructor.
 *
 * @param {ari-client~Client} ariClient - ari client instance
 */
function AccountHandler(ariClient) {
  this.ari = ariClient;
}

/**
 * Returns the given context.
 *
 * @param {string} domain - the context domain
 * @returns {Q} context - a promise containing the context
 */
AccountHandler.prototype.getContext = function(domain) {
  return dbprovider.then(function(db) {
    return db.getContext(domain);
  });
};

// TODO: add shortcut method that accepts domain and mailboxnumber and returns
//       a mailbox

/**
 * Returns the given mailbox.
 *
 * @param {integer} mailboxNumber - the mailbox number
 * @param {Context} context - a context instance
 * @returns {Q} mailbox - a promise containing the mailbox
 */
AccountHandler.prototype.getMailbox = function(mailboxNumber, context) {
  return dbprovider.then(function(db) {
    return db.getMailbox(mailboxNumber, context);
  });
};

/**
 * Returns true if the password is authorized to access the given mailbox.
 *
 * @param {string} password - user provided password
 * @param {Mailbox} mailbox - a mailbox instance
 * @returns {boolean} authorized - true if the password is authorized to access
 *  the mailbox, false otherwise.
 */
AccountHandler.prototype.authorize = function(password, mailbox) {
  // TODO: hash password in db
  return mailbox.password === password;
};

module.exports = AccountHandler;
