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
var Promise = require('bluebird');

var DIAGONAL_ARGENTINA = 4055807;
var DIAGONAL_GERMANY = 1074847;
var DIAGONAL_SLOVAKIA = 469497;


function smallerCountriesThan(diagonal, zoomLevel) {
  return new Promise(function (resolve, reject) {
    server.models.Area.find({where: {zoomLevel: null, type: 'country', diagonal: {lt: diagonal}}, fields: ['id']}, function (err, instances) {
      if (err) {
        return reject(err);
      }

      var areaIds = [];
      instances.forEach(function (instance) {
        areaIds.push(instance.id);
      });

      server.models.Area.updateAll({id: {inq: areaIds}}, {zoomLevel: zoomLevel}, function (err, result) {
        if (err) {
          return reject(err);
        }

        return resolve(result);
      });
    });
  });
}

function aa1FromLargerCountriesThan(diagonal, zoomLevel) {
  return new Promise(function (resolve, reject) {
    server.models.Area.find({where: {type: 'country', diagonal: {gte: diagonal}}, fields: ['country']}, function (err, instances) {
      if (err) {
        return reject(err);
      }

      var countryNames = [];
      instances.forEach(function (instance) {
        countryNames.push(instance.country);
      });

      server.models.Area.find({where: {zoomLevel: null, type: 'aa1', country: {inq: countryNames}}, fields: ['id']}, function (err, instances) {
        if (err) {
          return reject(err);
        }
        var areaIds = [];
        instances.forEach(function (instance) {
          areaIds.push(instance.id);
        });

        server.models.Area.updateAll({id: {inq: areaIds}}, {zoomLevel: zoomLevel}, function (err, result) {
          if (err) {
            return reject(err);
          }

          return resolve(result);
        });

      });

    });
  });
}

function aa1FromSmallerCountriesThan(diagonal, zoomLevel) {
  return new Promise(function (resolve, reject) {
    server.models.Area.find({where: {type: 'country', diagonal: {lt: diagonal}}, fields: ['country']}, function (err, instances) {
      if (err) {
        return reject(err);
      }

      var countryNames = [];
      instances.forEach(function (instance) {
        countryNames.push(instance.country);
      });

      server.models.Area.find({where: {zoomLevel: null, type: 'aa1', country: {inq: countryNames}}, fields: ['id']}, function (err, instances) {
        if (err) {
          return reject(err);
        }
        var areaIds = [];
        instances.forEach(function (instance) {
          areaIds.push(instance.id);
        });

        server.models.Area.updateAll({id: {inq: areaIds}}, {zoomLevel: zoomLevel}, function (err, result) {
          if (err) {
            return reject(err);
          }

          return resolve(result);
        });

      });

    });
  });
}

function aa1FromCountriesMatchingBoundaries(diagonal1, diagonal2, zoomLevel) {
  return new Promise(function (resolve, reject) {
    server.models.Area.find({where: {type: 'country', diagonal: {gte: diagonal1, lt: diagonal2}}, fields: ['country']}, function (err, instances) {
      if (err) {
        return reject(err);
      }

      var countryNames = [];
      instances.forEach(function (instance) {
        countryNames.push(instance.country);
      });

      server.models.Area.find({where: {zoomLevel: null, type: 'aa1', country: {inq: countryNames}}, fields: ['id']}, function (err, instances) {
        if (err) {
          return reject(err);
        }

        var areaIds = [];
        instances.forEach(function (instance) {
          areaIds.push(instance.id);
        });

        server.models.Area.updateAll({id: {inq: areaIds}}, {zoomLevel: zoomLevel}, function (err, result) {
          if (err) {
            return reject(err);
          }

          return resolve(result);
        });
      });
    });
  });
}

function aa2FromLargerAndEqualCountries(diagonal, zoomLevel) {
  return new Promise(function (resolve, reject) {
    server.models.Area.find({where: {type: 'country', diagonal: {gte: diagonal}}, fields: ['country']}, function (err, instances) {
      if (err) {
        return reject(err);
      }

      var countryNames = [];
      instances.forEach(function (instance) {
        countryNames.push(instance.country);
      });

      server.models.Area.find({where: {zoomLevel: null, type: 'aa2', country: {inq: countryNames}}, fields: ['id']}, function (err, instances) {
        if (err) {
          return reject(err);
        }

        var areaIds = [];
        instances.forEach(function (instance) {
          areaIds.push(instance.id);
        });

        server.models.Area.updateAll({id: {inq: areaIds}}, {zoomLevel: zoomLevel}, function (err, result) {
          if (err) {
            return reject(err);
          }

          return resolve(result);
        });
      });
    });
  });
}

// ------------------------------- ZoomLevel 4, 5 ------------------------------- //

// Smaller countries than Argentina
var p1 = smallerCountriesThan(DIAGONAL_ARGENTINA, 5);

// AA1 from bigger countries than Argentina
var p2 = aa1FromLargerCountriesThan(DIAGONAL_ARGENTINA, 5);

// ------------------------------- !ZoomLevel 4, 5 ------------------------------- //

// ------------------------------- ZoomLevel 6 ------------------------------- //

// Get countries bigger or equal than Argentina and extract all AA2 from them
var p3 = aa2FromLargerAndEqualCountries(DIAGONAL_ARGENTINA, 6);


// get countries between Germany and Argentina and extract all AA1 from them
var p4 = aa1FromCountriesMatchingBoundaries(DIAGONAL_GERMANY, DIAGONAL_ARGENTINA, 6);

// get all countries smaller than Germany
var p5 = smallerCountriesThan(DIAGONAL_GERMANY, 6);

// ------------------------------- !ZoomLevel 6 ------------------------------- //

// ------------------------------- ZoomLevel 7 ------------------------------- //

// AA2 from countries bigger and equal than Germany (included)
var p6 = aa2FromLargerAndEqualCountries(DIAGONAL_GERMANY, 7);

// AA1 for countries between Slovakia and Germany (Slovakia included)
var p7 = aa1FromCountriesMatchingBoundaries(DIAGONAL_SLOVAKIA, DIAGONAL_GERMANY, 7);

// get all countries smaller than Slovakia
var p8 = smallerCountriesThan(DIAGONAL_SLOVAKIA, 7);

// ------------------------------- !ZoomLevel 7 ------------------------------- //

// ------------------------------- ZoomLevel 8, 9 ------------------------------- //

// AA2 from countries bigger than Slovakia
var p9 = aa2FromLargerAndEqualCountries(DIAGONAL_SLOVAKIA, 9);

// AA1 from countries smaller than Slovakia
// add COUNTRY area if no AA1 is present in this country
var p10 = aa1FromSmallerCountriesThan(DIAGONAL_SLOVAKIA, 9);

// ------------------------------- !ZoomLevel 8, 9 ------------------------------- //

Promise.all([p1, p2, p3, p4, p5, p6, p7, p8, p9, p10]).then(function(response) {
  console.log(response);

}).catch(function (error) {
  throw error;
});
