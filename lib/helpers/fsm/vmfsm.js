'use strict';

var machina = require('machina');

/**
 * Enumerations for dtmf inputs for given states
 */
var INPUT_MAPPINGS = {
  auth: {
    attempt: '#'
  },

  menu: {
    record: '1'
  },

  recording: {
    confirm: '2',
    stop: '#',
    cancel: '7'
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

    var transition = this.mailbox ? 'menu': 'auth';
    this.transition(transition);
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
 * Authentication state.
 */
var auth = {
  _onEnter: function() {
    this.authAttempt = [];
    this.handle('instructions');
  },

  instructions: function(incorrect) {
    if (incorrect) {
      // TODO: invalidMailbox using prompt handler
      this.emit('invalidMailbox');
    } else {
      // TODO: instructionsMailbox using prompt handler
    }
  },

  dtmf: function(dtmf) {
    if (dtmf === INPUT_MAPPINGS.auth.attempt) {
      var self = this;

      var attempt = this.authAttempt.join('');
      this.authAttempt = [];

      this.mailboxHelper.accountHandler.getMailbox(attempt)
        .then(function(mailbox) {
          if (mailbox) {
            self.mailbox = attempt;
            // TODO: refactor mailboxHelper to reload
            self.mailboxHelper.mailbox = mailbox;
            self.transition('menu');
          } else {
            self.transition('instructions', true);
          }
        }).done();
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
    // TODO: instructionsRecordMessage using prompt handler
  },

  recordingStarted: function(recording) {
    this.deferUntilTransition('recordingMessage');
  },

  dtmf: function(dtmf) {
    var options = {};
    options[INPUT_MAPPINGS.menu.record] = record;
    var handler = options[dtmf];

    if (handler) {
      handler.call(this);
    }

    function record() {
      console.log('received record action');

      /*jshint validthis:true */
      var self = this;

      this.message = this.mailboxHelper.messageHandler.newMessage();

      this.mailboxHelper.messageHandler
        .record(this.message)
        .done();
      this.transition('recordingMessage');
    }
  }
};

/**
 * Message is being recorded state.
 */
var recordingMessage = {
  _onEnter: function() {
  },

  recordingStarted: function(recording) {
    this.currentRecording = recording;
    console.log('recordingstarted', recording.name);
  },

  recordingFinished: function(recording) {
    console.log('recordingfinished before check', recording.name);
    if (this.currentRecording &&
        this.currentRecording.name === recording.name) {
      this.currentRecording = null;
      this.transition('waitingForConfirmation');
      console.log('recordingfinished', recording.name);
    }
  },

  dtmf: function(dtmf) {
    var self = this;

    if (dtmf === INPUT_MAPPINGS.recording.cancel) {
      this.message = null;
      this.currentRecording = null;
      this.transition('menu');
    } else if (dtmf === INPUT_MAPPINGS.recording.stop) {
      this.mailboxHelper.messageHandler.stopRecording(this.currentRecording)
        .catch(function() {
          // recording may have ended as we called the stop operation
        })
        .done();
    } else {
      this.deferUntilTransition('waitingForConfirmation');
    }
  }
};

var waitingForConfirmation = {
  _onEnter: function() {
  },
  
  dtmf: function(dtmf) {
    var self = this;

    if (dtmf === INPUT_MAPPINGS.recording.confirm) {
      if (this.duration) {
        this.message.duration = this.duration;
      }
      this.mailboxHelper.messageHandler.save(this.message, true)
        .done(function() {
          console.log('message saved');
          self.transition('menu');
        });
    } else if (dtmf === INPUT_MAPPINGS.recording.cancel) {
      this.message = null;
      this.transition('menu');
    } else {
      this.deferUntilTransition('menu');
    }
  }
};

/**
 * Creates a new fsm instance and returns it.
 *
 * @param {string} [mailbox] - the mailbox number
 * @returns fsmInstance - a new fsm instance
 */
function createFsm(mailbox) {
  var fsmInstance = new machina.Fsm({

    initialState: 'init',

    getMailbox: function() {
      return mailbox;
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

      // message is being recorded
      'recordingMessage': recordingMessage,

      // waiting for confirmation
      'waitingForConfirmation': waitingForConfirmation
    }
  });

  return fsmInstance;
}

module.exports.create = createFsm;
