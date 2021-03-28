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
var Constants = require('../constants');
var GeoLocation = require('../geo-location');
var GeoPoint = require('loopback').GeoPoint;
var AreaAccessControl = require('../area-access-control');
var messageManager = require('../firebase-message-manager');

// TODO: refactoring this for using one common source
var emailTranslations = {
  'cs_CZ': require(__dirname + '/../../data/localization/cs.json'),
  'de_DE': require(__dirname + '/../../data/localization/de.json'),
  'en_US': require(__dirname + '/../../data/localization/en.json'),
  'es_ES': require(__dirname + '/../../data/localization/es.json'),
  'ru_RU': require(__dirname + '/../../data/localization/ru.json'),
  'sk_SK': require(__dirname + '/../../data/localization/sk.json')
};

// TODO: refactoring this for using one common source
function checkLanguage(lang) {
  var languages = ['cs_CZ', 'de_DE', 'en_US', 'es_ES', 'ru_RU', 'sk_SK'];

  if (!lang || languages.indexOf(lang) === -1) {
    lang = 'en_US';
  }

  return lang;
}

/**
 * Returns changes between current trash and new trash
 *
 * @param {Object} current
 * @param {Object} update
 * @returns {Object}
 */
function createTrashDiff(current, update) {
  var result = {
    changed: {},
    updateTime: (new Date()).toISOString()
  };

  if (current.status !== update.status) {
    result.changed.status = current.status;
  }

  result.changed.images = [];
  current.images.forEach(function (image) {
    result.changed.images.push(image.imageKeys);
  });

  if (current.note !== update.note) {
    result.changed.note = current.note;
  }

  var currentTypeIds = [];
  var currentTypeNames = [];

  current.types.forEach(function (type) {
    currentTypeIds.push(type.id);
    currentTypeNames.push(type.name);
  });

  if (!currentTypeIds.sort().compare(update.trashPointTypeIds.sort())) {
    result.changed.types = currentTypeNames;
  }

  if (current.trashPointSizeId !== update.trashPointSizeId) {
    result.changed.size = current.size.name;
  }

  var currentAccessibilityIds = [];
  var accessibilityTemplate = {
    byCar: false,
    inCave: false,
    underWater: false,
    notForGeneralCleanup: false
  };

  current.accessibilities.forEach(function (acc) {
    accessibilityTemplate[acc.name] = true;
    currentAccessibilityIds.push(acc.id);
  });

  if (!currentAccessibilityIds.sort().compare(update.accessibilityTypeIds.sort())) {
    result.accessibility = accessibilityTemplate;
  }

  return result;
}

