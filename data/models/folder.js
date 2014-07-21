'use strict';

/**
 * @param name - the name of the folder
 * @param recording - recording identifier to play for the folder
 */
function Folder(name, recording) {
  this.name = name;
  this.recording = recording;

  this._dtmf = undefined;
  this._id = undefined;
}

/**
 */
function Folders() {
  var self = this;
}

/**
 * @param {Folder[]} folders - folder instance
 */
Folders.prototype.add = function(folders) {
  var self = this;
  if (!Array.isArray(folders)) {
    folders = [folders];
  }

  folders.forEach(function(folder) {
    self[folder._dtmf] = folder;
  });
};

module.exports = {
  folder: Folder,
  folders: Folders
};
