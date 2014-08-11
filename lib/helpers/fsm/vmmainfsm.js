'use strict';

var machina = require('machina');

/**
 * Enumerations for dtmf inputs for given states
 */
var INPUT_MAPPINGS = {
  auth: {
    accept: '#'
  },

  menu: {
    first: '1',
    next: '6',
    previous: '4',
    replay: '5',
    'delete': '7',
    changeFolder: '2',
    moveToFolder: '9'
  },

  changingFolder: {
    accept: '#'
  },

  movingToFolder: {
    accept: '#'
  }
};

/**
 * Initialization state.
 */
var init = {
  _onEnter: function() {
    this.mailbox = this.getMailbox();
  },

  loadMailboxHelper: function(mailboxHelper) {
    this.mailboxHelper = mailboxHelper;

    if (this.allResourcesLoaded()) {
      var transition = this.isAuthorized() ? 'menu': 'auth';
      this.transition(transition);
    }
  },

  loadMessages: function(messages) {
    this.messages = messages;

    if (this.allResourcesLoaded()) {
      var transition = this.isAuthorized() ? 'menu': 'auth';
      this.transition(transition);
    }
  },

  dtmf: function(dtmf) {
    if (this.isAuthorized()) {
      this.deferUntilTransition('menu');
    } else {
      this.deferUntilTransition('auth');
    }
  }
};

/**
 * Authentication and authorization state.
 */
var auth = {
  _onEnter: function() {
    this.authAttempt = [];
    this.handle('instructions');
  },

  instructions: function(incorrect) {
    if (this.mailbox) {
      if (incorrect) {
        // TODO: invalidPassword using prompt handler
      } else {
        // TODO: instructionsPassword using prompt handler
      }
    } else {
      if (incorrect) {
        // TODO: invalidMailbox using prompt handler
      } else {
        // TODO: instructionsMailbox using prompt handler
      }
    }
  },

  dtmf: function(dtmf) {
    if (dtmf === INPUT_MAPPINGS.auth.attempt) {
      var self = this;

      var attempt = this.authAttempt.join('');
      this.authAttempt = [];

      if (this.mailbox) {
        this.mailboxHelper.accountHandler.authorize(attempt)
          .then(function(authorized) {
            if (authorized) {
              self.transition('menu');
            } else {
              self.transition('instructions', true);
            }
          }).done();
      } else {
        this.mailboxHelper.accountHandler.getMailbox(attempt)
          .then(function(mailbox) {
            if (mailbox) {
              self.mailbox = attempt;
              // TODO: refactor mailboxHelper to reload
              self.mailboxHelper.mailbox = mailbox;
              self.handle('instructions');
            } else {
              self.transition('instructions', true);
            }
          }).done();
      }
    } else {
      this.authAttempt.push(dtmf);
    }
  }
};

/**
 *  Main menu state.
 */
var menu = {
  _onEnter: function() {
    this.handle('instructions');
  },

  instructions: function() {
    if (this.messages.previousExists()) {
      // TODO: instructionsPrevious using prompt handler
      // TODO: instructionsFirst using prompt handler
      // TODO: instructionsDelete using prompt handler
    }

    if (this.messages.currentExists()) {
      // TODO: instructionsMoveToFolder using prompt handler
      // TODO: instructionsReplay using prompt handler
    }

    if (this.messages.isNotEmpty()) {
      // TODO: instructionsNext using prompt handler
    }
    
      // TODO: instructionsChangeFolder using prompt handler
  },

  playingStarted: function(playback) {
    console.log('entered playingStarted on menu state', playback.id);
    this.deferUntilTransition('playingMessage');
  },

  dtmf: function(dtmf) {
    var options = {};
    options[INPUT_MAPPINGS.menu.next] = next;
    options[INPUT_MAPPINGS.menu.previous] = previous;
    options[INPUT_MAPPINGS.menu.replay] = replay;
    options[INPUT_MAPPINGS.menu.first] = first;
    options[INPUT_MAPPINGS.menu.delete] = deleteMessage;
    options[INPUT_MAPPINGS.menu.changeFolder] = changeFolder;
    options[INPUT_MAPPINGS.menu.moveToFolder] = moveToFolder;
    var handler = options[dtmf];

    if (handler) {
      handler.call(this);
    }

    function next() {
      console.log('received NextMessage action');

      /*jshint validthis:true */
      var self = this;

      this.mailboxHelper.messageHandler.getLatestMessages(this.messages.latest)
        .then(function(latest) {
          self.messages.add(latest);
          var message = self.messages.next();
          if (message) {
            // TODO: need generated ID so we can know which playback to kill
            self.mailboxHelper.messageHandler.play(message).done();
            // TODO: use generated ID with playbackfinished to mark as read
          } else {
            self.transition('menu');
          }
        })
        .done();
      this.transition('playingMessage');
    }

    function previous() {
      console.log('received PreviousMessage action');

      /*jshint validthis:true */
      var message = this.messages.previous();
      if (message) {
        this.mailboxHelper.messageHandler.play(message).done();
        this.transition('playingMessage');
      }
    }

    function first() {
      console.log('received FirstMessage action');

      /*jshint validthis:true */
      var self = this;

      this.mailboxHelper.messageHandler.getLatestMessages(this.messages.latest)
        .then(function(latest) {
          self.messages.add(latest);
          var message = self.messages.first();
          if (message) {
            self.mailboxHelper.messageHandler.play(message).done();
          } else {
            self.transition('menu');
          }
        })
        .done();
      this.transition('playingMessage');
    }

    function replay() {
      console.log('received ReplayMessage action');

      /*jshint validthis:true */
      var message = this.messages.current();
      if (message) {
        this.mailboxHelper.messageHandler.play(message).done();
        this.transition('playingMessage');
      }
    }

    function deleteMessage() {
      console.log('received DeleteMessage action');

      /*jshint validthis:true */
      var self = this;

      var message = this.messages.current();
      if (message) {
        this.messages.remove(message);
        this.mailboxHelper.messageHandler.delete(message).done(function() {
          self.transition('menu');
        });
        this.transition('deletingMessage');
      }
    }

    function changeFolder() {
      console.log('received ChangeFolder action');

      /*jshint validthis:true */
      this.transition('changingFolder');
    }

    function moveToFolder() {
      console.log('received MoveToFolder action');

      /*jshint validthis:true */
      this.transition('movingToFolder');
    }
  }
};

