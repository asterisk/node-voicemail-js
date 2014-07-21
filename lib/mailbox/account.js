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
 * Returns true if the mailbox and passord authenticate.
 *
 * @param {Mailbox} mailbox - a mailbox instance
 * @param {string} password - the mailbox password
 */
AccountHandler.prototype.authenticateMailbox = function(mailbox, password) {
  throw new Error('Not yet implemented');
};

module.exports = AccountHandler;
