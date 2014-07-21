'use strict';

var Q = require('q');
var dbprovider = require('./data/db.js');
var config = require('./config.json');

function createTablesAndIndexes() {
  console.log('creating tables and indexes');
  // loading db provider creates all tables and indexes and returns the db
  // provider instance once complete
  return dbprovider.then(function(db) {
    return db;
  });
}

function createData(db) {
  var Context = require('./data/models/context.js');
  var Mailbox = require('./data/models/mailbox.js');
  var Folder = require('./data/models/folder.js').folder;

  // create context
  console.log('creating context');
  var newContext = new Context('domain.com');

  db.saveContext(newContext)
    .then(function() {
      return db.getContext('domain.com');
    })
    .then(function(context) {
      // create mailbox
      console.log('creating mailbox');
      var newMailbox = new Mailbox(context, '1000');
      newMailbox.mailboxName = 'SIP/1000';
      newMailbox.password = 'pass';
      newMailbox.name = 'Samuel Galarneau';
      newMailbox.email = 'samuelg@domain.com';
      newMailbox.email = 'samuelg@domain.com';

      return db.saveMailbox(newMailbox)
        .then(function() {
          return db.getMailbox('1000', context);
        });
    })
    .then(function(mailbox) {
      // create folders
      console.log('creating folders');
      /*jshint newcap: false */
      return config.folders.reduce(function(promise, folder) {
        var newFolder = new Folder(folder.name, folder.recording);
        newFolder._dtmf = folder._dtmf;
        return promise.then(function() {
          return db.saveFolder(newFolder);
        });
      }, Q());
    })
    .done(function() {
      console.log('finished creating context/mailbox/folders');
      process.exit(0);
    });
}

createTablesAndIndexes().then(function(db) {
  createData(db);
});
