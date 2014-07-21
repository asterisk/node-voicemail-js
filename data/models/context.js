'use strict';

// TODO: convert to property accessors to mark properties as dirty
//       for updating
/**
 * @param domain -  the context domain (domain.com, not @domain.com)
 */
function Context(domain) {
  this.domain = domain.replace('@', '');

  this._id = undefined;
}

/*
 *Object.defineProperty(t, 'name', {get: function () {return 'me';}, enumerable: true, configurable: true});
 * */
module.exports = Context;