module.exports = function (TrashPoint) {

  /**
   * Stores parameters for parametrized queries and returns parameter number
   *
   * @param {type} parameter
   * @returns {String}
   */
  function sanitize(parameter) {
    return TrashPoint.app.models.BaseModel.sanitize(parameter);
  }

  /**
   * Update TrashPoint
   *
   * @param {Number} id TrashPoint identifier
   * @param {Object} response
   * @returns {Object}
   */
  function performUpdate(id, response) {

    return new Promise(function (resolve, reject) {

      TrashPoint.app.models.TrashPointActivity.findOne({where: {trashPointId: id, lastId: null}, include: [{images: 'imageKeys'}, 'size', 'types', 'accessibilities', {gps: 'source'}]}, function (err, instance) {

        if (err) {
          return reject({message: err.detail});
        }

        if (!instance) {
          return reject({message: 'TrashPoint does not exist', status: 404});
        }

        var current = instance.toJSON();

        TrashPoint.beginTransaction({isolationLevel: TrashPoint.Transaction.READ_COMMITTED}, function (err, tx) {

          if (err) {
            return reject({message: err.detail});
          }

          GeoLocation.upsertGps(response.lat, response.long, response.accuracy, response.gpsSourceId).then(function (gpsId) {

            if (err) {
              return reject({message: err.detail});
            }

            var data = {
              status: response.status,
              gpsId: gpsId,
              trashPointId: id,
              userId: TrashPoint.app.models.BaseModel.user.id,
              organizationId: response.organizationId,
              trashPointSizeId: response.trashPointSizeId,
              note: response.note,
              cleanedByMe: response.cleanedByMe,
              anonymous: response.anonymous
            };

            TrashPoint.app.models.TrashPointActivity.create(data, {transaction: tx}, function (err, responseTrashPointActivity) {

              if (err) {
                return reject({message: err.detail});
              }

              TrashPoint.app.models.TrashPointActivity.updateAll({trashPointId: id, id: {neq: responseTrashPointActivity.id}}, {lastId: responseTrashPointActivity.id}, {transaction: tx}, function (err) {

                if (err) {
                  return reject({message: err.detail});
                }

                var p1, p2, p3, p4 = Promise.defer(), p5;

                var accessibilities = [];
                response.accessibilityTypeIds.forEach(function (accessibilityTypeId) {
                  accessibilities.push({accessibilityTypeId: accessibilityTypeId, trashPointActivityId: responseTrashPointActivity.id});
                });

                p1 = TrashPoint.app.models.TrashPointActivityHasAccessibilityType.create(accessibilities, {transaction: tx}, function (err) {

                  if (err) {
                    return reject({message: err.detail});
                  }

                });

                var tpTypes = [];
                response.trashPointTypeIds.forEach(function (trashPointTypeId) {
                  tpTypes.push({trashPointTypeId: trashPointTypeId, trashPointActivityId: responseTrashPointActivity.id});
                });

                p2 = TrashPoint.app.models.TrashPointActivityHasTrashPointType.create(tpTypes, {transaction: tx}, function (err) {

                  if (err) {
                    return reject({message: err.detail});
                  }

                });

                response.images.map(function (img) {
                  delete img.id;
                });

                p3 = TrashPoint.app.models.Image.create(response.images, {transaction: tx}, function (err, responseImage) {

                  if (err) {
                    return reject({message: err.detail});
                  }

                  var trashImages = [];
                  responseImage.forEach(function (image) {
                    trashImages.push({imageId: image.id, trashPointActivityId: responseTrashPointActivity.id});
                  });

                  p4 = TrashPoint.app.models.TrashPointActivityHasImage.create(trashImages, {transaction: tx}, function (err) {

                    if (err) {
                      return reject({message: err.detail});
                    }

                  });
                });

                p5 = TrashPoint.app.models.TrashPointActivity.updateAll({id: current.id}, {changed: createTrashDiff(current, response)}, {transaction: tx}, function (err) {

                  if (err) {
                    return reject({message: err.detail});
                  }

                });

                Promise.all([p1, p2, p3, p4, p5]).then(function () {

                  tx.commit(function (err) {

                    if (err) {
                      return reject({message: err.detail});
                    }

                    // refresh users points
                    if(current.userId) { // trashpoint owner
                      TrashPoint.app.models.User.refreshPoints(current.userId);
                    }
                    if(TrashPoint.app.models.BaseModel.user.id) { // update author - current user
                      TrashPoint.app.models.User.refreshPoints(TrashPoint.app.models.BaseModel.user.id);
                    }

                    return resolve({id: id, activityId: responseTrashPointActivity.id, statusCode: 200});
                  });

                }).catch(function (error) {
                  return reject(error);
                });

              });

            });

          }).catch(function (error) {
            return reject(error);
          });

        });
      });
    });
  }

  /**
   * Returns ids of given TrashPointTypes
   *
   * @param {Array} types
   * @param {Boolean} checkIfExists
   * @returns {Array} result
   */
  function trashPointTypesToIds(types, checkIfExists) {
    return new Promise(function (resolve, reject) {
      TrashPoint.app.models.TrashPointType.find({}, function (err, responseTypes) {

        if (err) {
          console.error(err);
          reject();
        }

        var trashPointTypeIds = [];
        types.forEach(function (a) {
          var exists = false;

          responseTypes.forEach(function (b) {
            if (a === b.name) {
              trashPointTypeIds.push(b.id);
              exists = true;
              return;
            }
          });

          if (checkIfExists && !exists) {
            reject();
          }
        });

        resolve(trashPointTypeIds);
      });

    });
  }

  /**
   * Check input parameter
   *
   * @param {String} method
   * @param {Array} images
   * @param {String} gps
   * @param {String} size
   * @param {Array} type
   * @param {String} status
   * @param {String} note
   * @param {Boolean} anonymous
   * @param {integer} organizationId
   * @param {Array} accessibility
   * @param {Boolean} cleanedByMe
   * @returns {Array}
   */
  function checkParameters(method, images, gps, size, type, status, note, anonymous, organizationId, accessibility, cleanedByMe) {
    return new Promise(function (resolve, reject) {

      // Check whether accessibility is valid object
      if (typeof accessibility !== 'object') {
        return reject({message: 'Accessibility is not valid JSON object', status: 404});
      }

      // Check whether GPS is valid object
      if (!gps || gps.lat === undefined || gps.long === undefined || gps.accuracy === undefined || !gps.source) {
        return reject({message: 'GPS object is not valid', status: 404});
      }

      if (!images || !images.length) {
        return reject({message: 'At least one Image must be provided', status: 404});
      }

      // Check whether type is valid array
      if (typeof type !== 'object') {
        return reject({message: 'Types is not valid array', status: 404});
      }

      TrashPoint.app.models.GPSSource.findOne({where: {name: gps.source}}, function (err, responseGPSSource) {

        if (err) {
          console.error(err);
          return reject({message: err.detail, status: 403});
        }

        // Check source existence
        if (!responseGPSSource) {
          return reject({message: 'GPSSource is not valid', status: 404});
        }

        // Get TrashPointSize by name
        TrashPoint.app.models.TrashPointSize.findOne({where: {name: size}}, function (err, responseTrashPointSize) {

          if (err) {
            console.error(err);
            return reject({message: err.detail, status: 403});
          }

          // Check existence
          if (!responseTrashPointSize) {
            return reject({message: 'TrashPointSize is not valid', status: 404});
          }

          var trashTypes = trashPointTypesToIds(type, true);
          trashTypes.then(function (trashPointTypeIds) {

            if (!trashPointTypeIds.length) {
              return reject({message: 'At least one TrashPointType must be provided', status: 404});
            }

            var accessibilityFilter = {where: {name: {inq: []}}};
            if (accessibility.byCar === true) {
              accessibilityFilter.where.name.inq.push(Constants.TRASH_ACCESSIBILITY_BY_CAR);
            }

            if (accessibility.inCave === true) {
              accessibilityFilter.where.name.inq.push(Constants.TRASH_ACCESSIBILITY_IN_CAVE);
            }

            if (accessibility.underWater === true) {
              accessibilityFilter.where.name.inq.push(Constants.TRASH_ACCESSIBILITY_UNDER_WATER);
            }

            if (accessibility.notForGeneralCleanup === true) {
              accessibilityFilter.where.name.inq.push(Constants.TRASH_ACCESSIBILITY_NOT_FOR_GENERAL_CLEANUP);
            }

            TrashPoint.app.models.AccessibilityType.find(accessibilityFilter, function (err, responseAccessibilityTypes) {

              if (err) {
                console.error(err);
                return reject({message: err.detail, status: 403});
              }

              var accessibilityTypeIds = [];
              responseAccessibilityTypes.forEach(function (accessibilityType) {
                accessibilityTypeIds.push(accessibilityType.id);
              });

              if (method === 'update' && Constants.TRASH_ALLOWED_STATUSES.indexOf(status) === -1) {
                return reject({message: 'Invalid trash status', status: 404});
              }

              // check if user is allowed to report as this organization
              var user = TrashPoint.app.models.BaseModel.user;
              isUserManagerOfOrganization(user.id, organizationId).then(function (ok) {
                if (!ok && user.userRoleId != 4) { // user is not manager of organization and user is not superAdmin
                  return reject({message: 'You are not allowed to report as this organization.', status: 403});
                }

                return resolve({
                  images: images,
                  trashPointSizeId: responseTrashPointSize.id,
                  trashPointTypeIds: trashPointTypeIds,
                  accessibilityTypeIds: accessibilityTypeIds,
                  lat: gps.lat,
                  long: gps.long,
                  accuracy: gps.accuracy,
                  gpsSourceId: responseGPSSource.id,
                  note: note,
                  anonymous: anonymous,
                  organizationId: organizationId,
                  status: method === 'update' ? status : null,
                  cleanedByMe: status === Constants.TRASH_STATUS_CLEANED && cleanedByMe
                });

              }).catch(function (err) {
                console.error(err);
                return reject(err);
              });

            });

          }).catch(function () {
            return reject({message: 'Invalid TrashPointTypes', status: 404});
          });

        });

      });
    });
  }

  /**
   * Creates SQL [where] clause for SQL query in TrashPoint list
   *
   * @param {String} area
   * @param {String} geocells
   * @param {String} geoAreaStreet
   * @param {String} geoAreaZip
   * @param {String} geoAreaSubLocality
   * @param {String} geoAreaLocality
   * @param {String} geoAreaAa3
   * @param {String} geoAreaAa2
   * @param {String} geoAreaAa1
   * @param {String} geoAreaCountry
   * @param {String} geoAreaContinent
   * @param {String} spam
   * @param {String} unreviewed
   * @param {String} timeBoundaryFrom
   * @param {String} timeBoundaryTo
   * @param {String} trashStatus
   * @param {String} trashSize
   * @param {String} trashType
   * @param {String} trashAccessibility
   * @param {String} trashNote
   * @param {String} trashIds
   * @param {String} userIds
   * @param {integer} organizationId
   * @param {String} updateNeeded
   * @returns {String}
   */
  function getTrashListFilterWhereClause(area, geocells, geoAreaStreet, geoAreaZip, geoAreaSubLocality, geoAreaLocality, geoAreaAa3, geoAreaAa2, geoAreaAa1, geoAreaCountry, geoAreaContinent, spam, unreviewed, timeBoundaryFrom, timeBoundaryTo, trashStatus, trashSize, trashType, trashAccessibility, trashNote, trashIds, userIds, organizationId, updateNeeded) {
    var sql = '';

    sql += 'WHERE last_id IS NULL \n';

    if (area && area.length) {
      var points = area.split(',');

      var pointA = {};
      var pointB = {};
      var pointCenter = {};

      try {
        pointA = new GeoPoint(points[0], points[1]);
        pointB = new GeoPoint(points[2], points[3]);
        pointCenter = new GeoPoint((pointA.lat + pointB.lat) / 2, (pointA.lng + pointB.lng) / 2);

        var latH = Math.abs(pointB.lat - pointA.lat) / 2;
        var lngH = Math.abs(pointA.lng - pointB.lng) / 2;

        sql += '  AND gps.lat BETWEEN ' + sanitize(pointCenter.lat - latH) + ' AND ' + sanitize(pointCenter.lat + latH) + ' \n';
        sql += '  AND gps.long BETWEEN ' + sanitize(pointCenter.lng - lngH) + ' AND ' + sanitize(pointCenter.lng + lngH) + ' \n';
      } catch (e) {
        console.error(e);
      }
    }

    if (geocells) {
      var pattern = '^(' + geocells.replaceAll(',', '|') + ')';
      sql += '  AND gps.geocell ~ ' + sanitize(pattern) + ' \n';
    }

    if (geoAreaZip) {
      sql += ' AND tpa.id IN (SELECT tpa.id FROM public.trash_point_activity tpa JOIN public.gps ON gps.id = tpa.gps_id JOIN public.area zip ON zip.id = gps.zip_id WHERE zip.zip = ' + sanitize(geoAreaZip) + ') \n';
    }

    if (geoAreaStreet) {
      sql += ' AND tpa.id IN (SELECT tpa.id FROM public.trash_point_activity tpa JOIN public.gps ON gps.id = tpa.gps_id JOIN public.area street ON street.id = gps.street_id WHERE street.street = ' + sanitize(geoAreaStreet) + ') \n';
    }

    if (geoAreaSubLocality) {
      sql += ' AND tpa.id IN (SELECT tpa.id FROM public.trash_point_activity tpa JOIN public.gps ON gps.id = tpa.gps_id JOIN public.area sublocality ON sublocality.id = gps.sub_locality_id WHERE sublocality.sub_locality = ' + sanitize(geoAreaSubLocality) + ') \n';
    }

    if (geoAreaLocality) {
      sql += ' AND tpa.id IN (SELECT tpa.id FROM public.trash_point_activity tpa JOIN public.gps ON gps.id = tpa.gps_id JOIN public.area locality ON locality.id = gps.locality_id WHERE locality.locality = ' + sanitize(geoAreaLocality) + ') \n';
    }

    if (geoAreaAa3) {
      sql += ' AND tpa.id IN (SELECT tpa.id FROM public.trash_point_activity tpa JOIN public.gps ON gps.id = tpa.gps_id JOIN public.area aa3 ON aa3.id = gps.aa3_id WHERE aa3.aa3 = ' + sanitize(geoAreaAa3) + ') \n';
    }

    if (geoAreaAa2) {
      sql += ' AND tpa.id IN (SELECT tpa.id FROM public.trash_point_activity tpa JOIN public.gps ON gps.id = tpa.gps_id JOIN public.area aa2 ON aa2.id = gps.aa2_id WHERE aa2.aa2 = ' + sanitize(geoAreaAa2) + ') \n';
    }

    if (geoAreaAa1) {
      sql += ' AND tpa.id IN (SELECT tpa.id FROM public.trash_point_activity tpa JOIN public.gps ON gps.id = tpa.gps_id JOIN public.area aa1 ON aa1.id = gps.aa1_id WHERE aa1.aa1 = ' + sanitize(geoAreaAa1) + ') \n';
    }

    if (geoAreaCountry) {
      sql += ' AND tpa.id IN (SELECT tpa.id FROM public.trash_point_activity tpa JOIN public.gps ON gps.id = tpa.gps_id JOIN public.area country ON country.id = gps.country_id WHERE country.country = ' + sanitize(geoAreaCountry) + ') \n';
    }

    if (geoAreaContinent) {
      sql += ' AND tpa.id IN (SELECT tpa.id FROM public.trash_point_activity tpa JOIN public.gps ON gps.id = tpa.gps_id JOIN public.area continent ON continent.id = gps.continent_id WHERE continent.continent = ' + sanitize(geoAreaContinent) + ') \n';
    }

    switch (spam) {
    case 'true':
    case '1':
      sql += '  AND tpa.trash_point_id IN (SELECT DISTINCT(tpa2.trash_point_id) FROM public.spam s JOIN public.trash_point_activity tpa2 ON (tpa2.id = s.trash_point_activity_id AND tpa2.trash_point_id = tpa.trash_point_id) WHERE s.resolved IS NULL) \n';
      break;
    case 'false':
    case '0':
      // There must be at least one record in table spam
      sql += '  AND tpa.trash_point_id NOT IN (SELECT DISTINCT(tpa2.trash_point_id) FROM public.spam s JOIN public.trash_point_activity tpa2 ON (tpa2.id = s.trash_point_activity_id AND tpa2.trash_point_id = tpa.trash_point_id) WHERE s.resolved IS NULL) \n';
      break;
    }

    switch (unreviewed) {
    case 'true':
    case '1':
      sql += '  AND tp.reviewed IS NULL \n';
      break;
    case 'false':
    case '0':
      sql += '  AND tp.reviewed IS NOT NULL \n';
      break;
    }

    if (timeBoundaryFrom) {
      sql += ' AND tp.id IN (SELECT tpatbf.trash_point_id FROM public.trash_point_activity tpatbf WHERE tpatbf.created >= ' + sanitize(timeBoundaryFrom) + ') \n';
    }

    if (timeBoundaryTo) {
      sql += ' AND tp.id IN (SELECT tpatbt.trash_point_id FROM public.trash_point_activity tpatbt WHERE tpatbt.created <= ' + sanitize(timeBoundaryTo) + ') \n';
    }

    if (trashStatus) {
      sql += '  AND tpa.status IN (' + sanitize(trashStatus.split(',')) + ') \n';
    }

    if (trashSize) {
      sql += '  AND tpa.trash_point_size_id IN (SELECT tps.id FROM public.trash_point_size tps WHERE tps.name IN(' + sanitize(trashSize.split(',')) + ')) \n';
    }

    if (trashType) {
      sql += '  AND tpa.id IN (SELECT tpahtpt.trash_point_activity_id FROM public.trash_point_activity_has_trash_point_type tpahtpt JOIN public.trash_point_type tpt ON (tpahtpt.trash_point_type_id = tpt.id) WHERE tpt.name IN (' + sanitize(trashType.split(',')) + ')) \n';
    }

    if (trashAccessibility) {
      var positive = [];
      var negative = [];
      trashAccessibility.split(',').forEach(function (str) {
        if (str.substr(0, 1) === '-') {
          negative.push(str.substr(1));
        } else {
          positive.push(str);
        }
      });

      if (positive.length) {
        sql += '  AND tpa.id IN (SELECT tpahac.trash_point_activity_id FROM public.trash_point_activity_has_accessibility_type tpahac JOIN public.accessibility_type ac ON (tpahac.accessibility_type_id = ac.id) WHERE ac.name IN (' + sanitize(positive) + ')) \n';
      }

      // There must be at least one record for every accessibility type in table trash_point_activity_has_accessibility_type
      if (negative.length) {
        sql += '  AND tpa.id NOT IN (SELECT tpahac.trash_point_activity_id FROM public.trash_point_activity_has_accessibility_type tpahac JOIN public.accessibility_type ac ON (tpahac.accessibility_type_id = ac.id) WHERE ac.name IN (' + sanitize(negative) + ')) \n';
      }
    }

    if (trashNote) {
      sql += '  AND tpa.note ILIKE ' + sanitize('%' + trashNote + '%') + ' \n';
    }

    if (trashIds) {
      sql += '  AND tpa.trash_point_id IN (' + sanitize(trashIds.split(',').map(Number).filter(Boolean)) + ') \n';
    }

    if (userIds) {
      sql += '  AND tpa.trash_point_id IN (SELECT DISTINCT(tpa3.trash_point_id) FROM public.trash_point_activity tpa3 WHERE tpa3.anonymous IS FALSE AND tpa3.user_id IN (' + sanitize(userIds.split(',').map(Number).filter(Boolean)) + ')) \n';
    }

    if (organizationId) {
      sql += '  AND tpa.trash_point_id IN (SELECT DISTINCT(tpa4.trash_point_id) FROM public.trash_point_activity tpa4 WHERE tpa4.anonymous IS FALSE AND tpa4.user_id IN (SELECT user_id FROM public.user_has_organization WHERE organization_id = ' + parseInt(organizationId) + ')) \n';
    }

    switch (updateNeeded) {
    case 'true':
    case '1':
      sql += '  AND ( (NOW() - tpa.created) > INTERVAL \'' + Constants.TRASH_UPDATE_NEEDED_DAYS + ' days\' AND status <> \'cleaned\' ) \n';
      break;
    case 'false':
    case '0':
      sql += '  AND ( (NOW() - tpa.created) < INTERVAL \'' + Constants.TRASH_UPDATE_NEEDED_DAYS + ' days\' OR status = \'cleaned\' ) \n';
      break;
    }

    return sql;
  }

  /**
   * Creates SQL query for TrashPoint list
   *
   * @param {Array} attributes
   * @param {String} area
   * @param {String} geocells
   * @param {String} geoAreaStreet
   * @param {String} geoAreaZip
   * @param {String} geoAreaSubLocality
   * @param {String} geoAreaLocality
   * @param {String} geoAreaAa3
   * @param {String} geoAreaAa2
   * @param {String} geoAreaAa1
   * @param {String} geoAreaCountry
   * @param {String} geoAreaContinent
   * @param {String} spam
   * @param {String} unreviewed
   * @param {String} timeBoundaryFrom
   * @param {String} timeBoundaryTo
   * @param {String} trashStatus
   * @param {String} trashSize
   * @param {String} trashType
   * @param {String} trashAccessibility
   * @param {String} trashNote
   * @param {String} trashIds
   * @param {String} userIds
   * @param {integer} organizationId
   * @param {String} updateNeeded
   * @param {String} orderBy
   * @param {String} userPosition
   * @param {Number} page
   * @param {Number} limit
   * @returns {String}
   */
  function getTrashListSQL(attributes, area, geocells, geoAreaStreet, geoAreaZip, geoAreaSubLocality, geoAreaLocality, geoAreaAa3, geoAreaAa2, geoAreaAa1, geoAreaCountry, geoAreaContinent, spam, unreviewed, timeBoundaryFrom, timeBoundaryTo, trashStatus, trashSize, trashType, trashAccessibility, trashNote, trashIds, userIds, organizationId, updateNeeded, orderBy, userPosition, page, limit) {

    var sql = '';

    sql += 'SELECT \n';
    sql += '  result.*, \n';

    if (attributes.indexOf(Constants.TRASH_ATTR_TYPES) > -1) {
      sql += '  array_to_json(ARRAY(SELECT tpt.name FROM public.trash_point_type tpt JOIN public.trash_point_activity_has_trash_point_type tpahtpt ON (tpahtpt.trash_point_type_id = tpt.id AND tpahtpt.trash_point_activity_id = result.activity_id))) AS types, \n';
    }

    if (attributes.indexOf(Constants.TRASH_ATTR_ACCESSIBILITY) > -1) {
      sql += '  array_to_json(ARRAY(SELECT at.name FROM accessibility_type at JOIN public.trash_point_activity_has_accessibility_type tpahat ON (tpahat.accessibility_type_id = at.id AND tpahat.trash_point_activity_id = result.activity_id))) AS accessibility, \n';
    }

    if (attributes.indexOf(Constants.TRASH_ATTR_IMAGES) > -1) {
      sql += '  (SELECT array_to_json(array_agg(i)) \n';
      sql += '    FROM ( \n';
      sql += '      SELECT i.full_storage_location AS "fullStorageLocation", \n';
      sql += '      i.full_download_url AS "fullDownloadUrl", \n';
      sql += '      i.thumb_download_url AS "thumbDownloadUrl", \n';
      sql += '      i.thumb_retina_storage_location AS "thumbRetinaStorageLocation", \n';
      sql += '      i.thumb_retina_download_url AS "thumbRetinaDownloadUrl", \n';
      sql += '      i.created, \n';
      sql += '      i.id \n';
      sql += '      FROM public.image i \n';
      sql += '      JOIN public.trash_point_activity_has_image tpahi ON (tpahi.image_id = i.id AND result.activity_id = tpahi.trash_point_activity_id) \n';
      sql += '    ) AS i \n';
      sql += '  ) AS images, \n';
    }

    if (attributes.indexOf(Constants.TRASH_ATTR_UPDATE_HISTORY) > -1) {
      sql += '  (SELECT array_to_json(array_agg(h)) FROM (SELECT json_build_object(\'activityId\', h.id) AS "activityId", json_build_object(\'id\', hu.id, \'firstName\', hu.first_name, \'lastName\', hu.last_name) AS "userInfo", h.changed::json AS data, h.created AS created FROM public.trash_point_activity h JOIN public.user hu ON hu.id = h.user_id WHERE h.last_id = result.activity_id ORDER BY h.created ASC) AS h \n';
      sql += '  ) AS update_history, \n';
    }

    sql += '  "last_column_fix" AS last_column_fix \n';
    sql += 'FROM (\n';

    sql += 'SELECT \n';
    if (attributes.indexOf(Constants.TRASH_ATTR_ID) > -1) {
      sql += '  tpa.trash_point_id AS id, \n';
      sql += '  tpa.id AS activity_id, \n';
    }

    var safeOrderByUserPosition = false;
    if (attributes.indexOf(Constants.TRASH_ATTR_GPS_SHORT) > -1 || attributes.indexOf(Constants.TRASH_ATTR_GPS_FULL) > -1) {
      sql += '  gps.lat AS gps_lat, \n';
      sql += '  gps.long AS gps_long, \n';
      sql += '  gps.accuracy AS gps_accuracy, \n';
      sql += '  gps_source.name AS gps_source, \n';

      if (userPosition) {
        try {
          var pos = new GeoPoint(userPosition.split(',')[0], userPosition.split(',')[1]);
          sql += '  ST_Distance(ST_MakePoint(gps.long, gps.lat), ST_MakePoint(' + sanitize(pos.lng) + ', ' + sanitize(pos.lat) + ')::geography) AS closest, \n';
          safeOrderByUserPosition = true;
        } catch (e) {
          console.error(e);
        }
      }
    }

    if (attributes.indexOf(Constants.TRASH_ATTR_GPS_FULL) > -1) {
      sql += '  CASE WHEN gps.zip_id IS NOT NULL THEN \n';
      sql += '    (SELECT array_to_json(array_agg(a)) FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.zip_id) AS a) \n';
      sql += '  WHEN gps.street_id IS NOT NULL THEN \n';
      sql += '    (SELECT array_to_json(array_agg(a)) FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.street_id) AS a) \n';
      sql += '  WHEN gps.sub_locality_id IS NOT NULL THEN \n';
      sql += '    (SELECT array_to_json(array_agg(a)) FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.sub_locality_id) AS a) \n';
      sql += '  WHEN gps.locality_id IS NOT NULL THEN \n';
      sql += '    (SELECT array_to_json(array_agg(a)) FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.locality_id) AS a) \n';
      sql += '  WHEN gps.aa3_id IS NOT NULL THEN \n';
      sql += '    (SELECT array_to_json(array_agg(a)) FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.aa3_id) AS a) \n';
      sql += '  WHEN gps.aa2_id IS NOT NULL THEN \n';
      sql += '    (SELECT array_to_json(array_agg(a)) FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.aa2_id) AS a) \n';
      sql += '  WHEN gps.aa1_id IS NOT NULL THEN \n';
      sql += '    (SELECT array_to_json(array_agg(a)) FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.aa1_id) AS a) \n';
      sql += '  WHEN gps.country_id IS NOT NULL THEN \n';
      sql += '    (SELECT array_to_json(array_agg(a)) FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.country_id) AS a) \n';
      sql += '  WHEN gps.continent_id IS NOT NULL THEN \n';
      sql += '    (SELECT array_to_json(array_agg(a)) FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.continent_id) AS a) \n';
      sql += '  ELSE \n';
      sql += '    NULL \n';
      sql += '  END AS gps_area, \n';
    }

    if (attributes.indexOf(Constants.TRASH_ATTR_USER_INFO) > -1) {
      sql += '  u.id AS user_info_id, \n';
      sql += '  u.first_name AS user_info_first_name, \n';
      sql += '  u.last_name AS user_info_last_name, \n';
    }

    if (attributes.indexOf(Constants.TRASH_ATTR_SIZE) > -1) {
      sql += '  tps.name AS size, \n';
    }

    if (attributes.indexOf(Constants.TRASH_ATTR_NOTE) > -1) {
      sql += '  tpa.note AS note, \n';
    }

    if (attributes.indexOf(Constants.TRASH_ATTR_ANONYMOUS) > -1) {
      sql += '  tpa.anonymous AS anonymous, \n';
    }

    if (attributes.indexOf(Constants.TRASH_ATTR_STATUS) > -1) {
      sql += '  tpa.status AS status, \n';
    }

    if (attributes.indexOf(Constants.TRASH_ATTR_CLEANED_BY_ME) > -1) {
      sql += '  tpa.cleaned_by_me AS cleaned_by_me, \n';
    }

    if (attributes.indexOf(Constants.TRASH_ATTR_CREATED) > -1) {
      sql += '  tp.created, \n';
      sql += '  tpa.created AS activity_created, \n';
    }

    if (attributes.indexOf(Constants.TRASH_ATTR_UPDATE_TIME) > -1) {
      sql += '  tpa.created AS update_time, \n';
    }

    if (attributes.indexOf(Constants.TRASH_ATTR_UPDATE_NEEDED) > -1) {
      sql += '  CASE WHEN (NOW() - tpa.created) > INTERVAL \'' + Constants.TRASH_UPDATE_NEEDED_DAYS + ' days\' AND status <> \'cleaned\' THEN 1 ELSE 0 END AS update_needed, \n';
    }

    if (attributes.indexOf(Constants.TRASH_ATTR_SPAM) > -1) {
      sql += '  CASE WHEN tpa.trash_point_id IN (SELECT DISTINCT(tpa_attr.trash_point_id) FROM public.spam s_attr JOIN public.trash_point_activity tpa_attr ON (tpa_attr.id = s_attr.trash_point_activity_id AND tpa_attr.trash_point_id = tpa.trash_point_id)) THEN true ELSE false END AS spam, \n';
    }

    if (attributes.indexOf(Constants.TRASH_ATTR_UNREVIEWED) > -1) {
      sql += '  CASE WHEN tp.reviewed IS NOT NULL THEN false ELSE true END AS unreviewed, \n';
    }

    sql += '\'last_column_fix\' AS last_column_fix \n';

    sql += 'FROM public.trash_point_activity tpa \n';

    if (attributes.indexOf(Constants.TRASH_ATTR_GPS_SHORT) > -1 || attributes.indexOf(Constants.TRASH_ATTR_GPS_FULL) > -1 || area || geocells) {
      sql += 'JOIN public.gps ON gps.id = tpa.gps_id \n';
      sql += 'JOIN public.gps_source ON gps_source.id = gps.gps_source_id \n';
    }

    if (attributes.indexOf(Constants.TRASH_ATTR_SIZE) > -1) {
      sql += 'JOIN public.trash_point_size tps ON tps.id = tpa.trash_point_size_id \n';
    }

    if (attributes.indexOf(Constants.TRASH_ATTR_GPS_FULL) > -1) {
      sql += 'LEFT JOIN public.area continent ON continent.id = gps.continent_id \n';
      sql += 'LEFT JOIN public.area country ON country.id = gps.country_id \n';
      sql += 'LEFT JOIN public.area aa1 ON aa1.id = gps.aa1_id \n';
      sql += 'LEFT JOIN public.area aa2 ON aa2.id = gps.aa2_id \n';
      sql += 'LEFT JOIN public.area aa3 ON aa3.id = gps.aa3_id \n';
      sql += 'LEFT JOIN public.area locality ON locality.id = gps.locality_id \n';
      sql += 'LEFT JOIN public.area sub_locality ON sub_locality.id = gps.sub_locality_id \n';
      sql += 'LEFT JOIN public.area street ON street.id = gps.street_id \n';
      sql += 'LEFT JOIN public.area zip ON zip.id = gps.zip_id \n';
    }

    if (attributes.indexOf(Constants.TRASH_ATTR_USER_INFO) > -1) {
      sql += 'JOIN public.user u ON u.id = tpa.user_id \n';
    }

    sql += 'JOIN public.trash_point tp ON tp.id = tpa.trash_point_id \n';

    sql += getTrashListFilterWhereClause(area, geocells, geoAreaStreet, geoAreaZip, geoAreaSubLocality, geoAreaLocality, geoAreaAa3, geoAreaAa2, geoAreaAa1, geoAreaCountry, geoAreaContinent, spam, unreviewed, timeBoundaryFrom, timeBoundaryTo, trashStatus, trashSize, trashType, trashAccessibility, trashNote, trashIds, userIds, organizationId, updateNeeded);

    if (orderBy) {
      var order = [];
      orderBy.split(',').forEach(function (str) {
        var column = str.substr(0, 1) === '-' ? str.substr(1) : str;
        var trend = str.substr(0, 1) === '-' ? ' DESC' : ' ASC';

        switch (column) {
        case Constants.TRASH_ORDER_BY_NOTE:
        case Constants.TRASH_ORDER_BY_STATUS:
        case Constants.TRASH_ORDER_BY_ANONYMOUS:
          order.push('tpa.' + column + trend);
          break;
        case Constants.TRASH_ORDER_BY_REVIEWED:
        case Constants.TRASH_ORDER_BY_CREATED:
        case Constants.TRASH_ORDER_BY_ID:
          order.push('tp.' + column + trend);
          break;
        case Constants.TRASH_ORDER_BY_GPS:
          if (safeOrderByUserPosition) {
            order.push('closest ASC');
          }
          break;
        case Constants.TRASH_ORDER_BY_SIZE:
          order.push('tpa.trash_point_size_id' + (trend === ' DESC' ? ' ASC' : ' DESC'));
          break;
        case Constants.TRASH_ORDER_BY_UPDATE:
          order.push('tpa.created' + trend);
        }
      });

      if (order.length) {
        sql += ' ORDER BY ' + order + ' \n';
      }
    }

    if (page && limit) {
      sql += 'OFFSET ' + sanitize((parseInt(page, 10) - 1) * Math.abs(parseInt(limit, 10))) + ' \n';
    }

    if (limit) {
      sql += 'LIMIT ' + sanitize(limit) + ' \n';
    } else {
      sql += 'LIMIT ' + sanitize(1000) + ' \n';
    }

    sql += '  ) AS result';

    return sql;
  }

  /**
   * Creates SQL query for TrashPoint count
   *
   * @param {String} area
   * @param {String} geocells
   * @param {String} geoAreaStreet
   * @param {String} geoAreaZip
   * @param {String} geoAreaSubLocality
   * @param {String} geoAreaLocality
   * @param {String} geoAreaAa3
   * @param {String} geoAreaAa2
   * @param {String} geoAreaAa1
   * @param {String} geoAreaCountry
   * @param {String} geoAreaContinent
   * @param {String} spam
   * @param {String} unreviewed
   * @param {String} timeBoundaryFrom
   * @param {String} timeBoundaryTo
   * @param {String} trashStatus
   * @param {String} trashSize
   * @param {String} trashType
   * @param {String} trashAccessibility
   * @param {String} trashNote
   * @param {String} trashIds
   * @param {String} userIds
   * @param {integer} organizationId
   * @param {String} updateNeeded
   * @returns {String}
   */
  function getTrashListCountSQL(area, geocells, geoAreaStreet, geoAreaZip, geoAreaSubLocality, geoAreaLocality, geoAreaAa3, geoAreaAa2, geoAreaAa1, geoAreaCountry, geoAreaContinent, spam, unreviewed, timeBoundaryFrom, timeBoundaryTo, trashStatus, trashSize, trashType, trashAccessibility, trashNote, trashIds, userIds, organizationId, updateNeeded) {
    var sql = 'SELECT COUNT (a.id) AS count \n';
    sql += 'FROM ( \n';

    sql += '  SELECT tpa.id \n';
    sql += '  FROM public.trash_point_activity tpa \n';
    sql += '  JOIN public.trash_point tp ON tp.id = tpa.trash_point_id \n';

    if (area || geocells) {
      sql += '  JOIN public.gps ON gps.id = tpa.gps_id \n';
    }

    sql += getTrashListFilterWhereClause(area, geocells, geoAreaStreet, geoAreaZip, geoAreaSubLocality, geoAreaLocality, geoAreaAa3, geoAreaAa2, geoAreaAa1, geoAreaCountry, geoAreaContinent, spam, unreviewed, timeBoundaryFrom, timeBoundaryTo, trashStatus, trashSize, trashType, trashAccessibility, trashNote, trashIds, userIds, organizationId, updateNeeded);

    sql += ') AS a \n';

    return sql;
  }

  // Remote method definitions

  /**
   * Returns TrashPoint detail
   *
   * @param {Number} id
   * @param {Function} cb
   * @returns {Object}
   */
  TrashPoint.getTrash = function (id, cb) {

    var filter = {
      where: {
        trashPointId: id,
        lastId: null
      },
      include: [
        {
          images: 'imageKeys'
        },
        'size',
        'types',
        'accessibilities',
        {
          user: ['image']
        },
        {
          organization: ['image']
        },
        {
          gps: ['source', 'continent', 'country', 'aa1', 'aa2', 'aa3', 'locality', 'subLocality', 'street', 'zip']
        },
        {
          history: [{user: ['image']}, {organization: ['image']}]
        },
        {
          trashPoint: [
            {
              relation: 'events',
              scope: {
                where: {start: {gte: (new Date()).toISOString()}},
                order: ['created DESC'],
                include: {gps: ['source', 'continent', 'country', 'aa1', 'aa2', 'aa3', 'locality', 'subLocality', 'street', 'zip']}
              }
            }
          ]
        }
      ]
    };

    TrashPoint.app.models.TrashPointActivity.findOne(filter, function (err, instance) {

      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      if (!instance) {
        return cb({message: 'TrashPoint does not exist', status: 404});
      }

      var current = instance.toJSON();

      var types = [];
      current.types.forEach(function (type) {
        types.push(type.name);
      });

      var gps = {
        lat: current.gps.lat,
        long: current.gps.long,
        accuracy: current.gps.accuracy,
        source: current.gps.source.name,
        area: current.gps.zip || current.gps.street || current.gps.subLocality || current.gps.locality || current.gps.aa3 || current.gps.aa2 || current.gps.aa1 || current.gps.country || current.gps.continent || {}
      };

      var images = [];
      current.images.forEach(function (image) {
        images.push(image.imageKeys);
      });

      var accessibility = {
        byCar: false,
        inCave: false,
        underWater: false,
        notForGeneralCleanup: false
      };
      current.accessibilities.forEach(function (acc) {
        accessibility[acc.name] = true;
      });

      var history = [];
      current.history.forEach(function (h) {
        if (h.changed) {
          h.changed.userInfo = {
            userId: h.user.id,
            firstName: h.anonymous ? null: h.user.firstName,
            lastName: h.anonymous ? null: h.user.lastName,
            image: h.anonymous ? null : (h.user.image || null)
          };
          h.changed.organization = h.organization;
          h.changed.anonymous = h.user.email ? h.anonymous : true; // Check if this activity is created by Firebase anonymous user
          h.changed.activityId = h.id;
          h.changed.updateTime = h.created;
          h.changed.changed.status = h.status;
          history.push(h.changed);
        }
      });

      var events = [];
      if (current.trashPoint.events) {
        current.trashPoint.events.forEach(function (event) {
          events.push({
            id: event.id,
            name: event.name,
            gps: {
              lat: event.gps.lat,
              long: event.gps.long,
              accuracy: event.gps.accuracy,
              source: event.gps.source.name,
              area: event.gps.zip || event.gps.street || event.gps.subLocality || event.gps.locality || event.gps.aa3 || event.gps.aa2 || event.gps.aa1 || event.gps.country || event.gps.continent || {}
            },
            description: event.description,
            start: event.start,
            duration: event.duration
          });
        });
      }

      var updateNeeded = 0;
      if (current.status !== Constants.TRASH_STATUS_CLEANED) {
        var date = new Date();
        updateNeeded = (((date.getTime() - current.created.getTime()) / (24 * 60 * 60 * 1000)) > Constants.TRASH_UPDATE_NEEDED_DAYS) ? 1 : 0;
      }

      TrashPoint.getComments(current.trashPointId, function (err, comments) {
        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        var result = {
          id: current.trashPointId,
          activityId: current.id,
          images: images,
          gps: gps,
          size: current.size.name,
          types: types,
          userInfo: {
            userId: current.user.id,
            firstName: current.user.firstName,
            lastName: current.user.lastName,
            image: current.user.image || null
          },
          organization: current.organization,
          anonymous: current.user.email ? current.anonymous : true, // Check if this activity is created by Firebase anonymous user
          note: current.note,
          status: current.status,
          cleanedByMe: current.cleanedByMe,
          accessibility: accessibility,
          created: current.trashPoint.created,
          updateTime: current.created,
          updateHistory: history,
          url: 'https://admin.trashout.ngo/trash-management/detail/' + current.trashPointId,
          updateNeeded: updateNeeded,
          events: events,
          comments: comments
        };

        cb(null, result);
      });
    });
  };

  /**
   * Deletes TrashPoint
   *
   * User can delete TrashPoint only when creator is unreviewed user
   * or one of TrashPointActivity is marked as spam
   *
   * @param {Number} id
   * @param {Function} cb
   */
  TrashPoint.deleteTrash = function (id, cb) {
    TrashPoint.beginTransaction({isolationLevel: TrashPoint.Transaction.READ_COMMITTED}, function (err, tx) {

      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      var filter = {
        where: {
          trashPointId: id,
          lastId: null
        },
        include: ['gps']
      };

      TrashPoint.findById(id, {include: ['user', {activities: 'spam'}]}, {transaction: tx}, function (err, trInstance) {

        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        var trashPoint = trInstance.toJSON();

        if (!trashPoint) {
          return cb({message: 'TrashPoint does not exist', status: 404});
        }

        var canRemove = false;
        // Check if at least one TrashPointActivity is marked as spam
        trashPoint.activities.forEach(function (activity) {
          if (activity.spam.length) {
            canRemove = true;
          }
        });

        // Check if TrashPoint creator is reviewed
        if (!TrashPoint.user.reviewed) {
          canRemove = true;
        }

        if (!canRemove) {
          return cb({message: 'TrashPoint creator has to be unreviewed or at least one TrashPointActivity has to be marked as spam in order to delete this TrashPoint.', status: 403});
        }

        TrashPoint.app.models.TrashPointActivity.findOne(filter, {transaction: tx}, function (err, instance) {

          if (err) {
            console.error(err);
            return cb({message: err.detail});
          }

          if (!instance) {
            return cb({message: 'TrashPoint does not have any activity to check whether user has area based permissions.', status: 404});
          }

          AreaAccessControl.check(Constants.METHOD_TRASH_POINT_DELETE, TrashPoint.app.models.BaseModel.user, instance.toJSON().gps, TrashPoint.settings.acls).then(function () {

            // Delete TrashPoint, foreign keys will do the rest
            TrashPoint.destroyAll({id: id}, {transaction: tx}, function (err) {

              if (err) {
                console.error(err);
                return cb({message: err.detail});
              }

              tx.commit(function (err) {

                if (err) {
                  console.error(err);
                  return cb({message: err.detail});
                }

                cb(null);
              });

            });

          }).catch(function (e) {
            cb({message: e.message, status: 403});
          });
        });
      });

    });

  };

  /**
   * Deletes TrashPointActivity
   *
   * @param {Number} id
   * @param {Function} cb
   */
  TrashPoint.deleteActivity = function (id, cb) {

    TrashPoint.beginTransaction({isolationLevel: TrashPoint.Transaction.READ_COMMITTED}, function (err, tx) {

      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      TrashPoint.app.models.TrashPointActivity.findById(id, {include: [
        'history', 'gps'
      ]}, {transaction: tx}, function (err, instance) {

        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        if (!instance) {
          return cb({message: 'TrashActivity does not exist', status: 404});
        }

        var current = instance.toJSON();

        AreaAccessControl.check(Constants.METHOD_TRASH_POINT_ACTIVITY_DELETE, TrashPoint.app.models.BaseModel.user, current.gps, TrashPoint.settings.acls).then(function () {
          if (current.lastId === null) {

            if (current.history.length) {
              // TrashPointActivity is last (then delete last TrashPointActivity and set lastId for previous acitivities properly)
              var newLastId = current.history[current.history.length - 1].id;

              var p1 = TrashPoint.app.models.TrashPointActivity.updateAll({trashPointId: current.trashPointId, id: {nin: [current.id, newLastId]}}, {lastId: newLastId}, {transaction: tx}, function (err) {

                if (err) {
                  console.error(err);
                  return cb({message: err.detail});
                }

              });

              var p2 = TrashPoint.app.models.TrashPointActivity.updateAll({id: newLastId}, {lastId: null, changed: null}, {transaction: tx}, function (err) {

                if (err) {
                  console.error(err);
                  return cb({message: err.detail});
                }

              });

              Promise.all([p1, p2]).then(function () {

                TrashPoint.app.models.TrashPointActivity.destroyAll({id: current.id}, {transaction: tx}, function (err) {

                  if (err) {
                    console.error(err);
                    return cb({message: err.detail});
                  }

                  tx.commit(function (err) {

                    if (err) {
                      console.error(err);
                      return cb({message: err.detail});
                    }

                    cb(null);
                  });

                });
              });

            } else {
              // TrashPointActivity is first (then delete TrashPoint, foreign keys will do the rest)
              TrashPoint.destroyAll({id: current.trashPointId}, {transaction: tx}, function (err) {

                if (err) {
                  console.error(err);
                  return cb({message: err.detail});
                }

                tx.commit(function (err) {

                  if (err) {
                    console.error(err);
                    return cb({message: err.detail});
                  }

                  cb(null);
                });

              });
            }
          } else {
            // delete TrashPointActivity
            TrashPoint.app.models.TrashPointActivity.destroyAll({id: current.id}, {transaction: tx}, function (err) {

              if (err) {
                console.error(err);
                return cb({message: err.detail});
              }

              tx.commit(function (err) {

                if (err) {
                  console.error(err);
                  return cb({message: err.detail});
                }

                cb(null);
              });

            });
          }
        }).catch(function (e) {
          cb({message: e.message, status: 403});
        });

      });

    });

  };

  /**
   * Deletes Image from TrashPointActivity
   *
   * @param {Number} id
   * @param {Number} imageId
   * @param {Function} cb
   */
  TrashPoint.deleteActivityImage = function (id, imageId, cb) {

    TrashPoint.beginTransaction({isolationLevel: TrashPoint.Transaction.READ_COMMITTED}, function (err, tx) {

      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      TrashPoint.app.models.TrashPointActivity.findById(id, {include: ['gps']}, {transaction: tx}, function (err, instance) {

        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        if (!instance) {
          return cb({message: 'TrashActivity does not exist', status: 404});
        }

        var current = instance.toJSON();
        AreaAccessControl.check(Constants.METHOD_TRASH_POINT_ACTIVITY_IMAGE_DELETE, TrashPoint.app.models.BaseModel.user, current.gps, TrashPoint.settings.acls).then(function () {

          var p1 = TrashPoint.app.models.TrashPointActivityHasImage.destroyAll({imageId: imageId, trashPointActivityId: id}, {transaction: tx}, function (err) {

            if (err) {
              console.error(err);
              return cb({message: err.detail});
            }

          });

          var p2 = Promise.defer();
          var newChanges = current.changed;
          var images = [];

          if (newChanges && newChanges.changed && newChanges.changed.images) {
            newChanges.changed.images.forEach(function (image) {
              if (Number(image.id) !== Number(imageId)) {
                images.push(image);
              }
            });

            newChanges.changed.images = images;

            p2 = TrashPoint.app.models.TrashPointActivity.updateAll({id: id}, {changed: newChanges}, function (err) {

              if (err) {
                console.error(err);
                return cb({message: err.detail});
              }

            });

          } else {
            p2 = Promise.resolve();
          }

          Promise.all([p1, p2]).then(function () {

            tx.commit(function (err) {

              if (err) {
                console.error(err);
                return cb({message: err.detail});
              }

              cb(null);
            });

          });

        }).catch(function (e) {
          cb({message: e.message, status: 403});
        });
      });
    });

  };

  /**
   * Returns count of TrashPoints that matches given conditions
   *
   * @param {String} area
   * @param {String} geocells
   * @param {String} geoAreaStreet
   * @param {String} geoAreaZip
   * @param {String} geoAreaSubLocality
   * @param {String} geoAreaLocality
   * @param {String} geoAreaAa3
   * @param {String} geoAreaAa2
   * @param {String} geoAreaAa1
   * @param {String} geoAreaCountry
   * @param {String} geoAreaContinent
   * @param {String} spam Boolean GET method fox
   * @param {String} unreviewed Boolean GET method fix
   * @param {String} timeBoundaryFrom
   * @param {String} timeBoundaryTo
   * @param {String} trashStatus
   * @param {String} trashSize
   * @param {String} trashType
   * @param {String} trashAccessibility
   * @param {String} trashNote
   * @param {String} trashIds
   * @param {String} userIds
   * @param {integer} organizationId
   * @param {String} updateNeeded
   * @param {Function} cb
   * @returns {Number}
   */
  TrashPoint.listCount = function (area, geocells, geoAreaStreet, geoAreaZip, geoAreaSubLocality, geoAreaLocality, geoAreaAa3, geoAreaAa2, geoAreaAa1, geoAreaCountry, geoAreaContinent, spam, unreviewed, timeBoundaryFrom, timeBoundaryTo, trashStatus, trashSize, trashType, trashAccessibility, trashNote, trashIds, userIds, organizationId, updateNeeded, cb) {
    var ds = TrashPoint.app.dataSources.trashout;

    var sql = getTrashListCountSQL(area, geocells, geoAreaStreet, geoAreaZip, geoAreaSubLocality, geoAreaLocality, geoAreaAa3, geoAreaAa2, geoAreaAa1, geoAreaCountry, geoAreaContinent, spam, unreviewed, timeBoundaryFrom, timeBoundaryTo, trashStatus, trashSize, trashType, trashAccessibility, trashNote, trashIds, userIds, organizationId, updateNeeded);

    ds.connector.execute(sql, TrashPoint.app.models.BaseModel.sqlParameters, function (err, instance) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      cb(null, Number(instance[0].count));
    });
  };

  /**
   * Returns array of TrashPoints matching given conditions
   *
   * @param {String} area
   * @param {String} geocells
   * @param {String} geoAreaStreet
   * @param {String} geoAreaZip
   * @param {String} geoAreaSubLocality
   * @param {String} geoAreaLocality
   * @param {String} geoAreaAa3
   * @param {String} geoAreaAa2
   * @param {String} geoAreaAa1
   * @param {String} geoAreaCountry
   * @param {String} geoAreaContinent
   * @param {String} spam Boolean GET method fix
   * @param {String} unreviewed Boolean GET method fix
   * @param {String} timeBoundaryFrom
   * @param {String} timeBoundaryTo
   * @param {String} trashStatus
   * @param {String} trashSize
   * @param {String} trashType
   * @param {String} trashAccessibility
   * @param {String} trashNote
   * @param {String} trashIds
   * @param {String} userIds
   * @param {integer} organizationId
   * @param {String} updateNeeded
   * @param {String} attributesNeeded
   * @param {String} orderBy
   * @param {String} userPosition
   * @param {String} page
   * @param {String} limit
   * @param {Function} cb
   * @returns {Array}
   */
  TrashPoint.list = function (area, geocells, geoAreaStreet, geoAreaZip, geoAreaSubLocality, geoAreaLocality, geoAreaAa3, geoAreaAa2, geoAreaAa1, geoAreaCountry, geoAreaContinent, spam, unreviewed, timeBoundaryFrom, timeBoundaryTo, trashStatus, trashSize, trashType, trashAccessibility, trashNote, trashIds, userIds, organizationId, updateNeeded, attributesNeeded, orderBy, userPosition, page, limit, cb) {
    var ds = TrashPoint.app.dataSources.trashout;

    var attributes = [];
    if (attributesNeeded && attributesNeeded.length) {
      attributesNeeded.split(',').forEach(function (attribute) {
        if (Constants.TRASH_ALLOWED_ATTRIBUTES.indexOf(attribute) > -1) {
          attributes.push(attribute);
        }
      });
    }

    if (!attributes.length) {
      return cb({message: 'At least one attribute in attributeNeed parameter must be set', status: 403});
    }

    var sql = getTrashListSQL(attributes, area, geocells, geoAreaStreet, geoAreaZip, geoAreaSubLocality, geoAreaLocality, geoAreaAa3, geoAreaAa2, geoAreaAa1, geoAreaCountry, geoAreaContinent, spam, unreviewed, timeBoundaryFrom, timeBoundaryTo, trashStatus, trashSize, trashType, trashAccessibility, trashNote, trashIds, userIds, organizationId, updateNeeded, orderBy, userPosition, page, limit);

    ds.connector.execute(sql, TrashPoint.app.models.BaseModel.sqlParameters, function (err, instances) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      var result = [];
      instances.forEach(function (instance) {

        var temp = {};

        if (attributes.indexOf(Constants.TRASH_ATTR_ID) > -1) {
          temp.id = Number(instance.id);
          temp.activityId = Number(instance.activity_id);
        }

        if (attributes.indexOf(Constants.TRASH_ATTR_IMAGES) > -1) {
          temp.images = instance.images;
        }

        if (attributes.indexOf(Constants.TRASH_ATTR_GPS_SHORT) > -1 || attributes.indexOf(Constants.TRASH_ATTR_GPS_FULL) > -1) {
          temp.gps = {
            lat: instance.gps_lat,
            long: instance.gps_long,
            accuracy: instance.gps_accuracy,
            source: instance.gps_source,
            area: instance.gps_area ? instance.gps_area[0] : null
          };
        }

        if (attributes.indexOf(Constants.TRASH_ATTR_USER_INFO) > -1) {
          temp.userInfo = {
            id: instance.user_info_id,
            firstName: instance.user_info_first_name,
            lastName: instance.user_info_last_name
          };
        }

        if (attributes.indexOf(Constants.TRASH_ATTR_SIZE) > -1) {
          temp.size = instance.size;
        }

        if (attributes.indexOf(Constants.TRASH_ATTR_TYPES) > -1) {
          temp.types = instance.types;
        }

        if (attributes.indexOf(Constants.TRASH_ATTR_NOTE) > -1) {
          temp.note = instance.note;
        }

        if (attributes.indexOf(Constants.TRASH_ATTR_ANONYMOUS) > -1) {
          temp.anonymous = instance.anonymous;
        }

        if (attributes.indexOf(Constants.TRASH_ATTR_ACCESSIBILITY) > -1) {
          var accessibility = {
            byCar: false,
            inCave: false,
            underWater: false,
            notForGeneralCleanup: false
          };

          instance.accessibility.forEach(function (acc) {
            accessibility[acc] = true;
          });

          temp.accessibility = accessibility;
        }

        if (attributes.indexOf(Constants.TRASH_ATTR_STATUS) > -1) {
          temp.status = instance.status;
        }

        if (attributes.indexOf(Constants.TRASH_ATTR_CLEANED_BY_ME) > -1) {
          temp.cleanedByMe = instance.cleaned_by_me;
        }

        if (attributes.indexOf(Constants.TRASH_ATTR_CREATED) > -1) {
          temp.created = instance.created;
          temp.activityCreated = instance.activity_created;
        }

        if (attributes.indexOf(Constants.TRASH_ATTR_UPDATE_TIME) > -1) {
          temp.updateTime = instance.update_time;
        }

        if (attributes.indexOf(Constants.TRASH_ATTR_UPDATE_NEEDED) > -1) {
          temp.updateNeeded = instance.update_needed;
        }

        if (attributes.indexOf(Constants.TRASH_ATTR_UPDATE_HISTORY) > -1) {
          var history = [];
          if (instance.update_history) {
            instance.update_history.forEach(function (h) {
              if (!h.data) {
                return;
              }

              history.push({
                changed: h.data.changed,
                userInfo: h.userInfo,
                activityId: h.activityId.activityId,
                updateTime: h.created
              });
            });
          }

          temp.updateHistory = history;
        }

        if (attributes.indexOf(Constants.TRASH_ATTR_SPAM) > -1) {
          temp.spam = instance.spam;
        }

        if (attributes.indexOf(Constants.TRASH_ATTR_UNREVIEWED) > -1) {
          temp.unreviewed = instance.unreviewed;
        }

        if (attributes.indexOf(Constants.TRASH_ATTR_URL) > -1) {
          temp.url = 'https://admin.trashout.ngo/trash-management/detail/' + Number(instance.id);
        }

        result.push(temp);
      });

      cb(null, result);
    });
  };

  /**
   * Returns geocells with TrashPoints that belongs into it.
   * Marker is set in the average value of all TrashPoint GPS coordinates.
   *
   * If TrashPoint has connection to Area (country), then it is clustered
   * by the country.
   *
   * @param {String} zoomLevel
   * @param {String} geocells
   * @param {String} spam Boolean GET method fix
   * @param {String} unreviewed Boolean GET method fix
   * @param {String} timeBoundaryFrom
   * @param {String} timeBoundaryTo
   * @param {String} trashStatus
   * @param {String} trashSize
   * @param {String} trashType
   * @param {String} trashAccessibility
   * @param {String} trashNote
   * @param {String} trashIds
   * @param {String} userIds
   * @param {Function} cb
   * @returns {Array}
   */
  TrashPoint.zoomPoints = function (zoomLevel, geocells, spam, unreviewed, timeBoundaryFrom, timeBoundaryTo, trashStatus, trashSize, trashType, trashAccessibility, trashNote, trashIds, userIds, updateNeeded, cb) {
    var ds = TrashPoint.app.dataSources.trashout;

    var geocellLength = 1;
    switch (zoomLevel) {
    case 4:
      geocellLength = 2;
      break;
    case 5:
    case 6:
      geocellLength = 3;
      break;
    case 7:
    case 8:
      geocellLength = 4;
      break;
    case 9:
    case 10:
      geocellLength = 4;
      break;
    }

    geocells = '^(' + geocells.split(',').map(function (geocell) {
      return geocell.substring(0, geocellLength - 1);
    }).join('|') + ')';

    var sql = '';

    sql += 'SELECT \n';
    sql += '  SUM(b.lat) / COUNT(b.lat) AS lat, \n';
    sql += '  SUM(b.long) / COUNT(b.long) AS long, \n';
    sql += '  SUM(b.still_here) AS still_here, \n';
    sql += '  SUM(b.more) AS more, \n';
    sql += '  SUM(b.less) AS less, \n';
    sql += '  SUM(b.cleaned) AS cleaned, \n';
    sql += '  SUM(b.update_needed) AS update_needed, \n';
    sql += '  b.geocells, \n';
    sql += '  string_agg(DISTINCT(b.country_name), \', \') AS countries \n';
    sql += 'FROM ( \n';

    sql += '  SELECT \n';
    sql += '    COALESCE (SUM(a.center_lat) / SUM(a.country_center_count), SUM(a.lat) / COUNT(a.lat)) AS lat, \n';
    sql += '    COALESCE (SUM(a.center_long) / SUM(a.country_center_count), SUM(a.long) / COUNT(a.long)) AS long, \n';
    sql += '    SUM(a.still_here) AS still_here, \n';
    sql += '    SUM(a.more) AS more, \n';
    sql += '    SUM(a.less) AS less, \n';
    sql += '    SUM(a.cleaned) AS cleaned, \n';
    sql += '    SUM(a.update_needed) AS update_needed, \n';
    sql += '    string_agg(DISTINCT(a.gc), \',\') AS geocells, \n';
    sql += '    a.country_id, \n';
    sql += '    a.country_name \n';
    sql += '  FROM ( \n';

    sql += '    SELECT \n';
    sql += '      COALESCE(a.id, -(row_number() OVER ())) AS country_id, \n';
    sql += '      a.country AS country_name, \n';
    sql += '      a.center_lat, \n';
    sql += '      a.center_long, \n';
    sql += '      CASE WHEN (a.center_lat IS NOT NULL AND a.center_long IS NOT NULL) THEN 1 ELSE 0 END AS country_center_count, \n';
    sql += '      gps.lat, \n';
    sql += '      gps.long, \n';
    sql += '      CASE WHEN tpa.status = \'stillHere\' THEN 1 ELSE 0 END AS still_here, \n';
    sql += '      CASE WHEN tpa.status = \'more\' THEN 1 ELSE 0 END AS more, \n';
    sql += '      CASE WHEN tpa.status = \'less\' THEN 1 ELSE 0 END AS less, \n';
    sql += '      CASE WHEN tpa.status = \'cleaned\' THEN 1 ELSE 0 END AS cleaned, \n';
    sql += '      CASE WHEN (NOW() - tpa.created) > INTERVAL \'' + Constants.TRASH_UPDATE_NEEDED_DAYS + ' days\' AND status <> \'cleaned\' THEN 1 ELSE 0 END AS update_needed, \n';
    sql += '      substring(geocell, 1, ' + sanitize(geocellLength) + ') AS gc \n';
    sql += '    FROM public.trash_point_activity tpa \n';
    sql += '    JOIN public.trash_point tp ON tp.id = tpa.trash_point_id \n';
    sql += '    JOIN public.gps ON gps.id = tpa.gps_id \n';
    sql += '    LEFT JOIN public.area a ON (a.id = gps.country_id AND a.type = \'country\' AND a.zoom_level = ' + sanitize((zoomLevel || 3)) + ' AND a.alias_id IS NULL) \n';
    sql += '    WHERE tpa.last_id IS NULL AND gps.geocell ~ ' + sanitize(geocells) + ' \n';

    switch (spam) {
    case 'true':
    case '1':
      sql += '      AND tpa.trash_point_id IN (SELECT DISTINCT(tpa2.trash_point_id) FROM public.spam s JOIN public.trash_point_activity tpa2 ON (tpa2.id = s.trash_point_activity_id AND tpa2.trash_point_id = tpa.trash_point_id)) \n';
      break;
    case 'false':
    case '0':
      // There must be at least one record in table spam
      sql += '      AND tpa.trash_point_id NOT IN (SELECT DISTINCT(tpa2.trash_point_id) FROM public.spam s JOIN public.trash_point_activity tpa2 ON (tpa2.id = s.trash_point_activity_id AND tpa2.trash_point_id = tpa.trash_point_id)) \n';
      break;
    }

    switch (unreviewed) {
    case 'true':
    case '1':
      sql += '      AND tp.reviewed IS NULL \n';
      break;
    case 'false':
    case '0':
      sql += '      AND tp.reviewed IS NOT NULL \n';
      break;
    }

    if (timeBoundaryFrom) {
      sql += ' AND tp.id IN (SELECT tpatbf.trash_point_id FROM public.trash_point_activity tpatbf WHERE tpatbf.created >= ' + sanitize(timeBoundaryFrom) + ') \n';
    }

    if (timeBoundaryTo) {
      sql += ' AND tp.id IN (SELECT tpatbt.trash_point_id FROM public.trash_point_activity tpatbt WHERE tpatbt.created <= ' + sanitize(timeBoundaryTo) + ') \n';
    }

    if (trashStatus) {
      sql += '      AND tpa.status IN (' + sanitize(trashStatus.split(',')) + ') \n';
    }

    if (trashSize) {
      sql += '      AND tpa.trash_point_size_id IN (SELECT tps.id FROM public.trash_point_size tps WHERE tps.name IN(' + sanitize(trashSize.split(',')) + ')) \n';
    }

    if (trashType) {
      sql += '      AND tpa.id IN (SELECT tpahtpt.trash_point_activity_id FROM public.trash_point_activity_has_trash_point_type tpahtpt JOIN public.trash_point_type tpt ON (tpahtpt.trash_point_type_id = tpt.id) WHERE tpt.name IN (' + sanitize(trashType.split(',')) + ')) \n';
    }

    if (trashAccessibility) {
      var positive = [];
      var negative = [];
      trashAccessibility.split(',').map(function (str) {
        if (str.substr(0, 1) === '-') {
          negative.push(str.substr(1));
        } else {
          positive.push(str);
        }
      });

      if (positive.length) {
        sql += '      AND tpa.id IN (SELECT tpahac.trash_point_activity_id FROM public.trash_point_activity_has_accessibility_type tpahac JOIN public.accessibility_type ac ON (tpahac.accessibility_type_id = ac.id) WHERE ac.name IN (' + sanitize(positive) + ')) \n';
      }

      // There must be at least one record for every accessibility type in table trash_point_activity_has_accessibility_type
      if (negative.length) {
        sql += '      AND tpa.id NOT IN (SELECT tpahac.trash_point_activity_id FROM public.trash_point_activity_has_accessibility_type tpahac JOIN public.accessibility_type ac ON (tpahac.accessibility_type_id = ac.id) WHERE ac.name IN (' + sanitize(negative) + ')) \n';
      }
    }

    if (trashNote) {
      sql += '      AND tpa.note ILIKE ' + sanitize('%' + trashNote + '%') + ' \n';
    }

    if (trashIds) {
      sql += '      AND tpa.trash_point_id IN (' + sanitize(trashIds.split(',').map(Number).filter(Boolean)) + ') \n';
    }

    if (userIds) {
      sql += '      AND tpa.trash_point_id IN (SELECT DISTINCT(tpa3.trash_point_id) FROM public.trash_point_activity tpa3 WHERE tpa3.user_id IN (' + sanitize(userIds.split(',').map(Number).filter(Boolean)) + ')) \n';
    }

    switch (updateNeeded) {
    case 'true':
    case '1':
      sql += '  AND ( (NOW() - tpa.created) > INTERVAL \'' + Constants.TRASH_UPDATE_NEEDED_DAYS + ' days\' AND status <> \'cleaned\' ) \n';
      break;
    case 'false':
    case '0':
      sql += '  AND ( (NOW() - tpa.created) < INTERVAL \'' + Constants.TRASH_UPDATE_NEEDED_DAYS + ' days\' OR status = \'cleaned\' ) \n';
      break;
    }

    sql += '  ) AS a GROUP BY country_id, country_name \n';

    // Let the countries with most geocells be at the end of the list
    sql += ') AS b GROUP BY geocells ORDER BY length(geocells) \n';

    ds.connector.execute(sql, TrashPoint.app.models.BaseModel.sqlParameters, function (err, instances) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      var result = [];
      var usedGeocells = [];
      instances.forEach(function (instance) {

        var selectedGeocell = '';
        if (instance.countries) {

          var countryGeocells = instance.geocells.split(',');
          // Find first unused geocell that is present in given country
          var stop = false;
          for (var i = 0; i < countryGeocells.length; i++) {
            for (var j = 0; j < 10; j++) {
              if (usedGeocells.indexOf(countryGeocells[i] + j) === -1) {
                selectedGeocell = countryGeocells[i] + j;
                usedGeocells.push(selectedGeocell);
                stop = true;
              }

              if (stop) {
                break;
              }
            }

            if (stop) {
              break;
            }
          }

        } else {
          selectedGeocell = instance.geocells + '0';
          usedGeocells.push(selectedGeocell);
        }

        result.push({
          geocell: selectedGeocell,
          lat: Number(instance.lat),
          long: Number(instance.long),
          countries: instance.countries || null,
          counts: {
            stillHere: Number(instance.still_here),
            more: Number(instance.more),
            less: Number(instance.less),
            cleaned: Number(instance.cleaned),
            updateNeeded: Number(instance.update_needed)
          }
        });

      });

      cb(null, result);
    });
  };

  /**
   * Creates TrashPoint (or updates existing if needed - check comments inside the method)
   *
   * @param {Array} images
   * @param {Object} gps
   * @param {String} size
   * @param {Array} types
   * @param {String} note
   * @param {Boolean} anonymous
   * @param {integer} organizationId
   * @param {Object} accessibility
   * @param {Function} cb
   * @returns {Object}
   */
  TrashPoint.reportTrash = function (images, gps, size, types, note, anonymous, organizationId, accessibility, cb) {

    var check = checkParameters('insert', images, gps, size, types, null, note, anonymous, organizationId, accessibility);

    check.then(function (response) {

      GeoLocation.getNearestTrashPoints(gps.lat, gps.long, Constants.TRASH_MIN_DISTANCE).then(function (nearestTrashPointIds) {

        // If new trash is closer than minimum distance from the other one, then join this trash to existing one as its activity
        // and set status "It's even worse" (Constants.TRASH_STATUS_MORE - "more")
        if (nearestTrashPointIds.length) {

          response.status = Constants.TRASH_STATUS_MORE;
          response.cleanedByMe = false;

          performUpdate(nearestTrashPointIds[0], response).then(function (response) {
            return cb(null, response.id, response.activityId, response.statusCode);

          }).catch(function (error) {
            console.error(error);
            return cb(error);
          });

        } else {
          TrashPoint.beginTransaction({isolationLevel: TrashPoint.Transaction.READ_COMMITTED}, function (err, tx) {

            if (err) {
              console.error(err);
              return cb({message: err.detail});
            }

            GeoLocation.upsertGps(response.lat, response.long, response.accuracy, response.gpsSourceId).then(function (gpsId) {

              TrashPoint.create({userId: TrashPoint.app.models.BaseModel.user.id, organizationId: organizationId}, {transaction: tx}, function (err, responseTrashPoint) {

                if (err) {
                  console.error(err);
                  return cb({message: err.detail});
                }

                var data = {
                  status: Constants.TRASH_STATUS_STILL_HERE,
                  gpsId: gpsId,
                  trashPointId: responseTrashPoint.id,
                  userId: TrashPoint.app.models.BaseModel.user.id,
                  organizationId: organizationId,
                  trashPointSizeId: response.trashPointSizeId,
                  note: response.note,
                  anonymous: anonymous,
                  isFirst: true
                };

                TrashPoint.app.models.TrashPointActivity.create(data, {transaction: tx}, function (err, responseTrashPointActivity) {

                  if (err) {
                    console.error(err);
                    return cb({message: err.detail});
                  }

                  var p1, p2, p3, p4 = Promise.defer();

                  var accessibilities = [];
                  response.accessibilityTypeIds.forEach(function (accessibilityTypeId) {
                    accessibilities.push({accessibilityTypeId: accessibilityTypeId, trashPointActivityId: responseTrashPointActivity.id});
                  });

                  p1 = TrashPoint.app.models.TrashPointActivityHasAccessibilityType.create(accessibilities, {transaction: tx}, function (err) {

                    if (err) {
                      console.error(err);
                      return cb({message: err.detail});
                    }

                  });

                  var tpTypes = [];
                  response.trashPointTypeIds.forEach(function (trashPointTypeId) {
                    tpTypes.push({trashPointTypeId: trashPointTypeId, trashPointActivityId: responseTrashPointActivity.id});
                  });

                  p2 = TrashPoint.app.models.TrashPointActivityHasTrashPointType.create(tpTypes, {transaction: tx}, function (err) {

                    if (err) {
                      console.error(err);
                      return cb({message: err.detail});
                    }

                  });

                  p3 = TrashPoint.app.models.Image.create(response.images, {transaction: tx}, function (err, responseImage) {

                    if (err) {
                      console.error(err);
                      return cb({message: err.detail});
                    }

                    var trashImages = [];
                    responseImage.forEach(function (image) {
                      trashImages.push({imageId: image.id, trashPointActivityId: responseTrashPointActivity.id});
                    });

                    p4 = TrashPoint.app.models.TrashPointActivityHasImage.create(trashImages, {transaction: tx}, function (err) {

                      if (err) {
                        console.error(err);
                        return cb({message: err.detail});
                      }

                    });
                  });

                  Promise.all([p1, p2, p3, p4]).then(function () {

              tx.commit(function (err) {

                if (err) {
                  console.error(err);
                  return cb({message: err.detail});
                }

                      // refresh user points
                      if(responseTrashPoint.userId) {
                        TrashPoint.app.models.User.refreshPoints(responseTrashPoint.userId);
                      }

                      cb(null, responseTrashPoint.id, responseTrashPointActivity.id, 200);
              });

                  }).catch(function (error) {
                    console.error(err);
                    return cb(error);
                  });

                });

              });

            }).catch(function (error) {
              console.error(error);
              return cb(error);
            });

          });
        }

      }).catch(function (error) {
        console.error(error);
        return cb(error);
      });

    }).catch(function (error) {
      console.error(error);
      return cb(error);
    });

  };

  /**
   * Updates TrashPoint
   *
   * @param {Number} id
   * @param {Array} images
   * @param {Object} gps
   * @param {String} size
   * @param {Array} types
   * @param {String} status
   * @param {String} note
   * @param {Boolean} anonymous
   * @param {Number} organizationId
   * @param {Object} accessibility
   * @param {Boolean} cleanedByMe
   * @param {Function} cb
   * @returns {Object}
   */
  TrashPoint.updateTrash = function (id, images, gps, size, types, status, note, anonymous, organizationId, accessibility, cleanedByMe, cb) {

    checkParameters('update', images, gps, size, types, status, note, anonymous, organizationId, accessibility, cleanedByMe).then(function (response) {

      performUpdate(id, response).then(function (response) {

        messageManager.sendRecentActivity(Constants.ACTIVITY_TYPE_TRASH_POINT, id, TrashPoint.app.models.BaseModel.user.id).catch(function (err) {
          console.error(err);
        });

        // async sending emails about activity
        TrashPoint.sendActivityEmail(id);

        cb(null, response.id, response.activityId, response.statusCode);

      }).catch(function (error) {
        console.error(error);
        return cb(error);
      });

    }).catch(function (error) {
      return cb(error);
    });
  };

  /**
   * Approve all trashes by user id
   *
   * @param {Number} userId
   */
  TrashPoint.approveAllUsersTrashes = function(userId) {
    TrashPoint.find({userId: userId}, function(err, instances) {
      if (err) {
        console.error(err);
      }

      instances.forEach(function(trash) {
        if(!trash.reviewed) {
          TrashPoint.updateAll({id: trash.id}, {reviewed: (new Date()).toUTCString()});
        }
      });
    });
  };

  TrashPoint.notificationTest = function (message, cb) {
    if (message.android && message.android.data && message.android.data.trash_id) {
      message.android.data.trash_id = message.android.data.trash_id.toString();
    }

    messageManager.sendRaw(message).then(function (response) {
      cb(null, response);
    }).catch(function (error) {
      cb(error);
    });
  };

  /**
   * Ugly hack for fix 3-level data (comment.user.image + comment.organization.image)
   * TODO: solve root case and refactor this
   *
   * @param data
   * @param callback
   */
  function fixCommentImages (data, callback) {
    var promises = [];

    data.forEach(function(comment) {
      var commentData = comment.toJSON();

      // user
      if (commentData.user && commentData.user.imageId) {
        promises.push(TrashPoint.app.models.Image.findById(commentData.user.imageId));
      }

      // organization
      if (commentData.organization && commentData.organization.imageId) {
        promises.push(TrashPoint.app.models.Image.findById(commentData.organization.imageId));
      }
    });

    Promise.all(promises).then(function (images) {
      images.forEach(function (image) {
        data.forEach(function(comment) {
          var commentData = comment.toJSON();

          if (commentData.user && image.id == commentData.user.imageId) {
            comment.user_image = image;
            return;
          }

          if (commentData.organization && image.id == commentData.organization.imageId) {
            comment.organization_image = image;
            return;
          }
        });
      });

      callback();
    });
  }

  /**
   * Get list of comment by Trash point ID (sorted from newest to oldest)
   *
   * @param {integer} id
   * @param {Function} cb
   * @returns {Array}
   */
  TrashPoint.getComments = function (id, cb) {
    var filter = {
      where: {
        trashPointId: id
      },
      include: [
        'user',
        'organization',
        // temp replaced by fixCommentImages()
        // {
        //   user: 'image'
        // },
        // {
        //   organization: 'image'
        // },
      ],
      order: 'created DESC'
    };

    TrashPoint.app.models.Comment.find(filter, function (err, data) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      data.forEach(function(comment) {
        comment.canIDelete = canIDeleteComment(comment);
      });

      fixCommentImages(data, function () {
        cb(null, data);
      });
    });
  };

  /**
   * Get one specific comment by Trash point ID and Comment ID
   *
   * @param {integer} id
   * @param {integer} idComment
   * @param {Function} cb
   * @returns {Array}
   */
  TrashPoint.getComment = function (id, idComment, cb) {
    var filter = {
      where: {
        trashPointId: id,
        id: idComment
      },
      include: [
        'user',
        {
          user: 'image'
        },
        'organization',
        {
          organization: 'image'
        },
      ]
    };

    TrashPoint.app.models.Comment.findOne(filter, function (err, data) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      if (!data) {
        return cb({message: 'Comment does not exist', status: 404});
      }

      data.canIDelete = canIDeleteComment(data);

      cb(null, data);
    });
  };

  /**
   * Check if is the user manager of organization defined by Organization ID
   *
   * @param {integer} userId
   * @param {integer} organizationId
   * @returns {Promise}
   */
  function isUserManagerOfOrganization (userId, organizationId) {
    return new Promise(function (resolve, reject) {
      if (!organizationId) {
        return resolve(true);
      }

      var filter = {
        where: {
          userId: userId,
          organizationId: organizationId,
          organizationRoleId: 1
        }
      };

      TrashPoint.app.models.UserHasOrganization.findOne(filter, function (err, data) {
        if (err) {
          return reject(err);
        }

        if (data) {
          return resolve(true);
        } else {
          return resolve(false);
        }
      });
    });
  }

  /**
   * Add comment to Trash point
   *
   * @param {integer} id
   * @param {integer} organizationId
   * @param {string} body
   * @param {Function} cb
   * @returns {Array}
   */
  TrashPoint.addComment = function (id, organizationId, body, cb) {
    var userId = TrashPoint.app.models.BaseModel.user.id;

    // check if user is allowed to publish as this organization
    isUserManagerOfOrganization(userId, organizationId).then(function (ok) {
      if (!ok) {
        return cb({message: 'You are not allowed to publish comment as this organization.', status: 403});
      }

      var inputData = {
        trashPointId: id,
        userId: organizationId ? null: userId,
        organizationId: organizationId,
        body: body
      };

      TrashPoint.app.models.Comment.create(inputData, function (err, data) {
        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        // async sending emails about activity
        TrashPoint.sendActivityEmail(id);

        cb(null, data);
      });
    }).catch(function (err) {
      console.error(err);
      return cb(err);
    });
  };

  /**
   * Can I (logged user) delete the comment?
   *
   * @param {object} comment
   * @returns {boolean}
   */
  function canIDeleteComment (comment) {
    var user = TrashPoint.app.models.BaseModel.user;

    // get list of organizations where is the user manager
    var manageOrganizations = user.userHasOrganization.filter(function (org) {
      return org.organizationRoleId == 1; // filter only manager role
    }).map(function (org) {
      return parseInt(org.organizationId); // return only organization id (in integer format)
    });

    // check permissions
    if ( user.userRoleId != 1 // user is not admin
      && user.userRoleId != 4 // and user is not superAdmin
      && user.id != comment.userId // and user is not author
      && manageOrganizations.indexOf(comment.organizationId) === -1 // and user is manager of author organization
    ) {
      return false;
    } else {
      return true;
    }
  }

  /**
   * Delete comment of Trash point
   *
   * @param {integer} id
   * @param {integer} idComment
   * @param {Function} cb
   */
  TrashPoint.deleteComment = function (id, idComment, cb) {
    var filter = {
      where: {
        trashPointId: id,
        id: idComment
      }
    };

    // find comment by Trash point ID and Comment ID
    TrashPoint.app.models.Comment.findOne(filter, function (err, data) {
      if (err) {
        console.error(err);
        return cb({ message: err.detail });
      }

      if (!data) {
        return cb({ message: 'Comment not found.', status: 404 });
      }

      // check permissions
      if (!canIDeleteComment(data)) {
        return cb({ message: 'You are not allowed to remove this comment.', status: 403 });
      }

      TrashPoint.app.models.Comment.deleteById(idComment, function (err) {
        if (err) {
          console.error(err);
          return cb({ message: err.detail });
        }

        cb({ status: 204 });
      });
    });
  };

  /**
   *
   * @param {integer} trashPointId
   */
  TrashPoint.sendActivityEmail = function (trashPointId) {
    TrashPoint.getUsersForNotify(trashPointId).then(function (users) {
      users.forEach(function (user) {
        var headers = {
          to: user.email,
          subject: emailTranslations[checkLanguage(user.language)]['mail.activity.subject']
        };

        var params = {
          user: user,
          trashPointId: trashPointId,
        };

        TrashPoint.app.models.BaseModel.sendEmail('activity', headers, params, user.language);
      });
    });
  };

  /**
   *
   * @param {integer} trashPointId
   * @returns {Promise}
   */
  TrashPoint.getUsersForNotify = function (trashPointId) {
    trashPointId = parseInt(trashPointId);

    // get author of trash point
    var sql = 'SELECT user_id FROM trash_point WHERE id = ' + trashPointId;
    // get authors of activities (updates)
    sql += ' UNION SELECT user_id FROM trash_point_activity WHERE trash_point_id = ' + trashPointId;
    // get authors of comments
    sql += ' UNION SELECT user_id FROM comment WHERE user_id IS NOT NULL AND trash_point_id = ' + trashPointId;
    // get managers of commented organizations
    var sqlOrg = 'SELECT organization_id FROM comment WHERE organization_id IS NOT NULL AND trash_point_id = ' + trashPointId;
    sql += ' UNION SELECT user_id FROM user_has_organization WHERE organization_role_id = 1 AND organization_id IN (' + sqlOrg + ')';

    var ds = TrashPoint.app.dataSources.trashout;

    return new Promise(function (resolve, reject) {
      ds.connector.execute(sql, function (err, result) {
        if (err) {
          return reject(err);
        }

        var userIds = result.map(function (item) {
          return parseInt(item.user_id);
        });

        // skip this user
        var removeIndex = userIds.indexOf(TrashPoint.app.models.BaseModel.user.id);
        if (removeIndex !== -1) {
          userIds.splice(removeIndex, 1); // remove item from array
        }

        TrashPoint.app.models.User.find({
          where: {
            id: {inq: userIds},
            email: {neq: null},
            trashActivityEmailNotification: true,
          }
        }, function(err, users) {
          if (err) {
            return reject(err);
          }

          resolve(users);
        });
      });
    });
  };

  TrashPoint.disableRemoteMethod('create', true); // Removes (POST) /trash
  TrashPoint.disableRemoteMethod('upsert', true); // Removes (PUT) /trash/:id
  TrashPoint.disableRemoteMethod('find', true); // Removes (GET) /trash
  TrashPoint.disableRemoteMethod('count', true); // Removes (GET) /trash/count
  TrashPoint.disableRemoteMethod('deleteById', true); // Removes (DELETE) /trash/:id

  TrashPoint.remoteMethod(
    'updateTrash',
    {
      http: {path: '/:id/', verb: 'put'},
      accepts: [
        {arg: 'id', type: 'number', required: true},
        {arg: 'images', type: 'array', description: 'Array of images', required: true},
        {arg: 'gps', type: 'object', required: true},
        {arg: 'size', type: 'string', required: true},
        {arg: 'types', type: 'object'},
        {arg: 'status', type: 'string', required: true},
        {arg: 'note', type: 'string'},
        {arg: 'anonymous', type: 'string'},
        {arg: 'organizationId', type: 'number'},
        {arg: 'accessibility', type: 'object'},
        {arg: 'cleanedByMe', type: 'boolean'}
      ],
      returns: [
        {arg: 'id', type: 'number'},
        {arg: 'activityId', type: 'number'},
        {arg: 'statusCode', type: 'number'}
      ]

    }
  );

  TrashPoint.remoteMethod(
    'reportTrash',
    {
      http: {path: '/', verb: 'post'},
      accepts: [
        {arg: 'images', type: 'array', description: 'Array of images', required: true},
        {arg: 'gps', type: 'object', required: true},
        {arg: 'size', type: 'string', required: true},
        {arg: 'types', type: 'object'},
        {arg: 'note', type: 'string'},
        {arg: 'anonymous', type: 'boolean'},
        {arg: 'organizationId', type: 'number'},
        {arg: 'accessibility', type: 'object'}
      ],
      returns: [
        {arg: 'id', type: 'number'},
        {arg: 'activityId', type: 'number'},
        {arg: 'statusCode', type: 'number'}
      ]

    }
  );

  TrashPoint.remoteMethod(
    'getTrash',
    {
      http: {path: '/:id/', verb: 'get'},
      accepts: {arg: 'id', type: 'number', required: true},
      returns: {type: 'object', root: true}

    }
  );

  TrashPoint.remoteMethod(
    'deleteTrash',
    {
      http: {path: '/:id/', verb: 'delete'},
      accepts: {arg: 'id', type: 'number', required: true}
    }
  );

  TrashPoint.remoteMethod(
    'deleteActivity',
    {
      http: {path: '/activity/:id/', verb: 'delete'},
      accepts: {arg: 'id', type: 'number', required: true}

    }
  );

  TrashPoint.remoteMethod(
    'deleteActivityImage',
    {
      http: {path: '/activity/:id/images/:imageId', verb: 'delete'},
      accepts: [
        {arg: 'id', type: 'number', required: true},
        {arg: 'imageId', type: 'string'}
      ]
    }
  );

  TrashPoint.remoteMethod(
    'list',
    {
      http: {path: '/', verb: 'get'},
      accepts: [
        {arg: 'area', type: 'string', description: 'Comma separated latitude and longitude of top left corner and bottom right corner. Example: 54.123456,53.123456,56.123456,34.123456'},
        {arg: 'geocells', type: 'string', description: 'Comma separated geocells'},
        {arg: 'geoAreaStreet', type: 'string', description: 'Street'},
        {arg: 'geoAreaZip', type: 'string', description: 'Zip'},
        {arg: 'geoAreaSubLocality', type: 'string', description: 'Sub locality'},
        {arg: 'geoAreaLocality', type: 'string', description: 'Locality'},
        {arg: 'geoAreaAa3', type: 'string', description: 'Administrative Area 3'},
        {arg: 'geoAreaAa2', type: 'string', description: 'Administrative Area 2'},
        {arg: 'geoAreaAa1', type: 'string', description: 'Administrative Area 1'},
        {arg: 'geoAreaCountry', type: 'string', description: 'Country'},
        {arg: 'geoAreaContinent', type: 'string', description: 'Continent'},
        {arg: 'spam', type: 'string', description: 'Whether trash is marked as spam'},
        {arg: 'unreviewed', type: 'string', description: 'Whether trash is marked as unreviewed'},
        {arg: 'timeBoundaryFrom', type: 'string', description: 'Timestamp format "2016-04-12T07:38:33+00:00"'},
        {arg: 'timeBoundaryTo', type: 'string', description: 'Timestamp format "2016-04-12T07:38:33+00:00"'},
        {arg: 'trashStatus', type: 'string', description: 'Comma separated states - stillHere, less, more, cleaned'},
        {arg: 'trashSize', type: 'string', description: 'Comma separated sizes - car, bag, wheelbarrow'},
        {arg: 'trashType', type: 'string', description: 'Comma separated types - plastic, domestic, automotive, liquid, dangerous, metal, electronic, deadAnimals, organic, construction'},
        {arg: 'trashAccessibility', type: 'string', description: 'Comma separated accesibility types with prefix "-" for negative filter (e.g. trashAccessibility=byCar,-inCave) - byCar, inCave, underWater, notForGeneralCleanup'},
        {arg: 'trashNote', type: 'string', description: 'Text'},
        {arg: 'trashIds', type: 'string', description: 'Comma separated trash identifiers'},
        {arg: 'userIds', type: 'string', description: 'Comma separated user identifiers (users who created report or made actualization)'},
        {arg: 'organizationId', type: 'integer', description: 'Organization ID'},
        {arg: 'updateNeeded', type: 'string'},
        {arg: 'attributesNeeded', type: 'string', description: 'Comma separated attributes which will be contained in the result. Attributes are "id", "gps", "types", "size", "note", "status", "images", "updateTime", "updateHistory"'},
        {arg: 'orderBy', type: 'string', description: 'Order by'},
        {arg: 'userPosition', type: 'string', description: 'Current GPS position'},
        {arg: 'page', type: 'number', description: 'Page'},
        {arg: 'limit', type: 'number', description: 'Limit'}
      ],
      returns: {type: 'array', root: true}
    }
  );

  TrashPoint.remoteMethod(
    'listCount',
    {
      http: {path: '/count/', verb: 'get'},
      accepts: [
        {arg: 'area', type: 'string', description: 'Comma separated latitude and longitude of top left corner and bottom right corner. Example: 54.123456,53.123456,56.123456,34.123456'},
        {arg: 'geocells', type: 'string', description: 'Comma separated geocells'},
        {arg: 'geoAreaStreet', type: 'string', description: 'Street'},
        {arg: 'geoAreaZip', type: 'string', description: 'Zip'},
        {arg: 'geoAreaSubLocality', type: 'string', description: 'Sub locality'},
        {arg: 'geoAreaLocality', type: 'string', description: 'Locality'},
        {arg: 'geoAreaAa3', type: 'string', description: 'Administrative Area 3'},
        {arg: 'geoAreaAa2', type: 'string', description: 'Administrative Area 2'},
        {arg: 'geoAreaAa1', type: 'string', description: 'Administrative Area 1'},
        {arg: 'geoAreaCountry', type: 'string', description: 'Country'},
        {arg: 'geoAreaContinent', type: 'string', description: 'Continent'},
        {arg: 'spam', type: 'string', description: 'Whether trash is marked as spam'},
        {arg: 'unreviewed', type: 'string', description: 'Whether trash is marked as unreviewed'},
        {arg: 'timeBoundaryFrom', type: 'string', description: 'Timestamp format "2016-04-12T07:38:33+00:00"'},
        {arg: 'timeBoundaryTo', type: 'string', description: 'Timestamp format "2016-04-12T07:38:33+00:00"'},
        {arg: 'trashStatus', type: 'string', description: 'Comma separated states - stillHere, less, more, cleaned'},
        {arg: 'trashSize', type: 'string', description: 'Comma separated sizes - car, bag, wheelbarrow'},
        {arg: 'trashType', type: 'string', description: 'Comma separated types - plastic, domestic, automotive, liquid, dangerous, metal, electronic, deadAnimals, organic, construction'},
        {arg: 'trashAccessibility', type: 'string', description: 'Comma separated accesibility types with prefix "-" for negative filter (e.g. trashAccessibility=byCar,-inCave) - byCar, inCave, underWater, notForGeneralCleanup'},
        {arg: 'trashNote', type: 'string', description: 'Text'},
        {arg: 'trashIds', type: 'string', description: 'Comma separated trash identifiers'},
        {arg: 'userIds', type: 'string', description: 'Comma separated user identifiers (users who created report or made actualization)'},
        {arg: 'organizationId', type: 'integer', description: 'Organization ID'},
        {arg: 'updateNeeded', type: 'string'}
      ],
      returns: {arg: 'count', type: 'number'}
    }
  );

  TrashPoint.remoteMethod(
    'zoomPoints',
    {
      http: {path: '/zoom-point/', verb: 'get'},
      accepts: [
        {arg: 'zoomLevel', type: 'number', description: 'Zoom level'},
        {arg: 'geocells', type: 'string', description: 'Comma separated geocells'},
        {arg: 'spam', type: 'string', description: 'Whether trash is marked as spam'},
        {arg: 'unreviewed', type: 'string', description: 'Whether trash is marked as unreviewed'},
        {arg: 'timeBoundaryFrom', type: 'string', description: 'Timestamp format "2016-04-12T07:38:33+00:00"'},
        {arg: 'timeBoundaryTo', type: 'string', description: 'Timestamp format "2016-04-12T07:38:33+00:00"'},
        {arg: 'trashStatus', type: 'string', description: 'Comma separated states - stillHere, less, more, cleaned'},
        {arg: 'trashSize', type: 'string', description: 'Comma separated sizes - car, bag, wheelbarrow'},
        {arg: 'trashType', type: 'string', description: 'Comma separated types - plastic, domestic, automotive, liquid, dangerous, metal, electronic, deadAnimals, organic, construction'},
        {arg: 'trashAccessibility', type: 'string', description: 'Comma separated accesibility types with prefix "-" for negative filter (e.g. trashAccessibility=byCar,-inCave) - byCar, inCave, underWater, notForGeneralCleanup'},
        {arg: 'trashNote', type: 'string', description: 'Text'},
        {arg: 'trashIds', type: 'string', description: 'Comma separated trash identifiers'},
        {arg: 'userIds', type: 'string', description: 'Comma separated user identifiers (users who created report or made actualization)'},
        {arg: 'updateNeeded', type: 'string', description: 'Update needed'}
      ],
      returns: {type: 'object', root: true}
    }
  );

  TrashPoint.remoteMethod(
    'notificationTest',
    {
      http: {path: '/notificationTest/', verb: 'post'},
      accepts: [
        {arg: 'message', type: 'object', required: true}
      ],
      returns: {type: 'object', root: true}
    }
  );

  /**
   * Enable remote invocation for getComments
   */
  TrashPoint.remoteMethod(
    'getComments',
    {
      description: 'Get all comments of this TrashPoint',
      http: {path: '/:id/comment', verb: 'get'},
      accepts: [
        {arg: 'id', type: 'integer', required: true, description: 'TrashPoint ID'}
      ],
      returns: {type: 'object', root: true}
    }
  );

  /**
   * Enable remote invocation for getComment
   */
  TrashPoint.remoteMethod(
    'getComment',
    {
      description: 'Get detail of TrashPoint comment',
      http: {path: '/:id/comment/:idComment', verb: 'get'},
      accepts: [
        {arg: 'id', type: 'integer', required: true, description: 'TrashPoint ID'},
        {arg: 'idComment', type: 'integer', required: true, description: 'Comment ID'}
      ],
      returns: {type: 'object', root: true}
    }
  );

  /**
   * Enable remote invocation for addComment
   */
  TrashPoint.remoteMethod(
    'addComment',
    {
      description: 'Create new TrashPoint comment',
      http: {path: '/:id/comment', verb: 'post'},
      accepts: [
        {arg: 'id', type: 'integer', required: true, description: 'TrashPoint ID'},
        {arg: 'organizationId', type: 'integer', description: 'Organization ID'},
        {arg: 'body', type: 'string', required: true, description: 'Comment'},
      ],
      returns: {type: 'object', root: true}
    }
  );

  /**
   * Enable remote invocation for deleteComment
   */
  TrashPoint.remoteMethod(
    'deleteComment',
    {
      description: 'Remove TrashPoint comment by TrashPoint ID and Comment ID',
      http: {path: '/:id/comment/:idComment', verb: 'delete'},
      accepts: [
        {arg: 'id', type: 'integer', required: true, description: 'TrashPoint ID'},
        {arg: 'idComment', type: 'integer', required: true, description: 'Comment ID'}
      ]
    }
  );
};
