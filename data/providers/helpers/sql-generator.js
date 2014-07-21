'use strict';

var sql = require('sql');

/**
 * SqlGenerator constructor.
 *
 * @param {string} dialect - the database provider dialect to use
 */
function SqlGenerator(dialect) {
  this.generator = new sql.Sql(dialect);
  this.context = this.generator.define({
    name: 'vm_context',
    columns: [{
      name: 'id',
      dataType: 'integer',
      notNull: true,
      primaryKey: true
    }, {
      name: 'domain',
      dataType: 'varchar(254)',
      notNull: true
    }]
  });
  this.mailbox = this.generator.define({
    name: 'vm_mailbox',
    columns: [{
      name: 'id',
      dataType: 'integer',
      notNull: true,
      primaryKey: true
    }, {
      name: 'mailbox_number',
      dataType: 'integer',
      notNull: true
    }, {
      name: 'mailbox_name',
      dataType: 'varchar(255)'
    }, {
      name: 'context_id',
      dataType: 'integer',
      references: {
        table: 'vm_context',
        column: 'id'
      },
      notNull: true
    }, {
      name: 'password',
      dataType: 'varchar(100)',
      notNull: true
    }, {
      name: 'name',
      dataType: 'varchar(100)',
      notNull: true
    }, {
      name: 'email',
      dataType: 'varchar(256)',
      notNull: true
    }, {
      name: 'greeting_away',
      dataType: 'varchar(100)'
    }, {
      name: 'greeting_busy',
      dataType: 'varchar(100)'
    }, {
      name: 'greeting_name',
      dataType: 'varchar(100)'
    }]
  });
  this.folder = this.generator.define({
    name: 'vm_folder',
    columns: [{
      name: 'id',
      dataType: 'integer',
      notNull: true,
      primaryKey: true
    }, {
      name: 'name',
      dataType: 'varchar(25)',
      notNull: true
    }, {
      name: 'recording',
      dataType: 'varchar(100)',
      notNull: true
    }, {
      name: 'dtmf',
      dataType: 'integer',
      notNull: true
    }]
  });
  this.message = this.generator.define({
    name: 'vm_message',
    columns: [{
      name: 'id',
      dataType: 'integer',
      notNull: true,
      primaryKey: true
    }, {
      name: 'mailbox_id',
      dataType: 'integer',
      references: {
        table: 'vm_mailbox',
        column: 'id'
      },
      notNull: true
    }, {
      name: 'recording',
      dataType: 'varchar(100)',
      notNull: true
    }, {
      name: 'read',
      dataType: 'char(1)',
      notNull: true
    }, {
      name: 'date',
      dataType: 'timestamp',
      notNull: true
    }, {
      name: 'original_mailbox',
      dataType: 'integer'
    }, {
      name: 'caller_id',
      dataType: 'varchar(100)'
    }, {
      name: 'duration',
      dataType: 'varchar(100)',
      notNull: true
    }, {
      name: 'folder_id',
      dataType: 'integer',
      references: {
        table: 'vm_folder',
        column: 'id'
      },
      notNull: true
    }]
  });
  this.contextConfig = this.generator.define({
    name: 'vm_context_config',
    columns: [{
      name: 'id',
      dataType: 'integer',
      notNull: true,
      primaryKey: true
    }, {
      name: 'context_id',
      dataType: 'integer',
      references: {
        table: 'vm_context',
        column: 'id'
      },
      notNull: true
    }, {
      name: 'key',
      dataType: 'varchar(100)',
      notNull: true
    }, {
      name: 'value',
      dataType: 'varchar(100)',
      notNull: true
    }]
  });
  this.mailboxConfig = this.generator.define({
    name: 'vm_mailbox_config',
    columns: [{
      name: 'id',
      dataType: 'integer',
      notNull: true,
      primaryKey: true
    }, {
      name: 'mailbox_id',
      dataType: 'integer',
      references: {
        table: 'vm_mailbox',
        column: 'id'
      },
      notNull: true
    }, {
      name: 'key',
      dataType: 'varchar(100)',
      notNull: true
    }, {
      name: 'value',
      dataType: 'varchar(100)',
      notNull: true
    }]
  });
}

