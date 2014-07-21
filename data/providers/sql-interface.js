'use strict';

var util = require('util');
var Q = require('q');
var moment = require('moment');
var SqlGenerator = require('./helpers/sql-generator.js');
var DataAccess = require('./interface.js');
var Context = require('../models/context.js');
var Mailbox = require('../models/mailbox.js');
var Folder = require('../models/folder.js').folder;
var Folders = require('../models/folder.js').folders;
var ContextConfig = require('../models/config.js').context;
var MailboxConfig = require('../models/config.js').mailbox;
var Config = require('../models/config.js').config;
var Message = require('../models/message.js').message;
var Messages = require('../models/message.js').messages;

// TODO: abstract out similar operations (delete, save, get for example)

/**
 * SqlDataAccess constructor.
 *
 * @param {string} provider - the database provider dialect to use
 */
function SqlDataAccess(provider) {
  DataAccess.call(this, provider);
  this.queries = new SqlGenerator(provider);
}

util.inherits(SqlDataAccess, DataAccess);

/**
 * Returns a promise containing the result of the query.
 *
 * @param [Query] query - node-sql query object
 */
SqlDataAccess.prototype.runQuery = function(query) {
  throw new Error('Sql Interface does not implement this method.');
};

/**
 * Replaces the id portion of the create statement with a provider
 * specific auto increment statement.
 *
 * @param {string} createStatement - the create statement to modify
 */
SqlDataAccess.prototype.autoIncrement = function(createStatement) {
  throw new Error('Sql Interface does not implement this method.');
};

/**
 * Returns a promise representing running the queries in series.
 *
 * @param {Query[]} queries - an array of node-sql query objects
 * @param {boolean} skipErrors - whether to catch query errors
 */
SqlDataAccess.prototype.runQueriesSeries = function(queries, skipErrors) {
  var self = this;

  /*jshint newcap: false */
  return queries.reduce(function(series, query) {
    return series.then(function() {
      var promise = self.runQuery(query);
      if (skipErrors) {
        promise = promise.catch(function(err) {
          console.error('skipped error:', err);
        });
      }

      return promise;
    });
  }, Q());
};

/**
 * Initializes the database by creating tables and indexes.
 *
 * @returns {Q} result - a promise that will contain the provider instance once
 *    all tables and indexes have been created.
 */
SqlDataAccess.prototype.init = function() {
  var self = this;
  var queries = self.queries.createTables(self.autoIncrement.bind(self));

  var promise = self.runQueriesSeries(queries)
    .then(function() {
      console.log('created all tables');
    });

  return promise.then(function() {
    queries = self.queries.createIndexes();
    // catch errors (existing indexes)
    return self.runQueriesSeries(queries, true)
      .then(function() {
        console.log('created all indexes');
        return self;
      });
  });
};

/**
 * Returns a promise containing the given mailbox.
 *
 * @param {int} mailboxNumber: mailbox number
 * @param context: context instance
 */
SqlDataAccess.prototype.getMailbox = function(mailboxNumber, context) {
  var query = this.queries.getMailbox(mailboxNumber, context.domain);

  return this.runQuery(query)
    .then(function(result) {
      var row = result.rows[0];
      var instance = (row) ? new Mailbox(
        context,
        row.mailbox_number) : null;
      if (row) {
        instance._id = row.id;
        instance.mailboxName = row.mailbox_name;
        instance.password = row.password;
        instance.name = row.name;
        instance.email = row.email;
        instance.greetingAway = row.greeting_away;
        instance.greetingBusy = row.greeting_busy;
        instance.greetingName = row.greeting_name;
      }

      return instance;
    });
};

/**
 * Returns a promise containing the result of saving the given mailbox.
 *
 * @param mailbox: mailbox instance
 */
SqlDataAccess.prototype.saveMailbox = function(mailbox) {
  var query = null;
  if (!mailbox._id) {
    query = this.queries.insertMailbox(
      mailbox.mailboxNumber,
      mailbox.context._id,
      mailbox.mailboxName,
      mailbox.password,
      mailbox.name,
      mailbox.email,
      mailbox.greetingAway,
      mailbox.greetingBusy,
      mailbox.greetingName);
  } else {
    // TODO: once we have meta data for dirty fields, pass undefined for fields
    //       that have not changed
    query = this.queries.updateMailbox(
      mailbox._id,
      mailbox.mailboxNumber,
      mailbox.context._id,
      mailbox.mailboxName,
      mailbox.password,
      mailbox.name,
      mailbox.email,
      mailbox.greetingAway,
      mailbox.greetingBusy,
      mailbox.greetingName);
  }

  return this.runQuery(query);
};

/**
 * Returns a promise containing the result of deleting the given mailbox.
 *
 * Note: this operation also deletes any message or configuration associated
 * with the mailbox.
 *
 * @param mailbox: mailbox instance
 */
SqlDataAccess.prototype.deleteMailbox = function(mailbox) {
  var queries = this.queries.deleteMailbox(mailbox._id);

  // run deletes in a series
  return this.runQueriesSeries(queries);
};

