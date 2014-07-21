'use strict';

var util = require('util');
var Menu = require('./menu.js');

// TODO: eventually will be a finite state machine
function VoicemailMainMenu(mailboxHelper) {
  Menu.call(this, mailboxHelper);
  this.prepPlaybackFinished();
}

util.inherits(VoicemailMainMenu, Menu);

VoicemailMainMenu.prototype.handleDtmf = function(event) {
  var command = this.inputs.join('');
  var folder;

  if (command === '1') {
    this.emit('FirstMessage');
    this.inputs = [];
  } else if (command === '6') {
    this.emit('NextMessage');
    this.inputs = [];
  } else if (command === '4') {
    this.emit('PreviousMessage');
    this.inputs = [];
  } else if (command === '5') {
    this.emit('ReplayMessage');
    this.inputs = [];
  } else if (command === '7') {
    this.emit('DeleteMessage');
    this.inputs = [];
  } else if (this.inputs[0] === '2') {
    folder = this.inputs[1];

    if (folder) {
      this.emit('ChangeFolder', folder);
      this.inputs = [];
    }
  } else if (this.inputs[0] === '9') {
    folder = this.inputs[1];

    if (folder) {
      this.emit('MoveToFolder', folder);
      this.inputs = [];
    }
  } else if (~command.search('#')) {
    this.inputs = [];
  }
};

VoicemailMainMenu.prototype.prepPlaybackFinished = function() {
  var self = this;
  this.mailboxHelper.ari.on('PlaybackFinished', function(event) {
    var id = util.format('channel:%s', self.mailboxHelper.channel.id);
    if (event.playback['target_uri'] === id) {
      // remove recording: from media_uri
      var media = event.playback['media_uri'].slice(10);
      self.emit('MessageRead', media);
    }
  });
};

module.exports = VoicemailMainMenu;
