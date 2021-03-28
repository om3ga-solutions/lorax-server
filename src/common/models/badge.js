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

module.exports = function (Badge) {

  var toBasicObject = function(obj) {
    return JSON.parse(JSON.stringify(obj));
  };

  /**
   *
   * @param int id
   * @param function cb
   */
  Badge.detail = function(id, cb) {

    var filter = {
      where: {
        id: id
      },
      include: [
        'image',
        'locality'
      ]
    };

    Badge.findOne(filter, function (err, item) {

      if (err) {
        console.error(err);
        return cb(err);
      }
      cb(null, item);
    });
  };

  /**
   *
   * @param int page
   * @param int limit
   * @param function cb
   */
  Badge.list = function(page, limit, cb) {

    var trend = ' ASC';
    page = page || 1;
    var filter = {
      include: [
        'image',
        'locality'
      ],
      order: 'points ' + trend
    };

    if (page && limit) {
      filter.skip = (parseInt(page, 10) - 1) * Math.abs(parseInt(limit, 10));
    } else {
      filter.skip = 0;
    }

    if (limit) {
      filter.limit = Math.abs(parseInt(limit, 10));
    }

    Badge.find(filter, function (err, instances) {

      if (err) {
        console.error(err);
        return cb(err);
      }

      var out = [];
      instances.forEach(function(item) {
        item = toBasicObject(item);
        item.image = item.image || null;
        item.locality = item.locality || null;
        delete item.localityId;
        delete item.imageId;
        out.push(item);
      });

      cb(null, out);
    });
  };

  Badge.remoteMethod(
    'list',
    {
      http: {path: '/', verb: 'get'},
      accepts: [
        {arg: 'page', type: 'number', description: 'Page'},
        {arg: 'limit', type: 'number', description: 'Limit'}
      ],
      returns: {type: 'object', root: true}
    }
  );

  Badge.remoteMethod(
    'detail',
    {
      http: {path: '/:id/', verb: 'get'},
      accepts: [
        {arg: 'id', type: 'number', desription: 'Badge ID'}
      ],
      returns: {type: 'object', root: true}
    }
  );

};