/**
 * Returns a promise containing the context instance for the given domain.
 *
 * @param {string} domain - the context domain
 */
SqlDataAccess.prototype.getContext = function(domain) {
  var query = this.queries.getContext(domain);

  return this.runQuery(query)
    .then(function(result) {
      var row = result.rows[0];
      var instance = (row) ? new Context(row.domain) : null;
      if (row) {
        instance._id = row.id;
      }

      return instance;
    });
};

/**
 * Returns a promise containing the result of saving the given context.
 *
 * @param context: context instance
 */
SqlDataAccess.prototype.saveContext = function(context) {
  var query = null;
  if (!context._id) {
    query = this.queries.insertContext(
      context.domain);
  } else {
    // TODO: once we have meta data for dirty fields, pass undefined for fields
    //       that have not changed
    query = this.queries.updateContext(
      context._id,
      context.domain);
  }

  return this.runQuery(query);
};

/**
 * Returns a promise containing the result of deleting the given context.
 *
 * Note: this operation also deletes any mailbox or configuration associated
 * with the context.
 *
 * @param context: context instance
 */
SqlDataAccess.prototype.deleteContext = function(context) {
  var queries = this.queries.deleteContext(context._id);

  // run deletes in a series
  return this.runQueriesSeries(queries);
};

/**
 * Returns a promise containing a list of folders instance.
 */
SqlDataAccess.prototype.getFolders = function() {
  var query = this.queries.getFolders();
  var folders = new Folders();

  return this.runQuery(query)
    .then(function(result) {
      result.rows.forEach(function(row) {
        var instance = new Folder(
          row.name,
          row.recording);
        instance._id = row.id;
        instance._dtmf = row.dtmf;
        folders.add(instance);
      });

      return folders;
    });
};

/**
 * Returns a promise containing the result of saving the given folder.
 *
 * @param folder: folder instance
 */
SqlDataAccess.prototype.saveFolder = function(folder) {
  var query = null;
  if (!folder._id) {
    query = this.queries.insertFolder(
      folder.name,
      folder.recording,
      folder._dtmf);
  } else {
    // TODO: once we have meta data for dirty fields, pass undefined for fields
    //       that have not changed
    query = this.queries.updateFolder(
      folder._id,
      folder.name,
      folder.recording,
      folder._dtmf);
  }

  return this.runQuery(query);
};

/**
 * Returns a promise containing the result of deleting the given folder.
 *
 * Note: this operation also deletes any message associated with the folder.
 *
 * @param folder: folder instance
 */
SqlDataAccess.prototype.deleteFolder = function(folder) {
  var queries = this.queries.deleteFolder(folder._id);

  // run deletes in a series
  return this.runQueriesSeries(queries);
};

/**
 * Returns a promise containing all ContextConfig instances.
 *
 * @param {Context} context - context instance
 */
SqlDataAccess.prototype.getContextConfig = function(context) {
  var query = this.queries.getContextConfig(context._id);

  return this.runQuery(query)
    .then(function(result) {
      var options = [];

      result.rows.forEach(function(row) {
        var instance = new ContextConfig(context, row.key, row.value);
        instance._id = row.id;
        options.push(instance);
      });

      return options;
    });
};

/**
 * Returns a promise containing all MailboxConfig instances.
 *
 * @param {Mailbox} mailbox - mailbox instance
 */
SqlDataAccess.prototype.getMailboxConfig = function(mailbox) {
  var query = this.queries.getMailboxConfig(mailbox._id);

  return this.runQuery(query)
    .then(function(result) {
      var options = [];

      result.rows.forEach(function(row) {
        var instance = new MailboxConfig(mailbox, row.key, row.value);
        instance._id = row.id;
        options.push(instance);
      });

      return options;
    });
};

/**
 * Returns a promise containing a Config instance.
 *
 * @param {Mailbox} mailbox - mailbox instance
 */
SqlDataAccess.prototype.getConfig = function(mailbox) {
  // get configs in parallel
  return Q.all([
      this.getContextConfig(mailbox.context),
      this.getMailboxConfig(mailbox)])
    .then(function(result) {
      var contextConfig = result[0];
      var mailboxConfig = result[1];
      var config = new Config(contextConfig, mailboxConfig);

      return config;
    });
};


/**
 * Returns a promise containing the result of saving the given mailbox config.
 *
 * @param config: mailbox config instance
 */
SqlDataAccess.prototype.saveMailboxConfig = function(config) {
  var query = null;
  if (!config._id) {
    query = this.queries.insertMailboxConfig(
      config.mailbox._id, config.key, config.value);
  } else {
    // TODO: once we have meta data for dirty fields, pass undefined for fields
    //       that have not changed
    query = this.queries.updateMailboxConfig(
      config._id,
      config.mailbox._id,
      config.key,
      config.value);
  }

  return this.runQuery(query);
};

