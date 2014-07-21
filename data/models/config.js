'use strict';

var util = require('util');
var defaultOptions = require('../../config.json').options;

/**
 * @param key - config name
 * @param value - config value
 */
function BaseConfig(key, value) {
  this.key = key;
  this.value = value;

  this._id = undefined;
}

/**
 * @param context - context instance
 * @param key - config name
 * @param value - config value
 */
function ContextConfig(context, key, value) {
  BaseConfig.call(this, key, value);
  this.context = context;
}

util.inherits(ContextConfig, BaseConfig);

/**
 * @param mailbox - mailbox instance
 * @param key - config name
 * @param value - config value
 */
function MailboxConfig(mailbox, key, value) {
  BaseConfig.call(this, key, value);
  this.mailbox = mailbox;
}

util.inherits(MailboxConfig, BaseConfig);

/**
 * Config constructor. Simple key value config.
 *
 * Context options override default ones. Mailbox options override context ones.
 *
 * @param {ContextConfig[]} contextConfig
 * @param {MailboxConfig[]} mailboxConfig
 */
function Config(contextConfig, mailboxConfig) {
  var self = this;

  Object.keys(defaultOptions).forEach(function(option) {
    self[option] = defaultOptions[option];
  });
  contextConfig.forEach(function(option) {
   self[option.key] = option.value;
  });
  mailboxConfig.forEach(function(option) {
    self[option.key] = option.value;
  });
}

module.exports = {
  mailbox: MailboxConfig,
  context: ContextConfig,
  config: Config
};
