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

var admin = require('firebase-admin');
const util = require('util');

var serviceAccount = {};
var fcmAccount = {};

switch (process.env.NODE_ENV) {
  case 'production':
  case 'stage':
    serviceAccount = require(__dirname + '/../../server/firebase.service-account-credentials.' + process.env.NODE_ENV + '.json');
    fcmAccount = require(__dirname + '/../../server/firebase.admin-sdk-credentials.' + process.env.NODE_ENV + '.json');    
    break;
  default:
    serviceAccount = require(__dirname + '/../../server/firebase.service-account-credentials.json');
    fcmAccount = require(__dirname + '/../../server/firebase.admin-sdk-credentials.json');
}

module.exports = {
  firebase: null,
  fcm: null,
  create: function (account) {
    var databaseURL = '';
    var credential = null;

    switch (process.env.NODE_ENV) {
      case 'production':
        databaseURL = 'https://trashoutngo-dev.firebaseio.com';
        break;
      case 'stage':
      default:
        databaseURL = 'https://trashoutngo-stage.firebaseio.com';
    }

    switch (account) {
      case 'fcmAccount':
        credential = admin.credential.cert(fcmAccount);
        break;
      case 'serviceAccount':
      default:
        credential = admin.credential.cert(serviceAccount);
    }

    var config = {
      databaseURL: databaseURL,
      credential: credential
    };

    return admin.initializeApp(config, account);
  },

  validateToken: function (token, callback) {
    var firebase = this.firebase = this.firebase || this.create('serviceAccount');
    var firebaseAuth = firebase.auth();

    firebaseAuth.verifyIdToken(token).then(function (decodedToken) {

      callback(null, decodedToken);

    }).catch(function (error) {
      error.status = 403;

      if (error.message.indexOf('expired') !== -1) {
        error.status = 440;
      } else if (error.message.indexOf('failed') !== -1) {
        error.status = 401;
      }

      callback(error);
    });
  },
  disableUser: function(uid, callback) {
    admin.credential.cert(serviceAccount); // needed?

    admin.auth().updateUser(uid, {
      disabled: true
    }).then(function(userRecord) {
      callback(userRecord.toJSON());
    }).catch(function(error) {
      console.warn("Error updating firebase identity:", error);
    });
  },
  sendMessage(message, callback) {
    var firebase = this.fcm = this.fcm || this.create('fcmAccount');
    const messaging = firebase.messaging();
    console.log(util.inspect(message, false, null));

    messaging.send(message).then(function (response) {
      return callback(null, response);
    }).catch (function (error) {
      return callback(error);
    });
  }
};
