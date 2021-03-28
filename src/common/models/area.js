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

var Promise = require('bluebird');

module.exports = function (Area) {

  function updateAreas(where, data, tx) {
    return new Promise(function (resolve, reject) {
      Area.app.models.GPS.updateAll(where, data, {transaction: tx}, function (err) {

        if (err) {
          return reject(err);
        }

        resolve();
      });
    });
  }

  function updateUserArea(oldAreaId, newAreaId, tx) {
    return new Promise(function (resolve, reject) {
      Area.app.models.UserHasArea.updateAll({areaId: oldAreaId}, {areaId: newAreaId}, {transaction: tx}, function (err) {

        if (err) {
          return reject(err);
        }

        resolve();
      });
    });
  }

  /**
   * Returns list of Areas matching given conditions
   * 
   * @param {String} continent
   * @param {String} country
   * @param {String} aa1
   * @param {String} aa2
   * @param {String} aa3
   * @param {String} locality
   * @param {String} subLocality
   * @param {String} street
   * @param {String} alias Boolean GET method fix
   * @param {String} type
   * @param {Number} page
   * @param {Number} limit
   * @param {Function} cb
   * @returns {Array}
   */
  Area.list = function (continent, country, aa1, aa2, aa3, locality, subLocality, street, alias, type, page, limit, cb) {

    var trend = 'ASC';
    var filter = {
      where: {},
      order: 'continent ' + trend
    };

    if (continent) {
      filter.where.continent = continent;
      filter.where.type = 'country';
      filter.order = 'country ' + trend;
    }

    if (country) {
      filter.where.country = country;
      filter.where.type = 'aa1';
      filter.order = 'aa1 ' + trend;
    }

    if (aa1) {
      filter.where.aa1 = aa1;
      filter.where.type = 'aa2';
      filter.order = 'aa2 ' + trend;
    }

    if (aa2) {
      filter.where.aa2 = aa2;
      filter.where.type = 'aa3';
      filter.order = 'aa3 ' + trend;
    }

    if (aa3) {
      filter.where.aa3 = aa3;
      filter.where.type = 'locality';
      filter.order = 'locality ' + trend;
    }

    if (locality) {
      filter.where.locality = locality;
      filter.where.type = 'subLocality';
      filter.order = 'sub_locality ' + trend;
    }

    if (subLocality) {
      filter.where.subLocality = subLocality;
      filter.where.type = 'street';
      filter.order = 'street ' + trend;
    }

    if (street) {
      filter.where.street = street;
      filter.where.type = 'zip';
      filter.order = 'zip ' + trend;
    }

    if (type) {
      filter.where.type = type;
      filter.order = (type === 'subLocality' ? 'sub_locality' : type) + ' ' + trend;
    }

    switch (alias) {
    case '1':
    case 'true':
      filter.where.aliasId = {neq: null};
      // areas with aliases
      break;
    case '0':
    case 'false':
      // all areas
      break;
    default:
      filter.where.aliasId = null;
      // main areas
      break;
    }

    if (page && limit) {
      filter.skip = (parseInt(page, 10) - 1) * Math.abs(parseInt(limit, 10));
    } else {
      filter.skip = 0;
    }

    if (limit) {
      filter.limit = Math.abs(parseInt(limit, 10));
    }

    Area.find(filter, function (err, instances) {

      if (err) {
        console.error(err);
        return cb(err);
      }

      cb(null, instances);

    });
  };

  /**
   * Updates area
   * 
   * @param {Number} id
   * @param {Number} aliasId
   * @param {Function} cb
   * @returns {Number}
   */
  Area.updateArea = function (id, aliasId, cb) {

    if (id === aliasId) {
      return cb({message: 'Id and aliasId cannot be the same', status: 403});
    }

    Area.findById(id, function (err, instance) {

      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      if (!instance) {
        return cb({message: 'Area does not exist', status: 404});
      }

      Area.beginTransaction({isolationLevel: Area.Transaction.READ_COMMITTED}, function (err, tx) {

        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        var data = {
          aliasId: aliasId || null
        };

        Area.updateAll({id: id}, data, {transaction: tx}, function (err) {

          if (err) {
            console.error(err);
            return cb({message: err.detail});
          }

          if (data.aliasId === null) {

            tx.commit(function (err) {

              if (err) {
                console.error(err);
                return cb({message: err.detail});
              }

              cb(null, 200);
            });

          } else {

            var promises = [];

            // Update all the records from table "gps" that belongs to original areaId to new aliasId
            var areaForeignKeys = ['continentId', 'countryId', 'aa1Id', 'aa2Id', 'aa3Id', 'localityId', 'subLocalityId', 'streetId', 'zipId'];
            areaForeignKeys.forEach(function (key) {

              var updCondition = {};
              updCondition[key] = id;

              var updData = {};
              updData[key] = aliasId;

              promises.push(updateAreas(updCondition, updData, tx));
            });

            // Update column areaId from table "user" to new aliasId
            promises.push(updateUserArea(id, aliasId, tx));

            Promise.all(promises).then(function () {

              tx.commit(function (err) {

                if (err) {
                  console.error(err);
                  return cb({message: err.detail});
                }

                cb(null, 200);
              });

            }).catch(function (error) {
              return cb(error);
            });

          }

        });
      });

    });
  };

  /**
   * Returns all the Areas marked as alias of given Area
   * 
   * @param {Number} aliasId
   * @param {Function} cb
   * @returns {Array}
   */
  Area.aliases = function (aliasId, cb) {

    var filter = {
      where: {
        aliasId: aliasId
      }
    };

    Area.find(filter, function (err, instances) {

      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      if (!instances) {
        return cb({message: 'Area aliases does not exist', status: 404});
      }

      cb(null, instances);
    });
  };

  Area.disableRemoteMethod('find', true); // Removes (GET) /area
  Area.disableRemoteMethod('upsert', true); // Removes (PUT) /area/:id
  Area.disableRemoteMethod('deleteById', true); // Removes (DELETE) /area/:id

  Area.remoteMethod(
    'aliases',
    {
      http: {path: '/aliases/:aliasId/', verb: 'get'},
      accepts: [
        {arg: 'aliasId', type: 'number', required: true, description: 'Alias identifier'}
      ],
      returns: {type: 'object', root: true}
    }
  );

  Area.remoteMethod(
    'updateArea',
    {
      http: {path: '/:id/', verb: 'put'},
      accepts: [
        {arg: 'id', type: 'number', required: true},
        {arg: 'rootAreaId', type: 'number', description: 'Alias identifier'}
      ],
      returns: [
        {arg: 'statusCode', type: 'number'}
      ]

    }
  );

  Area.remoteMethod(
    'list',
    {
      http: {path: '/', verb: 'get'},
      accepts: [
        {arg: 'continent', type: 'string', description: 'Continent'},
        {arg: 'country', type: 'string', description: 'Country'},
        {arg: 'aa1', type: 'string', description: 'Administrative Area 1'},
        {arg: 'aa2', type: 'string', description: 'Administrative Area 2'},
        {arg: 'aa3', type: 'string', description: 'Administrative Area 3'},
        {arg: 'locality', type: 'string', description: 'City'},
        {arg: 'subLocality', type: 'string', description: 'Sub locality'},
        {arg: 'street', type: 'string', description: 'Street'},
        {arg: 'alias', type: 'string', description: 'Alias'},
        {arg: 'type', type: 'string', description: 'Area type'},
        {arg: 'page', type: 'number', description: 'Page'},
        {arg: 'limit', type: 'number', description: 'Limit'}
      ],
      returns: {type: 'object', root: true}
    }
  );

};
