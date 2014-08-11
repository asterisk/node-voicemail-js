'use strict';

var moment = require('moment');

function Message(mailbox, folder) {
  this.folder = folder;
  this.mailbox = mailbox;
  this.date = moment.utc();
  this.read = false;
  this.originalMailbox = undefined;
  this.callerId = undefined;
  this.duration = undefined;
  this.recording = undefined;

  this._id = undefined;
}

/**
 * @param mailbox - mailbox instance
 * @param folder - folder instance
 */
function Messages() {
  this.messages = [];
  this.countNew = 0;
  this.countOld = 0;
  // 1900
  this.latest = moment.utc('1990-01-01T00:00:00.000Z');
  this.previousMessages = [];
  this.currentMessage = undefined;
}

/**
 * Returns true if the list of messages has at least 1 previously played
 * message in it.
 */
Messages.prototype.previousExists = function() {
  return !!this.previousMessages.length;
};

/**
 * Returnsn true if the list of messages has a current message in it.
 */
Messages.prototype.currentExists = function() {
  return !!this.currentMessage;
};

/**
 * Returns true if the list of messages is empty.
 */
Messages.prototype.isEmpty = function() {
  return !!this.messages.length;
};

/**
 * Returns true if the list of messages is not empty.
 */
Messages.prototype.isNotEmpty = function() {
  return !this.isEmpty();
};

/**
 * Returns the next unread message to be or if all messages have been played,
 * the next latest read message.
 */
Messages.prototype.next = function() {
  var self = this;
  var result;

  var more = this.messages.some(function(message) {
    // has the message been played before?
    var played = self.previousMessages.some(function(prevMessage) {
      return prevMessage._id === message._id;
    });
    var currentMessage = self.currentMessage;

    if (played || (currentMessage && currentMessage._id === message._id)) {
      return false;
    } else {
      result = message;
      return true;
    }
  });

  if (more) {
    // update previous messages and current message
    if (this.currentMessage) {
      this.previousMessages.push(this.currentMessage);
    }

    this.currentMessage = result;
  }

  return result;
};

/**
 * Returns the current message.
 */
Messages.prototype.current = function() {
  return this.currentMessage;
};

/**
 * Returns the previous message played.
 */
Messages.prototype.previous = function() {
  var result = this.previousMessages.pop();

  if (result) {
    this.currentMessage = result;
  }

  return result;
};

/**
 * Resets the messages state and returns the first message.
 */
Messages.prototype.first = function() {
  this.currentMessage = undefined;
  this.previousMessages = [];

  return this.next();
};

/**
 * Returns the message associated with the given playback.
 *
 * @param {Playback} playback - a playback instance
 */
Messages.prototype.getMessage = function(playback) {
  var recording = playback['media_uri'].slice(10);

  return this.messages.filter(function(message) {
    return message.recording === recording;
  })[0];
};

/**
 * Returns true if the message read state has changed as a result of calling
 * this method.
 *
 * @param {string} recording - the message recording name
 */
Messages.prototype.markAsRead = function(message) {
  if (message) {
    if (!message.read) {
      message.read = true;
      this.countOld += 1;
      this.countNew -= 1;
      return true;
    }
  }

  return false;
};

/**
 * @param {Message[]} message - message instance(s)
 */
Messages.prototype.add = function(messages) {
  var self = this;
  var reinsert = false;
  if (!Array.isArray(messages)) {
    messages = [messages];
  }
  if (self.messages.length) {
    reinsert = true;
  }

  messages.forEach(function (message) {
    // skip duplicates
    var existing = self.messages.filter(function(candidate) {
      return candidate._id === message._id && message._id;
    });

    if (!existing.length) {
      self.messages.push(message);
      if (message.read) {
        self.countOld += 1;
      } else {
        self.countNew += 1;
      }

      if (message.date.isAfter(self.latest)) {
        self.latest = message.date;
      }
    }
  });

  if (reinsert) {
    self.sort();
  }
};

/**
 * Sorts the messages by date with unread messages first.
 */
Messages.prototype.sort = function() {
  var unread = split(this.messages, false);
  var read = split(this.messages, true);
  sortByDate(unread);
  sortByDate(read);
  // add all unread to the list of read to recombine into final array
  Array.prototype.push.apply(unread, read);
  this.messages = unread;

  function split(messages, read) {
    return messages.filter(function(message) {
      return (read && message.read) || (!read && !message.read);
    });
  }

  function sortByDate(messages) {
    messages.sort(function(first, second) {
      // sort in descending order
      if (first.date.isAfter(second.date)) {
        return -1;
      } else if (second.date.isAfter(first.date)) {
        return 1;
      } else {
        return 0;
      }
    });
  }
};

/**
 * @param {Message} message - message instance
 */
Messages.prototype.remove = function(message) {
  // no need to update latest since we use that value to fetch another batch
  // of messages
  this.messages = this.messages.filter(function(candidate) {
    return candidate._id !== message._id;
  });

  // update previous messages and current message
  this.previousMessages = this.previousMessages.filter(function(candidate) {
    return candidate._id !== message._id;
  });
  if (this.currentMessage._id === message._id) {
    this.currentMessage = undefined;
  }

  if (message.read) {
    this.countOld -= 1;
  } else {
    this.countNew -= 1;
  }
};

module.exports = {
  message: Message,
  messages: Messages
};
