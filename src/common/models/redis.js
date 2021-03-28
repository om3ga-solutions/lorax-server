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

module.exports = function (Redis) {

  Redis.testCreate = function (apiKey, cb) {

    Redis.create({apiKey: apiKey}, function (err) {

      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      return cb(null);
    });

  };

  Redis.testCount = function (apiKey, cb) {

    Redis.count({apiKey: apiKey}, function (err, instance) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      return cb(null, instance);
    });

  };

  // Disable built-in remote methods
  Redis.disableRemoteMethod('create', true); // Removes (POST) /redis
  Redis.disableRemoteMethod('upsert', true); // Removes (PUT) /redis/:id
  Redis.disableRemoteMethod('find', true); // Removes (GET) /redis
  Redis.disableRemoteMethod('count', true); // Removes (GET) /redis/count
  Redis.disableRemoteMethod('deleteById', true); // Removes (DELETE) /redis/:id

  Redis.remoteMethod(
    'testCount',
    {
      http: {path: '/test-count/', verb: 'get'},
      accepts: [
        {arg: 'apiKey', type: 'string', required: true}
      ],
      returns: {type: 'object', root: true}
    }
  );

  Redis.remoteMethod(
    'testCreate',
    {
      http: {path: '/test-create/', verb: 'post'},
      accepts: [
        {arg: 'apiKey', type: 'string', required: true}
      ]
    }
  );
};
