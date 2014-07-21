'use strict';

var util = require('util');
var Menu = require('./menu.js');

// TODO: eventually will be a finite state machine
function VoicemailMenu(mailboxHelper) {
  Menu.call(this, mailboxHelper);
  this.prepRecordingFinish();
}

util.inherits(VoicemailMenu, Menu);

VoicemailMenu.prototype.handleDtmf = function(event) {
  var command = this.inputs.join('');

  // does this constitute a command based on current state?
  // if so emit command and progress to next state
  if (command === '1') {
    this.emit('RecordMessage');
    this.inputs = [];
  } else if (command === '2') {
    this.emit('RecordingVerified');
    this.inputs = [];
  } else {
    this.inputs = [];
  }
};

VoicemailMenu.prototype.prepRecordingFinish = function() {
  var self = this;
  this.mailboxHelper.ari.on('RecordingFinished', function(event) {
    var id = util.format('channel:%s', self.mailboxHelper.channel.id);
    if (event.recording['target_uri'] === id) {
      self.emit('RecordingFinished', event.duration);
    }
  });
};

module.exports = VoicemailMenu;
