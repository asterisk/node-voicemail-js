'use strict';

/**
 * Interface for data access. All methods should be implemented by subclasses.
 */

/**
 * DataAccess constructor.
 *
 * @param {string} provider - the database provider dialect to use 
 */
function DataAccess(provider) {
  this._provider = provider;
}

/**
 * Initialize tables if they do not already exist
 */
DataAccess.prototype.init = function() {
  throw new Error('Interface does not implement this method.');
};

/**
 * Returns a promise containing the given mailbox.
 *
 * @param {int} mailboxNumber: mailbox number
 * @param context: context instance
 */
DataAccess.prototype.getMailbox = function(mailboxNumber, context) {
  throw new Error('Interface does not implement this method.');
};

/**
 * Returns a promise containing the result of saving the given mailbox.
 *
 * @param mailbox: mailbox instance
 */
DataAccess.prototype.saveMailbox = function(mailbox) {
  throw new Error('Interface does not implement this method.');
};

/**
 * Returns a promise containing the result of deleting the given mailbox.
 *
 * Note: this operation also deletes any message or configuration associated
 * with the mailbox.
 *
 * @param mailbox: mailbox instance
 */
DataAccess.prototype.deleteMailbox = function(mailbox) {
  throw new Error('Interface does not implement this method.');
};

/**
 * Returns a promise containing the context instance for the given domain.
 *
 * @param {string} domain - the context domain
 */
DataAccess.prototype.getContext = function(domain) {
  throw new Error('Interface does not implement this method.');
};

/**
 * Returns a promise containing the result of saving the given context.
 *
 * @param context: context instance
 */
DataAccess.prototype.saveContext = function(context) {
  throw new Error('Interface does not implement this method.');
};

/**
 * Returns a promise containing the result of deleting the given context.
 *
 * Note: this operation also deletes any mailbox or configuration associated
 * with the context.
 *
 * @param context: context instance
 */
DataAccess.prototype.deleteContext = function(context) {
  throw new Error('Interface does not implement this method.');
};

/**
 * Returns a promise containing a list of folders instance.
 */
DataAccess.prototype.getFolders = function() {
  throw new Error('Interface does not implement this method.');
};

/**
 * Returns a promise containing the result of saving the given folder.
 *
 * @param folder: folder instance
 */
DataAccess.prototype.saveFolder = function(folder) {
  throw new Error('Interface does not implement this method.');
};

/**
 * Returns a promise containing the result of deleting the given folder.
 *
 * Note: this operation also deletes any message associated with the folder.
 *
 * @param folder: folder instance
 */
DataAccess.prototype.deleteFolder = function(folder) {
  throw new Error('Interface does not implement this method.');
};

/**
 * Returns a promise containing all ContextConfig instances.
 *
 * @param {Context} context - context instance
 */
DataAccess.prototype.getContextConfig = function(context) {
  throw new Error('Interface does not implement this method.');
};

/**
 * Returns a promise containing all MailboxConfig instances.
 *
 * @param {Mailbox} mailbox - mailbox instance
 */
DataAccess.prototype.getMailboxConfig = function(mailbox) {
  throw new Error('Interface does not implement this method.');
};

/**
 * Returns a promise containing a Config instance.
 *
 * @param {Mailbox} mailbox - mailbox instance
 */
DataAccess.prototype.getConfig = function(mailbox) {
  throw new Error('Interface does not implement this method.');
};


/**
 * Returns a promise containing the result of saving the given mailbox config.
 *
 * @param config: mailbox config instance
 */
DataAccess.prototype.saveMailboxConfig = function(config) {
  throw new Error('Interface does not implement this method.');
};

/**
 * Returns a promise containing the result of saving the given context config.
 *
 * @param config: context config instance
 */
DataAccess.prototype.saveContextConfig = function(config) {
  throw new Error('Interface does not implement this method.');
};

/**
 * Returns a promise containing the result of deleting the given mailbox config.
 *
 * @param config: mailbox config instance
 */
DataAccess.prototype.deleteMailboxConfig = function(config) {
  throw new Error('Interface does not implement this method.');
};

/**
 * Returns a promise containing the result of deleting the given context config.
 *
 * @param config: context config instance
 */
DataAccess.prototype.deleteContextConfig = function(config) {
  throw new Error('Interface does not implement this method.');
};

/**
 * Returns a promise containing the latest mailbox messages.
 *
 * @param {Mailbox} mailbox - the mailbox instance
 * @param {Folder} folder - the folder instance
 * @param {Date} latest - the create date from the latest message from the
 *  previous batch of messages fetched
 */
DataAccess.prototype.getLatestMessages = function(mailbox, folder, latest) {
  throw new Error('Interface does not implement this method.');
};

/**
 * Returns a promise containing the mailbox messages.
 *
 * @param {Mailbox} mailbox - the mailbox instance
 * @param {Folder} folder - the folder instance
 */
DataAccess.prototype.getMessages = function(mailbox, folder) {
  throw new Error('Interface does not implement this method.');
};

/**
 * Returns a promise containing the result of saving the given message.
 *
 * @param message: message instance
 */
DataAccess.prototype.saveMessage = function(message) {
  throw new Error('Interface does not implement this method.');
};

/**
 * Returns a promise containing the result of deleting the given message.
 *
 * @param message: message instance
 */
DataAccess.prototype.deleteMessage = function(message) {
  throw new Error('Interface does not implement this method.');
};

module.exports = DataAccess;
