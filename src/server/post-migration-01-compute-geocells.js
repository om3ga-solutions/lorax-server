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
var Geomodel = require('geomodel').create_geomodel();

server.models.GPS.find({fields: ['lat', 'long', 'id']}, function (err, instances) {
  if (err) {
    throw err;
  }

  instances.forEach(function (instance, index) {
    var geocell = Geomodel.compute(Geomodel.create_point(instance.lat, instance.long));

    server.models.GPS.updateAll({id: instance.id}, {geocell: geocell}, function (err) {
      if (err) {
        throw err;
      }

      console.log(index);
    });
  });

});
