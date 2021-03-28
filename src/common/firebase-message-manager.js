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

var server = require('./../server/server');
var Constants = require('./constants');
var Promise = require('bluebird');
var firebaseFactory = require('./../server/boot/firebaseFactory.js');
var async = require('async');

module.exports.sendRaw = function (message) {
  return new Promise(function(resolve, reject) {
    firebaseFactory.sendMessage(message, function (err, response) {
      if (err) {
        return reject(err);
      }

      resolve(response);
    });
  });
};

module.exports.send = function (type, token, data) {

  var androidData = data;
  androidData.titleLocKey = 'notification.' + type + '.header';
  androidData.bodyLocKey = 'notification.' + type + '.text';

  var android = {
    ttl: 3600 * 1000,
    priority: 'high',
    data: androidData
  };

  var apns = {
    payload: {
      aps: {
        alert: {
          'title-loc-key': 'notification.' + type + '.header',
          'loc-key': 'notification.' + type + '.text'
        },
        badge: 42
      },
      data: data
    }
  };

  var message = {
    android: android,
    apns: apns,
    token: token
  };

  return new Promise(function(resolve, reject) {
    module.exports.sendRaw(message).then(resolve).catch(reject);
  });
};

module.exports.sendRecentActivity = function (type, id, userId) {
  return new Promise(function (resolve, reject) {

    var devices = Promise.defer();

    switch (type) {
      case Constants.ACTIVITY_TYPE_TRASH_POINT:
        devices = getTrashPointUserTokens(id, userId);
        break;
      case Constants.ACTIVITY_TYPE_COLLECTION_POINT:
        devices = getCollectionPointUserTokens(id, userId);
        break;
      case Constants.ACTIVITY_TYPE_EVENT:
        devices = getEventUserTokens(id, userId);
        break;
    }

    devices.then(function (tokens) {
      async.eachSeries(tokens, function (token, callback) {
        module.exports.send('recentActivity', token, {type: 'trash', trash_id: id.toString()}).then(function (response) {
          async.setImmediate(callback);
        }).catch(function(error) {
          async.setImmediate(callback);
        });
      }, function (err) {
        if (err) {
          return reject(err);
        }

        resolve();
      });

    }).catch(function (err) {
      return reject(err);
    });

  });

};

/**
 * 
 * @param {Number} id
 * @param {Number} userId
 * @returns {Array}
 */
function getTrashPointUserTokens(id, userId) {
  return new Promise(function(resolve, reject) {
    var filter = {
      where: {
        trashPointId: id,
        //anonymous: false,
        userId: {
          neq: userId
        }
      },
      include: [
        {
          user: ['devices']
        }
      ]
    };

    server.models.TrashPointActivity.find(filter, function (err, trashPointActivities) {
      if (err) {
        return reject(err);
      }

      var results = [];
      trashPointActivities.forEach(function (activity) {
        var temp = activity.toJSON();
        temp.user.devices.forEach(function (device) {
          if (results.indexOf(device.tokenFCM) === -1) {
            results.push(device.tokenFCM);
          }
        });
      });

      resolve(results);
    });

  });
}

function getCollectionPointUserTokens(id, userId) {
  return new Promise(function(resolve, reject) {
    resolve([]);
  });
}

function getEventTokens(id, userId) {
  return new Promise(function(resolve, reject) {
    resolve([]);
  });
}