/**
 * Returns an array of create table queries.
 *
 * @param autoIncrement: function responsible for transforming a
 *   create statement so that an id auto increments its value
 */
SqlGenerator.prototype.createTables = function(autoIncrement) {
  var models = [
    this.context,
    this.mailbox,
    this.folder,
    this.message,
    this.contextConfig,
    this.mailboxConfig
  ];

  return models.map(function(model) {
    var query = model.create().ifNotExists().toQuery();
    query.text = autoIncrement(query.text);
    return query;
  });
};

/**
 *  Returns an array of index queries.
 */
SqlGenerator.prototype.createIndexes = function() {
  var indexes = [
    this.mailbox.indexes()
      .create('vm_mailbox_mailbox_number_context_id')
      .unique()
      .on(this.mailbox.mailbox_number, this.mailbox.context_id),
    this.context.indexes()
      .create('vm_context_domain')
      .unique()
      .on(this.context.domain),
    this.contextConfig.indexes()
      .create('vm_context_config_context_id')
      .unique()
      .on(this.contextConfig.context_id),
    this.mailboxConfig.indexes()
      .create('vm_mailbox_config_mailbox_id')
      .unique()
      .on(this.mailboxConfig.mailbox_id),
    this.folder.indexes()
      .create('vm_folder_name')
      .unique()
      .on(this.folder.name),
    this.folder.indexes()
      .create('vm_folder_dtmf')
      .unique()
      .on(this.folder.dtmf)
  ];

  var indexQueries = indexes.map(function(index) {
    return index.toQuery();
  });

  // manually create index to ensure descending order on date
  indexQueries.push({
    text:
      'create index vm_message_mailbox_id_folder_id_read_date on vm_message(mailbox_id, folder_id, read, date desc)',
    values: []});

  return indexQueries;
};

/**
 * Returns a select query for the mailbox.
 *
 * @param {int} mailboxNumber - the mailbox number
 * @param {string} contextDomain - the context domain
 */
SqlGenerator.prototype.getMailbox = function (mailboxNumber, contextDomain) {
  return this.mailbox
    .select(this.mailbox.star())
    .from(this.mailbox
      .join(this.context)
      .on(this.mailbox.context_id.equals(this.context.id))
    )
    .where(
      this.mailbox.mailbox_number
        .equals(mailboxNumber)
        .and(this.context.domain.equals(contextDomain)
    )
  ).toQuery();
};

/**
 * Returns an insert query for the mailbox.
 *
 * @param {int} mailboxNumber - mailbox number
 * @param {int} contextId - context identifier
 * @param {string} mailboxName - mailbox name
 * @param {string} password - mailbox password
 * @param {string} name - mailbox name
 * @param {string} email - mailbox email
 * @param {string} greetingAway - mailbox away greeting
 * @param {string} greetingBusy - mailbox busy greeting
 * @param {string} greetingName - mailbox name greeting
 */
SqlGenerator.prototype.insertMailbox = function (
      mailboxNumber, contextId, mailboxName, password, name, email,
      greetingAway, greetingBusy, greetingName) {
  return this.mailbox
    .insert(
      this.mailbox.mailbox_number.value(mailboxNumber),
      this.mailbox.context_id.value(contextId),
      this.mailbox.mailbox_name.value(mailboxName),
      this.mailbox.password.value(password),
      this.mailbox.name.value(name),
      this.mailbox.email.value(email),
      this.mailbox.greeting_away.value(greetingAway),
      this.mailbox.greeting_busy.value(greetingBusy),
      this.mailbox.greeting_name.value(greetingName))
    .toQuery();
};

/**
 * Returns an updates query for the mailbox with the given id. Fields that have
 * not changed should contain undefined to skip updating those fields.
 *
 * @param {int} id - mailbox identifier
 * @param {int} mailboxNumber - mailbox number
 * @param {int} contextId - context identifier
 * @param {string} mailboxName - mailbox name
 * @param {string} password - mailbox password
 * @param {string} name - mailbox name
 * @param {string} email - mailbox email
 * @param {string} greetingAway - mailbox away greeting
 * @param {string} greetingBusy - mailbox busy greeting
 * @param {string} greetingName - mailbox name greeting
 */