/**
 * Message currently playing state.
 */
var playingMessage = {
  _onEnter: function() {
  },

  playingStarted: function(playback) {
    this.currentPlayback = playback;
  },

  playingFinished: function(playback) {
    if (this.currentPlayback && this.currentPlayback.id === playback.id) {
      var self = this;

      var message = this.messages.getMessage(this.currentPlayback);
      var changed = this.messages.markAsRead(message);
      if (changed) {
        this.mailboxHelper.messageHandler.save(message, true).done(function() {
          self.transition('menu');
        });
        this.transition('markingAsRead');
      } else {
        this.transition('menu');
      }
      this.currentPlayback = null;
    }
  },

  dtmf: function(dtmf) {
    var self = this;

    this.deferUntilTransition('menu');
    if (this.currentPlayback) {
      this.mailboxHelper.messageHandler.stop(this.currentPlayback)
        .done(function() {
          self.transition('menu');
        });
    } else {
      this.transition('menu');
    }
    this.currentPlayback = null;
  }
};

/**
 * Message being marked as read.
 */
var markingAsRead = {
  _onEnter: function() {
  },

  dtmf: function(dtmf) {
    this.deferUntilTransition('menu');
  }
};

/**
 * Message being deleted state.
 */
var deletingMessage = {
  _onEnter: function() {
  },

  dtmf: function(dtmf) {
    this.deferUntilTransition('menu');
  }
};

/**
 * Moving message to another folder state.
 */
var movingToFolder = {
  _onEnter: function() {
    this.folder = [];
  },

  instructions: function(incorrect) {
    // TODO: using prompt handler
  },

  dtmf: function(dtmf) {
    if (dtmf === INPUT_MAPPINGS.movingToFolder.accept) {
      var self = this;
      var folderAttempt = this.folder.join('');

      var message = this.messages.current();
      this.mailboxHelper.messageHandler.moveToFolder(message, folderAttempt)
        .then(function(saved) {
          if (saved) {
            self.messages.remove(message);
          }
          return saved;
        })
        .done(function(saved) {
          if (saved) {
            console.log('moved message to folder', message._id, folderAttempt);
            self.transition('menu');
          } else {
            console.error('error saving to folder', folderAttempt);
            self.folder = [];
            self.handle('instructions', true);
          }
        });
    } else {
      this.folder.push(dtmf);
    }
  }
};

/**
 * Changing to another folder state.
 */
var changingFolder = {
  _onEnter: function() {
    this.folder = [];
  },

  instructions: function(incorrect) {
    // TODO: using prompt handler
  },

  dtmf: function(dtmf) {
    if (dtmf === INPUT_MAPPINGS.changingFolder.accept) {
      var self = this;
      var folderAttempt = this.folder.join('');

      this.mailboxHelper.messageHandler.changeFolder(folderAttempt)
        .then(function(folderMessages) {
          if (folderMessages) {
            self.messages = folderMessages;
            return true;
          } else {
            return false;
          }
        })
        .done(function(success) {
          if (success) {
            console.log('changed to folder', folderAttempt);
            self.transition('menu');
          } else {
            console.log('error changing to folder', folderAttempt);
            self.folder = [];
            self.handle('instructions', true);
          }
        });
    } else {
      this.folder.push(dtmf);
    }
  }
};

/**
 * Creates a new fsm instance and returns it.
 *
 * @param {string} [mailbox] - the mailbox number
 * @param {boolean} [authorized] - whether to bypass authorization
 * @returns fsmInstance - a new fsm instance
 */
function createFsm(mailbox, authorized) {
  var fsmInstance = new machina.Fsm({

    initialState: 'init',

    getMailbox: function() {
      return mailbox;
    },

    isAuthorized: function() {
      return authorized;
    },

    allResourcesLoaded: function() {
      return this.mailboxHelper && this.messages;
    },

    // fsm will stop functioning at this point
    stop: function() {
      this.clearQueue('transition');
      this.handle = function() {
      };
    },

    states : {
      // bootstrapping
      'init' : init,

      // auth challenge and verification
      'auth' : auth,

      // main menu
      'menu': menu,

      // message play in progress
      'playingMessage': playingMessage,

      // message being marked as read
      'markingAsRead': markingAsRead,

      // message currently being deleted
      'deletingMessage': deletingMessage,

      // moving message to another folder
      'movingToFolder': movingToFolder,

      // changing to another folder
      'changingFolder': changingFolder
    }
  });

  return fsmInstance;
}

module.exports.create = createFsm;
