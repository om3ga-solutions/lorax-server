/**
* TRASHOUT IS an environmental project that teaches people how to recycle
* and showcases the worst way of handling waste - illegal dumping. All you need is a smart phone.
*
* FOR PROGRAMMERS: There are 10 types of programmers -
* those who are helping TrashOut and those who are not. Clean up our code,
* so we can clean up our planet. Get in touch with us: help@trashout.ngo
*
* Copyright 2017 TrashOut, n.f.
*
* This file is part of the TrashOut project.
*
* This program is free software; you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation; either version 3 of the License, or
* (at your option) any later version.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
* GNU General Public License for more details.
*
* See the GNU General Public License for more details: <https://www.gnu.org/licenses/>.
*/
'use strict';

require('events').EventEmitter.prototype._maxListeners = 100;

var server = require('./server');
var ds = server.dataSources.trashout;
var Promise = require('bluebird');
var fs = require('fs');

function readFile(path, encoding) {
  return new Promise(function (resolve, reject) {
    fs.readFile(path, encoding, function (err, data) {

      if (err) {
        reject(err);
      }

      resolve(data);
    });
  });
}

var lbTables = [];

Object.keys(server.models).forEach(function (model) {
  if (model === 'ACL' || model === 'AccessToken' || model === 'RoleMapping') {
    return;
  }

  lbTables.push(model);
});

ds.isActual(lbTables, function (err, actual) {

  if (err) {
    throw err;
  }

  if (!actual) {

    var dropForeignKeysSql = readFile(__dirname + '/../sql/dropForeignKeys.sql', 'utf8');

    var foreignKeysDropped = dropForeignKeysSql.then(function (sql) {
      return new Promise(function (resolve, reject) {

        ds.connector.execute(sql, function (err, response) {

          if (err) {
            reject(err);
          }

          var resultQuery = '';

          response.forEach(function (r) {

            resultQuery += r.query;
          });

          ds.connector.execute(resultQuery, function (err, response) {

            if (err) {
              reject(err);
            }

            resolve(response);
          });

        });
      });

    }).catch(function (error) {
      throw error;
    });

    foreignKeysDropped.then(function () {
      console.log('Foreign keys dropped.');
      console.log('==============================');

      ds.autoupdate(lbTables, function (err) {

        if (err) {
          throw err;
        }

        console.log('Tables ' + lbTables + ' has been updated.');

        var addForeignKeysSql = readFile(__dirname + '/../sql/addForeignKeys.sql', 'utf8');

        var foreignKeysAdded = addForeignKeysSql.then(function (sql) {
          return new Promise(function (resolve, reject) {
            ds.connector.execute(sql, function (err, response) {

              if (err) {
                reject(err);
              }

              resolve(response);
            });
          });
        }).catch(function (error) {
          throw error;
        });

        foreignKeysAdded.then(function () {
          console.log('==============================');
          console.log('Foreign keys added.');
          console.log('==============================');
          console.log('Fixed timeout: 5 seconds');
          console.log('Disconnecting...');
          ds.disconnect();
        });

      });
    }).catch(function (error) {
      throw error;
    });
  } else {
    console.log('Everything is actual.');
    process.exit();
  }
});