SqlGenerator.prototype.updateMailbox = function (
      id, mailboxNumber, contextId, mailboxName, password, name, email,
      greetingAway, greetingBusy, greetingName) {
  var fields = {
    mailbox_number: mailboxNumber,
    context_id: contextId,
    mailbox_name: mailboxName,
    password: password,
    name: name,
    email: email,
    greeting_away: greetingAway,
    greeting_busy: greetingBusy,
    greeting_name: greetingName
  };

  return this.mailbox
    .update(removeEmptyFields(fields))
    .where(this.mailbox.id.equals(id))
    .toQuery();
};

/**
 * Returns queries necessary to delete the mailbox with the given id. Queries
 * to delete messages and configuration associated with the given mailbox are
 * returned ahead of the query to delete the mailbox itself.
 *
 * @param {int} id - the mailbox identifier
 */
SqlGenerator.prototype.deleteMailbox = function(id) {
  var messages = this.message
    .delete()
    .where(this.message.mailbox_id.equals(id))
    .toQuery();
  var configs = this.mailboxConfig
    .delete()
    .where(this.mailboxConfig.mailbox_id.equals(id))
    .toQuery();
  var mailbox = this.mailbox
    .delete()
    .where(this.mailbox.id.equals(id))
    .toQuery();

  return [messages, configs, mailbox];
};

/**
 * Returns a select query for the context
 *
 * @param {string} domain - the context domain
 */
SqlGenerator.prototype.getContext = function(domain) {
  return this.context
    .select(this.context.star())
    .from(this.context)
    .where(this.context.domain.equals(domain))
    .toQuery();
};

/**
 * Returns an insert query for the context.
 *
 * @param {string} domain - context domain
 */
SqlGenerator.prototype.insertContext = function (domain) {
  return this.context
    .insert(this.context.domain.value(domain))
    .toQuery();
};

/**
 * Returns an updates query for the context with the given id. Fields that have
 * not changed should contain undefined to skip updating those fields.
 *
 * @param {int} id - context identifier
 * @param {string} domain - context domain
 */
SqlGenerator.prototype.updateContext = function (id, domain) {
  var fields = {
    domain: domain
  };

  return this.context
    .update(removeEmptyFields(fields))
    .where(this.context.id.equals(id))
    .toQuery();
};

/**
 * Returns queries necessary to delete the context with the given id. Queries
 * to delete mailboxes and configuration associated with the given context are
 * returned ahead of the query to delete the context itself.
 *
 * @param {int} id - the mailbox identifier
 */
SqlGenerator.prototype.deleteContext = function(id) {
  var mailbox = this.mailbox
    .delete()
    .where(this.mailbox.context_id.equals(id))
    .toQuery();
  var configs = this.contextConfig
    .delete()
    .where(this.contextConfig.context_id.equals(id))
    .toQuery();
  var context = this.context
    .delete()
    .where(this.context.id.equals(id))
    .toQuery();

  return [mailbox, configs, context];
};

/**
 * Returns a select query for all folders
 */
SqlGenerator.prototype.getFolders = function() {
  return this.folder
    .select(this.folder.star())
    .from(this.folder)
    .toQuery();
};

/**
 * Returns an insert query for the folder.
 *
 * @param {string} name - folder name
 * @param {string} recording - folder recording
 * @param {int} dmtf - folder dtmf
 */
SqlGenerator.prototype.insertFolder = function (name, recording, dtmf) {
  return this.folder
    .insert(
        this.folder.name.value(name),
        this.folder.recording.value(recording),
        this.folder.dtmf.value(dtmf))
    .toQuery();
};

/**
 * Returns an updates query for the folder with the given id. Fields that have
 * not changed should contain undefined to skip updating those fields.
 *
 * @param {int} id - folder identifier
 * @param {string} name - folder name
 * @param {string} recording - folder recording
 * @param {int} dmtf - folder dtmf
 */
SqlGenerator.prototype.updateFolder = function (id, name, recording, dtmf) {
  var fields = {
    name: name,
    recording: recording,
    dtmf: dtmf
  };

  return this.folder
    .update(removeEmptyFields(fields))
    .where(this.folder.id.equals(id))
    .toQuery();
};

