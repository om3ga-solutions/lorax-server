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
var md5 = require('md5');

module.exports = function (ApiKey) {

  /**
   * Creates api key
   * 
   * @param {Number} userId
   * @param {Number} limitPerHour
   * @param {Function} cb
   * @returns {String}
   */
  ApiKey.list = function (userIds, cb) {
    ApiKey.find({where: {userId: {inq: userIds.split(',').map(Number).filter(Boolean)}}}, function (err, instances) {

      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      cb(null, instances);
    });
  };

  /**
   * Creates api key
   * 
   * @param {Number} userId
   * @param {Number} limitPerHour
   * @param {Function} cb
   * @returns {String}
   */
  ApiKey.createKey = function (userId, limitPerHour, cb) {

    ApiKey.findOne({where: {userId: userId}}, function (err, instance) {

      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      if (instance) {
        return cb({message: 'Api key for this user already exists.', apiKey: instance.apiKey, status: 403});
      }

      var limit = limitPerHour || 50;
      var key;

      var d = new Date();

      key = md5(d.toISOString() + Math.random());

      ApiKey.create({apiKey: key, limitPerHour: limit, userId: userId}, function (err) {
        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        cb(null, key);
      });

    });
  };

  /**
   * Regenerates api key
   * 
   * @param {Number} userId
   * @param {Function} cb
   * @returns {String}
   */
  ApiKey.regenerateKey = function (userId, cb) {

    ApiKey.findOne({where: {userId: userId}}, function (err, instance) {

      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      if (!instance) {
        return cb({message: 'This user has no api key.', status: 403});
      }

      var key;

      var d = new Date();

      key = md5(d.toISOString() + Math.random());

      ApiKey.updateAll({userId: userId}, {apiKey: key}, function (err) {
        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        cb(null, key);
      });

    });
  };

  /**
   * Regenerates api key
   * 
   * @param {String} API key
   * @param {Number} limitPerHour
   * @param {Function} cb
   * @returns {String}
   */
  ApiKey.updateKey = function (apiKey, limitPerHour, cb) {

    ApiKey.findOne({where: {apiKey: apiKey}}, function (err, instance) {

      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      if (!instance) {
        return cb({message: 'This user has no api key.', status: 403});
      }

      ApiKey.updateAll({apiKey: apiKey}, {limitPerHour: limitPerHour}, function (err) {
        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        cb(null, instance.apiKey);
      });

    });
  };

  /**
   * Returns info about given api key
   * 
   * @param {String} apiKey
   * @param {Function} cb
   * @returns {Object}
   */
  ApiKey.getInfo = function (apiKey, cb) {
    ApiKey.findOne({where: {apiKey: apiKey}}, function (err, instance) {

      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      if (!instance) {
        return cb({message: 'Api key does not exist.', status: 404});
      }

//      ApiKey.app.models.Redis.count({apiKey: apiKey}, function (err, count) {
//        if (err) {
//          console.error(err);
//          return cb({message: err.detail});
//        }

      cb(null, {
//          gone: count,
//          remaining: (instance.limitPerHour - count),
        apiKey: apiKey,
        limitPerHour: instance.limitPerHour,
        userId: instance.userId
      });
//      });

    });
  };

  ApiKey.disableRemoteMethod('findById', true); // Removes (GET) /apiKey/:id
  ApiKey.disableRemoteMethod('create', true); // Removes (POST) /apiKey
  ApiKey.disableRemoteMethod('upsert', true); // Removes (PUT) /apiKey/:id
  ApiKey.disableRemoteMethod('find', true); // Removes (GET) /apiKey

  ApiKey.remoteMethod(
    'list',
    {
      http: {path: '/', verb: 'get'},
      accepts: [
        {arg: 'userIds', type: 'string', required: true}
      ],
      returns: { type: 'object', root: true }
    }
  );

  ApiKey.remoteMethod(
    'createKey',
    {
      http: {path: '/', verb: 'post'},
      accepts: [
        {arg: 'userId', type: 'number', required: true},
        {arg: 'limitPerHour', type: 'number'}
      ],
      returns: [
        {arg: 'apiKey', type: 'string'}
      ]
    }
  );
  
  ApiKey.remoteMethod(
    'regenerateKey',
    {
      http: {path: '/regenerate', verb: 'put'},
      accepts: [
        {arg: 'userId', type: 'number', required: true}
      ],
      returns: [
        {arg: 'apiKey', type: 'string'}
      ]
    }
  );

  ApiKey.remoteMethod(
    'updateKey',
    {
      http: {path: '/:apiKey', verb: 'put'},
      accepts: [
        {arg: 'apiKey', type: 'string', required: true},
        {arg: 'limitPerHour', type: 'number', required: true}
      ],
      returns: [
        {arg: 'apiKey', type: 'string'}
      ]
    }
  );

  ApiKey.remoteMethod(
    'getInfo',
    {
      http: {path: '/:apiKey', verb: 'get'},
      accepts: [
        {arg: 'apiKey', type: 'string', required: true}
      ],
      returns: [
        {type: 'object', root: true}
      ]
    }
  );
};