/**
 * Returns a promise containing the result of saving the given context config.
 *
 * @param config: context config instance
 */
SqlDataAccess.prototype.saveContextConfig = function(config) {
  var query = null;
  if (!config._id) {
    query = this.queries.insertContextConfig(
      config.context._id, config.key, config.value);
  } else {
    // TODO: once we have meta data for dirty fields, pass undefined for fields
    //       that have not changed
    query = this.queries.updateContextConfig(
      config._id,
      config.context._id,
      config.key,
      config.value);
  }

  return this.runQuery(query);
};

/**
 * Returns a promise containing the result of deleting the given mailbox config.
 *
 * @param config: mailbox config instance
 */
SqlDataAccess.prototype.deleteMailboxConfig = function(config) {
  var query = this.queries.deleteMailboxConfig(config._id);

  return this.runQuery(query);
};

/**
 * Returns a promise containing the result of deleting the given context config.
 *
 * @param config: context config instance
 */
SqlDataAccess.prototype.deleteContextConfig = function(config) {
  var query = this.queries.deleteContextConfig(config._id);

  return this.runQuery(query);
};

/**
 * Returns a Message instance using the database row.
 *
 * @param {Mailbox} mailbox - the mailbox instance
 * @param {Folder} folder - the folder instance
 * @param {Object} row - database row
 * @returns {Message} message - a message instance
 */
function convertRowToMessage(mailbox, folder, row) {
  var message = new Message(mailbox, folder);
  // convert to utc (db drive will assume local)
  message.date = moment.utc(
    moment(row.date).format('YYYY-MM-DD HH:mm'));
  message.read = row.read === 'Y' ? true : false;
  message.originalMailbox = row.original_mailbox;
  message.callerId = row.caller_id;
  message.duration = row.duration;
  message.recording = row.recording;
  message._id = row.id;

  return message;
}

/**
 * Returns a promise containing the latest mailbox messages.
 *
 * @param {Mailbox} mailbox - the mailbox instance
 * @param {Folder} folder - the folder instance
 * @param {Date} latest - the create date from the latest message from the
 *  previous batch of messages fetched
 */
SqlDataAccess.prototype.getLatestMessages = function(mailbox, folder, latest) {
  var query = this.queries.getLatestMessages(
      mailbox._id, folder._id, latest.format());

  return this.runQuery(query)
    .then(function(result) {
      return result.rows.map(function(row) {
        return convertRowToMessage(mailbox, folder, row);
      });
    });
};

/**
 * Returns a promise containing the mailbox messages.
 *
 * @param {Mailbox} mailbox - the mailbox instance
 * @param {Folder} folder - the folder instance
 */
SqlDataAccess.prototype.getMessages = function(mailbox, folder) {
  // fetch mailbox messages in batches in parallel
  var self = this;
  var query = this.queries.getMessageCount(mailbox._id, folder._id);
  var limit = 50;
  var messages = [];

  return this.runQuery(query)
    .then(function(countResult) {
      var count = +countResult.rows[0].vm_message_count;
      var runs = calculateRuns(count);

      return Q.all(getPromises(runs))
        .then(function(results) {
          // flatten to messages array
          return results.reduce(function(messages, batch) {
            messages.add(batch);

            return messages;
          }, new Messages());
        });
    });

  function calculateRuns(count) {
    // even limit runs plus any remainder
    return (Math.floor(count / limit)) + ((count % limit > 0) ? 1 : 0);
  }

  function getPromises(runs) {
    var handled = 0;
    var promises = [];

    while(handled !== runs) {
      promises.push(getMessageBatch(handled * limit));
      handled += 1;
    }

    return promises;
  }

  function getMessageBatch(offset) {
    var query = self.queries.getMessages(
        mailbox._id, folder._id, offset, limit);

    return self.runQuery(query)
      .then(function(result) {
        return result.rows.map(function(row) {
          return convertRowToMessage(mailbox, folder, row);
        });
      });
  }
};

/**
 * Returns a promise containing the result of saving the given message.
 *
 * @param message: message instance
 */
SqlDataAccess.prototype.saveMessage = function(message) {
  var query = null;
  if (!message._id) {
    query = this.queries.insertMessage(
      message.mailbox._id,
      message.folder._id,
      message.date.format(),
      message.read,
      message.originalMailbox,
      message.callerId,
      message.duration,
      message.recording);
  } else {
    // TODO: once we have meta data for dirty fields, pass undefined for fields
    //       that have not changed
    query = this.queries.updateMessage(
      message._id,
      message.mailbox._id,
      message.folder._id,
      message.date.format(),
      message.read,
      message.originalMailbox,
      message.callerId,
      message.duration,
      message.recording);
  }

  return this.runQuery(query);
};

/**
 * Returns a promise containing the result of deleting the given message.
 *
 * @param message: message instance
 */
SqlDataAccess.prototype.deleteMessage = function(message) {
  var query = this.queries.deleteMessage(message._id);

  return this.runQuery(query);
};

module.exports = SqlDataAccess;