/**
 * Returns queries necessary to delete the folder with the given id. Queries
 * to delete messages associated with the given folder are returned ahead of
 * the query to delete the folder itself.
 *
 * @param {int} id - the mailbox identifier
 */
SqlGenerator.prototype.deleteFolder = function(id) {
  var messages = this.message
    .delete()
    .where(this.message.folder_id.equals(id))
    .toQuery();
  var folder = this.folder
    .delete()
    .where(this.folder.id.equals(id))
    .toQuery();

  return [messages, folder];
};

/**
 * Returns a select query for all context configs.
 */
SqlGenerator.prototype.getContextConfig = function(id) {
  return this.contextConfig
    .select(this.contextConfig.star())
    .from(this.contextConfig)
    .where(this.contextConfig.context_id.equals(id))
    .toQuery();
};

/**
 * Returns a select query for all mailbox configs.
 */
SqlGenerator.prototype.getMailboxConfig = function(id) {
  return this.mailboxConfig
    .select(this.mailboxConfig.star())
    .from(this.mailboxConfig)
    .where(this.mailboxConfig.mailbox_id.equals(id))
    .toQuery();
};

/**
 * Returns an insert query for the mailbox config.
 *
 * @param {string} key - configuration key
 * @param {string} value - configuration value
 */
SqlGenerator.prototype.insertMailboxConfig = function (mailboxId, key, value) {
  return this.mailboxConfig
    .insert(
      this.mailboxConfig.mailbox_id.value(mailboxId),
      this.mailboxConfig.key.value(key),
      this.mailboxConfig.value.value(value))
    .toQuery();
};

/**
 * Returns an updates query for the mailbox config with the given id. Fields
 * that have not changed should contain undefined to skip updating those
 * fields.
 *
 * @param {int} id - mailbox configuration identifier
 * @param {string} key - configuration key
 * @param {string} value - configuration value
 */
SqlGenerator.prototype.updateMailboxConfig = function (
    id, mailboxId, key, value) {
  var fields = {
    mailbox_id: mailboxId,
    key: key,
    value: value
  };

  return this.mailboxConfig
    .update(removeEmptyFields(fields))
    .where(this.mailboxConfig.id.equals(id))
    .toQuery();
};

/**
 * Returns an insert query for the context config.
 *
 * @param {string} key - configuration key
 * @param {string} value - configuration value
 */
SqlGenerator.prototype.insertContextConfig = function (contextId, key, value) {
  return this.contextConfig
    .insert(
      this.contextConfig.context_id.value(contextId),
      this.contextConfig.key.value(key),
      this.contextConfig.value.value(value))
    .toQuery();
};

/**
 * Returns an updates query for the context config with the given id. Fields
 * that have not changed should contain undefined to skip updating those
 * fields.
 *
 * @param {int} id - context configuration identifier
 * @param {string} key - configuration key
 * @param {string} value - configuration value
 */
SqlGenerator.prototype.updateContextConfig = function (
    id, contextId, key, value) {
  var fields = {
    context_id: contextId,
    key: key,
    value: value
  };

  return this.contextConfig
    .update(removeEmptyFields(fields))
    .where(this.contextConfig.id.equals(id))
    .toQuery();
};

/**
 * Returns a delete query for the mailbox config with the given id.
 *
 * @param {int} id - the mailbox config identifier
 */
SqlGenerator.prototype.deleteMailboxConfig = function(id) {
  return this.mailboxConfig
    .delete()
    .where(this.mailboxConfig.id.equals(id))
    .toQuery();
};

/**
 * Returns a delete query for the context config with the given id.
 *
 * @param {int} id - the context config identifier
 */
SqlGenerator.prototype.deleteContextConfig = function(id) {
  return this.contextConfig
    .delete()
    .where(this.contextConfig.id.equals(id))
    .toQuery();
};

/**
 * Returns a count query for mailbox messages.
 * 
 * @param {int} mailboxId - the mailbox identifier
 * @param {int} folderId - the mailbox folder identifier
 */
SqlGenerator.prototype.getMessageCount = function(mailboxId, folderId) {
  return this.message
    .select(this.message.count())
    .from(this.message)
    .where(this.message.mailbox_id.equals(mailboxId)
      .and(this.message.folder_id.equals(folderId)))
    .toQuery();
};

