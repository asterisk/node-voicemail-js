'use strict';

var util = require('util');
var EventEmitter = require('events').EventEmitter;

// TODO: eventually will be a finite state machine
function Menu(mailboxHelper) {
  var self = this;
  EventEmitter.call(this);
  // buffer of inputs to convert to commands
  this.inputs = [];
  this.mailboxHelper = mailboxHelper;

  this.mailboxHelper.channel.on('ChannelDtmfReceived', function(event) {
    self.inputs.push(event.digit);
    console.log('received dtmf', event.digit);
    console.log('current buffer', self.inputs);

    self.handleDtmf(event);
  });
}

util.inherits(Menu, EventEmitter);

module.exports = Menu;
