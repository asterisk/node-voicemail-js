'use strict';

var util = require('util');
var pg = require('pg');
var Q = require('q');
var SqlDataAccess = require('../sql-interface.js');
var PROVIDER_NAME = 'postgres';

function PostgresDataAccess(dbconfig) {
  SqlDataAccess.call(this, PROVIDER_NAME);
  this.dbconfig = dbconfig;
}

util.inherits(PostgresDataAccess, SqlDataAccess);

/**
 * Returns a promise containing the result of the query.
 *
 * @param {Query} query - node-sql query object
 */
PostgresDataAccess.prototype.runQuery = function(query) {
  // this uses a connection pool
  var connect = Q.denodeify(pg.connect.bind(pg));

  return connect(this.dbconfig.connectionString)
    .then(function (values) {
      var client = values[0];
      var done = values[1];
      var clientQuery = Q.denodeify(client.query.bind(client));

      return clientQuery('BEGIN')
        .then(function () {
          return clientQuery(query.text, query.values);
        })
        .then(function (result) {
          return clientQuery('COMMIT')
            .then(function () {
              done();
              return result;
            });
        })
        .catch(function (error) {
          return clientQuery('ROLLBACK')
            .finally(function() {
              done();
              throw new Error(error);
            });
        });
    })
    .catch(function(error) {
      throw new Error(error);
    });
};

/**
 * Replaces the id portion of the create statement with a provider
 * specific auto increment statement.
 *
 * @param {string} createStatement - the create statement to modify
 */
PostgresDataAccess.prototype.autoIncrement = function(createStatement) {
  return createStatement.replace(/("id" )integer/, '$1serial');
};

module.exports = PostgresDataAccess;