/**
 * Returns a query for selecting the latest mailbox messages.
 * 
 * @param {int} mailboxId - the mailbox identifier
 * @param {int} folderId - the mailbox folder identifier
 * @param {Date} latest - string representation of the date of the latest
 *  message fetched
 */
SqlGenerator.prototype.getLatestMessages = function(
    mailboxId, folderId, latest) {

  return this.message
    .select(this.message.star())
    .from(this.message)
    .where(this.message.mailbox_id.equals(mailboxId)
      .and(this.message.folder_id.equals(folderId)))
      .and(this.message.date.gte(latest))
    .order(this.message.read, this.message.date.descending)
    .toQuery();
};

/**
 * Returns a query for selecting mailbox messages by offset and limit.
 * 
 * @param {int} mailboxId - the mailbox identifier
 * @param {int} folderId - the mailbox folder identifier
 * @param {int} offset - the offset to start from
 * @param {int} limit - the limit of rows to fetch
 */
SqlGenerator.prototype.getMessages = function(
    mailboxId, folderId, offset, limit) {

  return this.message
    .select(this.message.star())
    .from(this.message)
    .where(this.message.mailbox_id.equals(mailboxId)
      .and(this.message.folder_id.equals(folderId)))
    .order(this.message.read, this.message.date.descending)
    .limit(limit)
    .offset(offset)
    .toQuery();
};

/**
 * Returns an insert query for the message.
 *
 * @param {int} mailboxId - mailbox identifier
 * @param {int} folderId - folder identifier
 * @param {Date} date - message creation time
 * @param {boolean} read - whether the message has been read 
 * @param {int} originalMailbox - original mailbox number if message was
 *                                forwarded
 * @param {string} callerId - caller ID
 * @param {int} duration - message duration in seconds
 * @param {string} recording - recording URI
 */
SqlGenerator.prototype.insertMessage = function (
    mailboxId, folderId, date, read, originalMailbox,
    callerId, duration, recording) {

  return this.message
    .insert(
        this.message.mailbox_id.value(mailboxId),
        this.message.folder_id.value(folderId),
        this.message.date.value(date),
        this.message.read.value(read ? 'Y' : 'N'),
        this.message.original_mailbox.value(originalMailbox),
        this.message.caller_id.value(callerId),
        this.message.duration.value(duration),
        this.message.recording.value(recording))
    .toQuery();
};

/**
 * Returns an updates query for the message with the given id. Fields that have
 * not changed should contain undefined to skip updating those fields.
 *
 * @param {int} id - message identifier
 * @param {int} mailboxId - mailbox identifier
 * @param {int} folderId - folder identifier
 * @param {Date} date - message creation time
 * @param {boolean} read - whether the message has been read 
 * @param {int} originalMailbox - original mailbox number if message was
 *                                forwarded
 * @param {string} callerId - caller ID
 * @param {int} duration - message duration in seconds
 * @param {string} recording - recording URI
 */
SqlGenerator.prototype.updateMessage = function (
    id, mailboxId, folderId, date, read, originalMailbox,
    callerId, duration, recording) {
  var fields = {
    mailbox_id: mailboxId,
    folder_id: folderId,
    date: date,
    read: read ? 'Y' : 'N',
    original_mailbox: originalMailbox,
    caller_id: callerId,
    duration: duration,
    recording: recording
  };

  return this.message
    .update(removeEmptyFields(fields))
    .where(this.message.id.equals(id))
    .toQuery();
};

/**
 * Returns queries necessary to delete the message with the given id.
 *
 * @param {int} id - the message identifier
 */
SqlGenerator.prototype.deleteMessage = function(id) {
  return this.message
    .delete()
    .where(this.message.id.equals(id))
    .toQuery();
};

/**
 * Removes any field from the object with an undefined value. Nulls are
 * conserved to ensure fields can be updated to a null value.
 *
 * @param {Object} fields - object used to update a record
 */
function removeEmptyFields(fields) {
  var result = {};
  Object.keys(fields).forEach(function(field) {
    if (fields[field] !== undefined) {
      result[field] = fields[field];
    }
  });

  return result;
}

module.exports = SqlGenerator;
