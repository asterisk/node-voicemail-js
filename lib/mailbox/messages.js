var util = require('util');
var Q = require('q');
var dbprovider = require('../../data/db.js');
var Message = require('../../data/models/message').message;
var config = require('../../config.json');

/***
 * Message handler constructor.
 *
 * @param {ari-client~Client} ariClient - ari client instance
 * @param {Mailbox} mailbox - mailbox instance
 * @param {ari-client~Channel} channel - channel instance
 */
function MessageHandler(ariClient, mailbox, channel, folders) {
  this.ari = ariClient;
  this.mailbox = mailbox;
  this.channel = channel;
  this.folders = folders;
  // default to INBOX
  this.currentFolder = this.folders[0];
}

//  in process
//  metadata
//    mailbox counts

/**
 * Returns all folders for the current mailbox.
 */
MessageHandler.prototype.getFolders = function () {
  var self = this;
  return dbprovider.then(function(db) {
    return db.getFolders()
      .then(function(folders) {
        // can be called without an instance
        if (self instanceof MessageHandler) {
          self.folders = folders;
          self.currentFolder = self.folders[0];
        }
        return folders;
      });
  });
};

/**
 * Changes the folder to the given dtmf and returns messages for that folder.
 * 
 * @param {string} dtmf - dtmf digit
 */
MessageHandler.prototype.changeFolder = function(dtmf) {
  var self = this;
  /*jshint newcap: false */
  return Q().then(function() {
    if (dtmf in self.folders) {
      self.currentFolder = self.folders[dtmf];
      return self.getMessages();
    }
  });
};

/**
 * Moves the given message to the folder represented by the given dtmf.
 *
 * @param {Message} message - message instance
 * @param {string} dtmf - dtmf digit
 * @returns {Q} saved - a promise containing true if the message was saved,
 *    false otherwise.
 */
MessageHandler.prototype.moveToFolder = function(message, dtmf) {
  var self = this;
  /*jshint newcap: false */
  return Q().then(function() {
    if (dtmf in self.folders) {
      message.folder = self.folders[dtmf]; 
      return self.save(message)
        .then(function() {
          return true;
        });
    }

    return false;
  });
};

/**
 * Returns a new Message instance for the current mailbox/folder with a 
 * generated recording name.
 */
MessageHandler.prototype.newMessage = function() {
  // always create new messages in INBOX
  var message = new Message(this.mailbox, this.folders[0]);
  var recording = this.ari.LiveRecording();
  recording.name = util.format(
      'voicemail/%s/%s', this.mailbox._id, recording.name);
  message.recording = recording.name;

  // attempt to save caller id
  var callerId;
  if (this.channel.caller.name.length) {
    callerId = this.channel.caller.name;
  } else if (this.channel.caller.number.length) {
    callerId = this.channel.caller.number;
  }
  message.callerId = callerId;

  return message;
};

/**
 * Starts recording the current channel using the message recording name.
 *
 * @param {Message} message - message instance
 */
MessageHandler.prototype.record = function(message) {
  // shouldn't save to db until confirmed
  var record = Q.denodeify(this.channel.record.bind(this.channel));
  return record({
    name: message.recording,
    format: 'wav',
    maxSilenceSeconds: config.options.maxsilence,
    maxDurationSeconds: config.options.maxduration,
    beep: true
  });
};

/**
 * Saves the message.
 *
 * @param {Message} message - message instance
 * @param {boolean} mwi - whether to update mwi
 */
MessageHandler.prototype.save = function(message, mwi) {
  var self = this;
  // update mwi accordingly
  if (mwi !== undefined && mwi) {
    var getMailbox = Q.denodeify(this.ari.mailboxes.get.bind(this.ari));

    getMailbox({mailboxName: this.mailbox.mailboxName})
      .catch(function(err) {
        // mailbox does not exist
        var mailbox = self.ari.Mailbox();
        mailbox.name = self.mailbox.mailboxName;

        if (message.read) {
          mailbox['old_messages'] = 1;
          mailbox['new_messages'] = 0;
        } else {
          mailbox['old_messages'] = 0;
          mailbox['new_messages'] = 1;
        }

        return mailbox;
      })
      .then(function(mailbox) {
        if (message.read) {
          mailbox['old_messages'] += 1;
          mailbox['new_messages'] -= 1;
        } else {
          mailbox['new_messages'] += 1;
        }

        var update = Q.denodeify(mailbox.update.bind(mailbox));

        return update({
          oldMessages: mailbox['old_messages'],
          newMessages: mailbox['new_messages']
        });
      })
      .done(function() {
        console.log('done updating mwi');
      });
  }

  return dbprovider.then(function(db) {
    return db.saveMessage(message);
  });
};

/**
 * Returns all messages for the current mailbox/folder.
 */
MessageHandler.prototype.getMessages = function() {
  var self = this;
  return dbprovider.then(function(db) {
    return db.getMessages(self.mailbox, self.currentFolder);
  });
};

/**
 * Returns the latest messages for the current mailbox/folder.
 *
 * @param {Moment} latest - a moment instance of the latest message currently
 *    held.
 */
MessageHandler.prototype.getLatestMessages = function(latest) {
  var self = this;
  return dbprovider.then(function(db) {
    return db.getLatestMessages(self.mailbox, self.currentFolder, latest);
  });
};

/**
 * Plays the message on the current channel.
 *
 * @param {Message} message - message instance
 */
MessageHandler.prototype.play = function(message) {
  var play = Q.denodeify(this.channel.play.bind(this.channel));
  return play({media: util.format('recording:%s', message.recording)});
};

/**
 * Stops the given playback.
 */
MessageHandler.prototype.stop = function(playback) {
  var stop = Q.denodeify(playback.stop.bind(playback));
  return stop();
};

/**
 * Stops the given playback.
 */
MessageHandler.prototype.stopRecording = function(recording) {
  var stop = Q.denodeify(recording.stop.bind(recording));
  return stop();
};

/**
 * Deletes the message.
 *
 * @param {Message} message - message instance
 */
MessageHandler.prototype.delete = function(message) {
  return dbprovider.then(function(db) {
    return db.deleteMessage(message);
  });
};

/**
 * Copies the message from the current mailbox to the given mailbox.
 *
 * @param {Mailbox} maibox - mailbox instance
 * @param {Message} message - message instance
 */
MessageHandler.prototype.copy = function(mailbox, message) {
  throw new Error('Not currently supported');
};

module.exports = MessageHandler;
