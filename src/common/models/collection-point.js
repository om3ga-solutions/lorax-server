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
var Underscore = require('underscore');
var Constants = require('../constants');
var GeoLocation = require('../geo-location');
var GeoPoint = require('loopback').GeoPoint;
var AreaAccessControl = require('../area-access-control');
//var messageManager = require('../firebase-message-manager');

function dateDiffInDays(a, b) {
  // Discard the time and time-zone information.
  var utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  var utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

  return Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

/**
 * Returns changes between current CollectionPointActivity and new CollectionPointActivity
 * 
 * @param {Object} current
 * @param {Object} update
 * @returns {Object}
 */
function createCollectionPointDiff(current, update) {
  var result = {
    changed: {},
    updateTime: (new Date()).toISOString()
  };

  result.changed.images = [];
  current.images.forEach(function (image) {
    result.changed.images.push(image.imageKeys);
  });

  if (current.name !== update.name) {
    result.changed.name = current.name;
  }

  if (current.note !== update.note) {
    result.changed.note = current.note;
  }

  if (current.phone !== update.phone) {
    result.changed.phone = current.phone;
  }

  if (current.email !== update.email) {
    result.changed.email = current.email;
  }

  if (JSON.stringify(current.openingHours) !== JSON.stringify(update.openingHours)) {
    result.changed.openingHours = current.openingHours;
  }

  var currentTypeIds = [];
  var currentTypeNames = [];

  current.types.forEach(function (type) {
    currentTypeIds.push(type.id);
    currentTypeNames.push(type.name);
  });

  if (!currentTypeIds.sort().compare(update.collectionPointTypeIds.sort())) {
    result.changed.types = currentTypeNames;
  }

  if (current.collectionPointSizeId !== update.collectionPointSizeId) {
    result.changed.size = current.size.name;
  }

  return result;
}

module.exports = function (CollectionPoint) {

  /**
   * Stores parameters for parametrized queries and returns parameter number
   * 
   * @param {type} parameter
   * @returns {String}
   */
  function sanitize(parameter) {
    return CollectionPoint.app.models.BaseModel.sanitize(parameter);
  }

  /**
   * Returns ids of given CollectionPointTypes
   * 
   * @param {Array} types
   * @param {Boolean} checkIfExists
   * @returns {Array} result
   */
  function collectionPointTypesToIds(types, checkIfExists) {
    return new Promise(function (resolve, reject) {
      CollectionPoint.app.models.CollectionPointType.find({}, function (err, instances) {

        if (err) {
          console.error(err);
          reject();
        }

        var collectionPointTypeIds = [];
        types.forEach(function (a) {
          var exists = false;

          instances.forEach(function (b) {
            if (a === b.name) {
              collectionPointTypeIds.push(b.id);
              exists = true;
              return;
            }
          });

          if (checkIfExists && !exists) {
            reject();
          }
        });

        resolve(collectionPointTypeIds);
      });

    });
  }

  /**
   * Creates SQL [where] clause for SQL query in CollectionPoint list
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
   * @param {String} collectionPointSize
   * @param {String} collectionPointType
   * @param {String} collectionPointNote
   * @param {String} collectionPointIds
   * @param {String} userIds
   * @returns {String}
   */
  function getCollectionPointListFilterWhereClause(area, geocells, geoAreaStreet, geoAreaZip, geoAreaSubLocality, geoAreaLocality, geoAreaAa3, geoAreaAa2, geoAreaAa1, geoAreaCountry, geoAreaContinent, spam, unreviewed, timeBoundaryFrom, timeBoundaryTo, collectionPointSize, collectionPointType, collectionPointNote, collectionPointIds, userIds) {
    var sql = '';

    sql += 'WHERE last_id IS NULL \n';

    sql += '  AND cp.deleted IS NULL \n';

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
      sql += ' AND cpa.id IN (SELECT cpa.id FROM public.collection_point_activity cpa JOIN public.gps ON gps.id = cpa.gps_id JOIN public.area zip ON zip.id = gps.zip_id WHERE zip.zip = ' + sanitize(geoAreaZip) + ') \n';
    }

    if (geoAreaStreet) {
      sql += ' AND cpa.id IN (SELECT cpa.id FROM public.collection_point_activity cpa JOIN public.gps ON gps.id = cpa.gps_id JOIN public.area street ON street.id = gps.street_id WHERE street.street = ' + sanitize(geoAreaStreet) + ') \n';
    }

    if (geoAreaSubLocality) {
      sql += ' AND cpa.id IN (SELECT cpa.id FROM public.collection_point_activity cpa JOIN public.gps ON gps.id = cpa.gps_id JOIN public.area sublocality ON sublocality.id = gps.sub_locality_id WHERE sublocality.sub_locality = ' + sanitize(geoAreaSubLocality) + ') \n';
    }

    if (geoAreaLocality) {
      sql += ' AND cpa.id IN (SELECT cpa.id FROM public.collection_point_activity cpa JOIN public.gps ON gps.id = cpa.gps_id JOIN public.area locality ON locality.id = gps.locality_id WHERE locality.locality = ' + sanitize(geoAreaLocality) + ') \n';
    }

    if (geoAreaAa3) {
      sql += ' AND cpa.id IN (SELECT cpa.id FROM public.collection_point_activity cpa JOIN public.gps ON gps.id = cpa.gps_id JOIN public.area aa3 ON aa3.id = gps.aa3_id WHERE aa3.aa3 = ' + sanitize(geoAreaAa3) + ') \n';
    }

    if (geoAreaAa2) {
      sql += ' AND cpa.id IN (SELECT cpa.id FROM public.collection_point_activity cpa JOIN public.gps ON gps.id = cpa.gps_id JOIN public.area aa2 ON aa2.id = gps.aa2_id WHERE aa2.aa2 = ' + sanitize(geoAreaAa2) + ') \n';
    }

    if (geoAreaAa1) {
      sql += ' AND cpa.id IN (SELECT cpa.id FROM public.collection_point_activity cpa JOIN public.gps ON gps.id = cpa.gps_id JOIN public.area aa1 ON aa1.id = gps.aa1_id WHERE aa1.aa1 = ' + sanitize(geoAreaAa1) + ') \n';
    }

    if (geoAreaCountry) {
      sql += ' AND cpa.id IN (SELECT cpa.id FROM public.collection_point_activity cpa JOIN public.gps ON gps.id = cpa.gps_id JOIN public.area country ON country.id = gps.country_id WHERE country.country = ' + sanitize(geoAreaCountry) + ') \n';
    }

    if (geoAreaContinent) {
      sql += ' AND cpa.id IN (SELECT cpa.id FROM public.collection_point_activity cpa JOIN public.gps ON gps.id = cpa.gps_id JOIN public.area continent ON continent.id = gps.continent_id WHERE continent.continent = ' + sanitize(geoAreaContinent) + ') \n';
    }

    switch (spam) {
    case 'true':
    case '1':
      sql += '  AND cpa.collection_point_id IN (SELECT DISTINCT(cpa2.collection_point_id) FROM public.spam s JOIN public.collection_point_activity cpa2 ON (cpa2.id = s.collection_point_activity_id AND cpa2.collection_point_id = cpa.collection_point_id)) \n';
      break;
    case 'false':
    case '0':
      // There must be at least one record in table spam
      sql += '  AND cpa.collection_point_id NOT IN (SELECT DISTINCT(cpa2.collection_point_id) FROM public.spam s JOIN public.collection_point_activity cpa2 ON (cpa2.id = s.collection_point_activity_id AND cpa2.collection_point_id = cpa.collection_point_id)) \n';
      break;
    }

    switch (unreviewed) {
    case 'true':
    case '1':
      sql += '  AND cp.reviewed IS NULL \n';
      break;
    case 'false':
    case '0':
      sql += '  AND cp.reviewed IS NOT NULL \n';
      break;
    }

    if (timeBoundaryFrom) {
      sql += ' AND cp.id IN (SELECT cpatbf.collection_point_id FROM public.collection_point_activity cpatbf WHERE cpatbf.created >= ' + sanitize(timeBoundaryFrom) + ') \n';
    }

    if (timeBoundaryTo) {
      sql += ' AND cp.id IN (SELECT cpatbt.collection_point_id FROM public.collection_point_activity cpatbt WHERE cpatbt.created <= ' + sanitize(timeBoundaryTo) + ') \n';
    }

    if (collectionPointSize) {
      sql += '  AND cpa.collection_point_size_id IN (SELECT cps.id FROM public.collection_point_size cps WHERE cps.name IN(' + sanitize(collectionPointSize.split(',')) + ')) \n';
    }

    if (collectionPointType) {
      sql += '  AND cpa.id IN (SELECT cpahcpt.collection_point_activity_id FROM public.collection_point_activity_has_collection_point_type cpahcpt JOIN public.collection_point_type cpt ON (cpahcpt.collection_point_type_id = cpt.id) WHERE cpt.name IN (' + sanitize(collectionPointType.split(',')) + ')) \n';
    }

    if (collectionPointNote) {
      sql += '  AND cpa.note ILIKE ' + sanitize('%' + collectionPointNote + '%') + ' \n';
    }

    if (collectionPointIds) {
      sql += '  AND cpa.collection_point_id IN (' + sanitize(collectionPointIds.split(',').map(Number).filter(Boolean)) + ') \n';
    }

    if (userIds) {
      sql += '  AND cpa.collection_point_id IN (SELECT DISTINCT(cpa3.collection_point_id) FROM public.collection_point_activity cpa3 WHERE cpa3.user_id IN (' + sanitize(userIds.split(',').map(Number).filter(Boolean)) + ')) \n';
    }

    return sql;
  }

  /**
   * Creates SQL query for CollectionPoint list
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
   * @param {String} collectionPointSize
   * @param {String} collectionPointType
   * @param {String} collectionPointNote
   * @param {String} collectionPointIds
   * @param {String} userIds
   * @param {String} orderBy
   * @param {String} userPosition
   * @param {Number} page
   * @param {Number} limit
   * @returns {String}
   */
  function getCollectionPointListSQL(attributes, area, geocells, geoAreaStreet, geoAreaZip, geoAreaSubLocality, geoAreaLocality, geoAreaAa3, geoAreaAa2, geoAreaAa1, geoAreaCountry, geoAreaContinent, spam, unreviewed, timeBoundaryFrom, timeBoundaryTo, collectionPointSize, collectionPointType, collectionPointNote, collectionPointIds, userIds, orderBy, userPosition, page, limit) {

    var sql = '';

    sql += 'SELECT \n';
    sql += '  result.*, \n';

    if (attributes.indexOf(Constants.COLLECTION_POINT_ATTR_TYPES) > -1) {
      sql += '  array_to_json(ARRAY(SELECT cpt.name FROM public.collection_point_type cpt JOIN public.collection_point_activity_has_collection_point_type cpahcpt ON (cpahcpt.collection_point_type_id = cpt.id AND cpahcpt.collection_point_activity_id = result.activity_id))) AS types, \n';
    }

    if (attributes.indexOf(Constants.COLLECTION_POINT_ATTR_IMAGES) > -1) {
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
      sql += '      JOIN public.collection_point_activity_has_image cpahi ON (cpahi.image_id = i.id AND result.activity_id = cpahi.collection_point_activity_id) \n';
      sql += '    ) AS i \n';
      sql += '  ) AS images, \n';
    }

    if (attributes.indexOf(Constants.COLLECTION_POINT_ATTR_UPDATE_HISTORY) > -1) {
      sql += '  (SELECT array_to_json(array_agg(h)) FROM (SELECT json_build_object(\'activityId\', h.id) AS "activityId", json_build_object(\'id\', hu.id, \'firstName\', hu.first_name, \'lastName\', hu.last_name) AS "userInfo", h.changed::json AS data FROM public.collection_point_activity h JOIN public.user hu ON hu.id = h.user_id WHERE h.last_id = result.activity_id ORDER BY h.created ASC) AS h \n';
      sql += '  ) AS update_history, \n';
    }

    sql += '  "last_column_fix" AS last_column_fix \n';
    sql += 'FROM (\n';

    sql += 'SELECT \n';
    if (attributes.indexOf(Constants.COLLECTION_POINT_ATTR_ID) > -1) {
      sql += '  cpa.collection_point_id AS id, \n';
      sql += '  cpa.id AS activity_id, \n';
    }

    var safeOrderByUserPosition = false;
    if (attributes.indexOf(Constants.COLLECTION_POINT_ATTR_GPS_SHORT) > -1 || attributes.indexOf(Constants.COLLECTION_POINT_ATTR_GPS_FULL) > -1) {
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

    if (attributes.indexOf(Constants.COLLECTION_POINT_ATTR_GPS_FULL) > -1) {
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

    if (attributes.indexOf(Constants.COLLECTION_POINT_ATTR_USER_INFO) > -1) {
      sql += '  u.id AS user_info_id, \n';
      sql += '  u.first_name AS user_info_first_name, \n';
      sql += '  u.last_name AS user_info_last_name, \n';
    }

    if (attributes.indexOf(Constants.COLLECTION_POINT_ATTR_NAME) > -1) {
      sql += '  cpa.name AS name, \n';
    }

    if (attributes.indexOf(Constants.COLLECTION_POINT_ATTR_SIZE) > -1) {
      sql += '  cps.name AS size, \n';
    }

    if (attributes.indexOf(Constants.COLLECTION_POINT_ATTR_NOTE) > -1) {
      sql += '  cpa.note AS note, \n';
    }

    if (attributes.indexOf(Constants.COLLECTION_POINT_ATTR_EMAIL) > -1) {
      sql += '  cpa.email AS email, \n';
    }

    if (attributes.indexOf(Constants.COLLECTION_POINT_ATTR_OPENING_HOURS) > -1) {
      sql += '  cpa.opening_hours AS opening_hours, \n';
    }

    if (attributes.indexOf(Constants.COLLECTION_POINT_ATTR_PHONE) > -1) {
      sql += '  cpa.phone AS phone, \n';
    }

    if (attributes.indexOf(Constants.COLLECTION_POINT_ATTR_URL) > -1) {
      sql += '  cpa.url AS url, \n';
    }

    if (attributes.indexOf(Constants.COLLECTION_POINT_ATTR_CREATED) > -1) {
      sql += '  cp.created, \n';
    }

    if (attributes.indexOf(Constants.COLLECTION_POINT_ATTR_UPDATE_TIME) > -1) {
      sql += '  cpa.created AS update_time, \n';
    }

    if (attributes.indexOf(Constants.COLLECTION_POINT_ATTR_UPDATE_NEEDED) > -1) {
      sql += '  CASE WHEN (cpa.created - tp.created) > INTERVAL \'90 days\' AND status <> \'cleaned\' THEN 1 ELSE 0 END AS update_needed, \n';
    }

    if (attributes.indexOf(Constants.COLLECTION_POINT_ATTR_SPAM) > -1) {
      sql += '  CASE WHEN cpa.collection_point_id IN (SELECT DISTINCT(cpa_attr.collection_point_id) FROM public.spam s_attr JOIN public.collection_point_activity cpa_attr ON (cpa_attr.id = s_attr.collection_point_activity_id AND cpa_attr.collection_point_id = cpa.collection_point_id)) THEN true ELSE false END AS spam, \n';
    }

    if (attributes.indexOf(Constants.COLLECTION_POINT_ATTR_UNREVIEWED) > -1) {
      sql += '  CASE WHEN cp.reviewed IS NOT NULL THEN false ELSE true END AS unreviewed, \n';
    }

    sql += '\'last_column_fix\' AS last_column_fix \n';

    sql += 'FROM public.collection_point_activity cpa \n';

    if (attributes.indexOf(Constants.COLLECTION_POINT_ATTR_GPS_SHORT) > -1 || attributes.indexOf(Constants.COLLECTION_POINT_ATTR_GPS_FULL) > -1 || area || geocells) {
      sql += 'JOIN public.gps ON gps.id = cpa.gps_id \n';
      sql += 'JOIN public.gps_source ON gps_source.id = gps.gps_source_id \n';
    }

    if (attributes.indexOf(Constants.COLLECTION_POINT_ATTR_SIZE) > -1) {
      sql += 'JOIN public.collection_point_size cps ON cps.id = cpa.collection_point_size_id \n';
    }

    if (attributes.indexOf(Constants.COLLECTION_POINT_ATTR_GPS_FULL) > -1) {
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

    if (attributes.indexOf(Constants.COLLECTION_POINT_ATTR_USER_INFO) > -1) {
      sql += 'JOIN public.user u ON u.id = cpa.user_id \n';
    }

    sql += 'JOIN public.collection_point cp ON cp.id = cpa.collection_point_id \n';

    sql += getCollectionPointListFilterWhereClause(area, geocells, geoAreaStreet, geoAreaZip, geoAreaSubLocality, geoAreaLocality, geoAreaAa3, geoAreaAa2, geoAreaAa1, geoAreaCountry, geoAreaContinent, spam, unreviewed, timeBoundaryFrom, timeBoundaryTo, collectionPointSize, collectionPointType, collectionPointNote, collectionPointIds, userIds);

    if (orderBy) {
      var order = [];
      orderBy.split(',').forEach(function (str) {
        var column = str.substr(0, 1) === '-' ? str.substr(1) : str;
        var trend = str.substr(0, 1) === '-' ? ' DESC' : ' ASC';

        switch (column) {
        case Constants.COLLECTION_POINT_ORDER_BY_NOTE:
        case Constants.COLLECTION_POINT_ORDER_BY_EMAIL:
        case Constants.COLLECTION_POINT_ORDER_BY_PHONE:
          order.push('cpa.' + column + trend);
          break;
        case Constants.COLLECTION_POINT_ORDER_BY_REVIEWED:
        case Constants.COLLECTION_POINT_ORDER_BY_CREATED:
        case Constants.COLLECTION_POINT_ORDER_BY_ID:
          order.push('cp.' + column + trend);
          break;
        case Constants.COLLECTION_POINT_ORDER_BY_GPS:
          if (safeOrderByUserPosition) {
            order.push('closest ASC');
          }
          break;
        case Constants.COLLECTION_POINT_ORDER_BY_SIZE:
          order.push('cpa.collection_point_size_id' + (trend === ' DESC' ? ' ASC' : ' DESC'));
          break;
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
    }

    sql += '  ) AS result';

    return sql;
  }

  /**
   * Creates SQL query for CollectionPoint count
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
   * @param {String} collectionPointSize
   * @param {String} collectionPointType
   * @param {String} collectionPointNote
   * @param {String} collectionPointIds
   * @param {String} userIds
   * @returns {String}
   */
  function getCollectionPointListCountSQL(area, geocells, geoAreaStreet, geoAreaZip, geoAreaSubLocality, geoAreaLocality, geoAreaAa3, geoAreaAa2, geoAreaAa1, geoAreaCountry, geoAreaContinent, spam, unreviewed, timeBoundaryFrom, timeBoundaryTo, collectionPointSize, collectionPointType, collectionPointNote, collectionPointIds, userIds) {
    var sql = 'SELECT COUNT (a.id) AS count \n';
    sql += 'FROM ( \n';

    sql += '  SELECT cpa.id \n';
    sql += '  FROM public.collection_point_activity cpa \n';
    sql += '  JOIN public.collection_point cp ON cp.id = cpa.collection_point_id \n';

    if (area || geocells) {
      sql += '  JOIN public.gps ON gps.id = cpa.gps_id \n';
    }

    sql += getCollectionPointListFilterWhereClause(area, geocells, geoAreaStreet, geoAreaZip, geoAreaSubLocality, geoAreaLocality, geoAreaAa3, geoAreaAa2, geoAreaAa1, geoAreaCountry, geoAreaContinent, spam, unreviewed, timeBoundaryFrom, timeBoundaryTo, collectionPointSize, collectionPointType, collectionPointNote, collectionPointIds, userIds);

    sql += ') AS a \n';

    return sql;
  }
  /**
   * @param {Array} images
   * @param {String} gps
   * @param {String} size
   * @param {Array} types
   * @param {String} name
   * @param {String} note
   * @param {String} phone
   * @param {String} url
   * @param {String} email
   * @param {Object} openingHours
   * @returns {Array}
   */
  function checkParameters(images, gps, size, types, name, note, phone, url, email, openingHours) {
    return new Promise(function (resolve, reject) {

      // Check whether GPS is valid object
      if (!gps || gps.lat === undefined || gps.long === undefined || gps.accuracy === undefined || !gps.source) {
        return reject({message: 'GPS object is not valid', status: 404});
      }

      // Check whether type is valid array
      if (typeof types !== 'object') {
        return reject({message: 'Types is not valid array', status: 404});
      }

      CollectionPoint.app.models.GPSSource.findOne({where: {name: gps.source}}, function (err, responseGPSSource) {

        if (err) {
          console.error(err);
          return reject({message: err.detail, status: 403});
        }

        // Check source existence    
        if (!responseGPSSource) {
          return reject({message: 'GPSSource is not valid', status: 404});
        }

        // Get CollectionPointSize by name
        CollectionPoint.app.models.CollectionPointSize.findOne({where: {name: size}}, function (err, responseCollectionPointSize) {

          if (err) {
            console.error(err);
            return reject({message: err.detail, status: 403});
          }

          // Check existence
          if (!responseCollectionPointSize) {
            return reject({message: 'CollectionPointSize is not valid', status: 404});
          }

          var collectionPointTypes = collectionPointTypesToIds(types, true);
          collectionPointTypes.then(function (collectionPointTypeIds) {

            if (!collectionPointTypeIds.length) {
              return reject({message: 'At least one CollectionPointType must be provided', status: 404});
            }

            return resolve({
              images: images,
              collectionPointSizeId: responseCollectionPointSize.id,
              collectionPointTypeIds: collectionPointTypeIds,
              lat: gps.lat,
              long: gps.long,
              accuracy: gps.accuracy,
              gpsSourceId: responseGPSSource.id,
              name: name,
              note: note,
              phone: phone,
              url: url,
              email: email,
              openingHours: openingHours
            });

          }).catch(function () {
            return reject({message: 'Invalid CollectionPointTypes', status: 404});
          });

        });


      });
    });
  }

  /**
   * 
   * @param {String} geocells
   * @returns {Array}
   */
  function createZoomPointGpsFilter(geocells) {
    return new Promise(function (resolve, reject) {
      var pattern = '^(';
      var geocellsArray = geocells.split(',');

      geocellsArray.forEach(function (geocell, index) {
        pattern += geocell + (geocellsArray.length === index + 1 ? '' : '|');
      });
      pattern += ')';

      CollectionPoint.app.models.GPS.find({where: {geocell: {regexp: pattern}}, fields: ['id']}, function (err, instances) {
        if (err) {
          return reject(err);
        }

        var gpsIds = [];
        instances.forEach(function (instance) {
          gpsIds.push(instance.id);
        });

        CollectionPoint.app.models.CollectionPointActivity.find({where: {lastId: null, gpsId: {inq: gpsIds}}, fields: ['id']}, function (err, instances) {
          if (err) {
            return reject(err);
          }

          var collectionPointActivityIds = [];
          instances.forEach(function (instance) {
            collectionPointActivityIds.push(instance.id);
          });

          return resolve(collectionPointActivityIds);
        });
      });
    });
  }

  /**
   * Returns CollectionPoint detail
   * 
   * @param {Number} id
   * @param {Function} cb
   * @returns {Object}
   */
  CollectionPoint.getCollectionPoint = function (id, cb) {

    var filter = {
      where: {
        collectionPointId: id,
        lastId: null
      },
      include: [
        {
          images: 'imageKeys'
        },
        'size',
        'types',
        'user',
        {
          gps: ['source', 'continent', 'country', 'aa1', 'aa2', 'aa3', 'locality', 'subLocality', 'street', 'zip']
        },
        {
          history: ['user']
        },
        {
          collectionPoint: [{relation: 'events', scope: {
            where: {created: {gte: (new Date()).toISOString()}},
            order: ['created DESC'],
            include: {gps: ['source', 'continent', 'country', 'aa1', 'aa2', 'aa3', 'locality', 'subLocality', 'street', 'zip']}
          }}]
        }
      ]
    };

    CollectionPoint.app.models.CollectionPointActivity.findOne(filter, function (err, instance) {

      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      if (!instance) {
        return cb({message: 'CollectionPoint does not exist', status: 404});
      }

      var current = instance.toJSON();

      if (current.collectionPoint.deleted) {
        return cb({message: 'CollectionPoint is deleted', status: 403});
      }

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

      var history = [];
      current.history.forEach(function (h) {
        if (h.changed) {
          h.changed.userInfo = {
            userId: h.user.id,
            firstName: h.user.firstName,
            lastName: h.user.lastName
          };
          h.changed.activityId = h.id;
          history.push(h.changed);
        }
      });

      var events = [];
      if (current.collectionPoint.events) {
        current.collectionPoint.events.forEach(function (event) {
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

      var result = {
        id: current.collectionPointId,
        activityId: current.id,
        images: images,
        gps: gps,
        size: current.size.name,
        types: types,
        userInfo: {
          userId: current.user.id,
          firstName: current.user.firstName,
          lastName: current.user.lastName
        },
        name: current.name,
        note: current.note,
        phone: current.phone,
        email: current.email,
        openingHours: current.openingHours,
        created: current.collectionPoint.created,
        updateTime: current.created,
        updateHistory: history,
        url: current.url,
        events: events
      };

      cb(null, result);
    });
  };

  /**
   * Deletes CollectionPoint
   * 
   * @param {Number} id
   * @param {Function} cb
   */
  CollectionPoint.deleteCollectionPoint = function (id, cb) {

    CollectionPoint.beginTransaction({isolationLevel: CollectionPoint.Transaction.READ_COMMITTED}, function (err, tx) {

      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      var filter = {
        where: {
          collectionPointId: id,
          lastId: null
        },
        include: ['gps']
      };

      CollectionPoint.app.models.CollectionPointActivity.findOne(filter, {transaction: tx}, function (err, instance) {

        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        if (!instance) {
          return cb({message: 'CollectionPoint does not exist', status: 404});
        }

        AreaAccessControl.check(Constants.METHOD_COLLECTION_POINT_DELETE, CollectionPoint.app.models.BaseModel.user, instance.toJSON().gps, CollectionPoint.settings.acls).then(function () {

          // Soft delete
          CollectionPoint.updateAll({id: id}, {deleted: (new Date()).toISOString()}, function (err) {
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

  };

  /**
   * Deletes CollectionPointActivity
   * 
   * @param {Number} id
   * @param {Function} cb
   */
  CollectionPoint.deleteActivity = function (id, cb) {

    CollectionPoint.beginTransaction({isolationLevel: CollectionPoint.Transaction.READ_COMMITTED}, function (err, tx) {

      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      CollectionPoint.app.models.CollectionPointActivity.findById(id, {include: [
        'history', 'gps'
      ]}, {transaction: tx}, function (err, instance) {

        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        if (!instance) {
          return cb({message: 'CollectionPointActivity does not exist', status: 404});
        }

        var current = instance.toJSON();
        AreaAccessControl.check(Constants.METHOD_COLLECTION_POINT_ACTIVITY_DELETE, CollectionPoint.app.models.BaseModel.user, current.gps, CollectionPoint.settings.acls).then(function () {
          if (current.lastId === null) {

            if (current.history.length) {
              // CollectionPointActivity is last (then delete last CollectionPointActivity and set lastId for previous acitivities properly)
              var newLastId = current.history[current.history.length - 1].id;

              var p1 = CollectionPoint.app.models.CollectionPointActivity.updateAll({collectionPointId: current.collectionPointId, id: {nin: [current.id, newLastId]}}, {lastId: newLastId}, {transaction: tx}, function (err) {

                if (err) {
                  console.error(err);
                  return cb({message: err.detail});
                }

              });

              var p2 = CollectionPoint.app.models.CollectionPointActivity.updateAll({id: newLastId}, {lastId: null, changed: null}, {transaction: tx}, function (err) {

                if (err) {
                  console.error(err);
                  return cb({message: err.detail});
                }

              });

              Promise.all([p1, p2]).then(function () {

                CollectionPoint.app.models.CollectionPointActivity.destroyAll({id: current.id}, {transaction: tx}, function (err) {

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
              // CollectionPointActivity is first (then delete CollectionPoint, foreign keys will do the rest)
              CollectionPoint.destroyAll({id: current.collectionPointId}, {transaction: tx}, function (err) {

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
            // delete CollectionPointActivity
            CollectionPoint.app.models.destroyAll({id: current.id}, {transaction: tx}, function (err) {

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
   * Deletes Image from CollectionPointActivity
   * 
   * @param {Number} id
   * @param {Number} imageId
   * @param {Function} cb
   */
  CollectionPoint.deleteActivityImage = function (id, imageId, cb) {
    CollectionPoint.beginTransaction({isolationLevel: CollectionPoint.Transaction.READ_COMMITTED}, function (err, tx) {

      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      CollectionPoint.app.models.CollectionPointActivity.findById(id, {include: ['gps']}, {transaction: tx}, function (err, instance) {

        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        if (!instance) {
          return cb({message: 'CollectionPointActivity does not exist', status: 404});
        }

        var current = instance.toJSON();

        AreaAccessControl.check(Constants.METHOD_COLLECTION_POINT_ACTIVITY_IMAGE_DELETE, CollectionPoint.app.models.BaseModel.user, current.gps, CollectionPoint.settings.acls).then(function () {
          var p1 = CollectionPoint.app.models.CollectionPointActivityHasImage.destroyAll({imageId: imageId, collectionPointActivityId: id}, {transaction: tx}, function (err) {

            if (err) {
              console.error(err);
              return cb({message: err.detail});
            }

          });

          var p2 = Promise.defer();
          var newChanges = instance.toJSON().changed;
          var images = [];

          if (newChanges && newChanges.changed && newChanges.changed.images) {
            newChanges.changed.images.forEach(function (image) {
              if (Number(image.id) !== Number(imageId)) {
                images.push(image);
              }
            });

            newChanges.changed.images = images;

            p2 = CollectionPoint.app.models.CollectionPointActivity.updateAll({id: id}, {changed: newChanges}, function (err) {

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
   * @param {String} collectionPointSize
   * @param {String} collectionPointType
   * @param {String} collectionPointNote
   * @param {String} collectionPointIds
   * @param {String} userIds
   * @param {Function} cb
   * @returns {Number}
   */
  CollectionPoint.listCount = function (area, geocells, geoAreaStreet, geoAreaZip, geoAreaSubLocality, geoAreaLocality, geoAreaAa3, geoAreaAa2, geoAreaAa1, geoAreaCountry, geoAreaContinent, spam, unreviewed, timeBoundaryFrom, timeBoundaryTo, collectionPointSize, collectionPointType, collectionPointNote, collectionPointIds, userIds, cb) {
    var ds = CollectionPoint.app.dataSources.trashout;

    var sql = getCollectionPointListCountSQL(area, geocells, geoAreaStreet, geoAreaZip, geoAreaSubLocality, geoAreaLocality, geoAreaAa3, geoAreaAa2, geoAreaAa1, geoAreaCountry, geoAreaContinent, spam, unreviewed, timeBoundaryFrom, timeBoundaryTo, collectionPointSize, collectionPointType, collectionPointNote, collectionPointIds, userIds);

    ds.connector.execute(sql, CollectionPoint.app.models.BaseModel.sqlParameters, function (err, instance) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      cb(null, Number(instance[0].count));
    });
  };

  /**
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
   * @param {String} collectionPointSize
   * @param {String} collectionPointType
   * @param {String} collectionPointNote
   * @param {String} collectionPointIds
   * @param {String} userIds
   * @param {String} attributesNeeded
   * @param {String} orderBy
   * @param {String} userPosition
   * @param {String} page
   * @param {String} limit
   * @param {Function} cb
   * @returns {Array}
   */
  CollectionPoint.list = function (area, geocells, geoAreaStreet, geoAreaZip, geoAreaSubLocality, geoAreaLocality, geoAreaAa3, geoAreaAa2, geoAreaAa1, geoAreaCountry, geoAreaContinent, spam, unreviewed, timeBoundaryFrom, timeBoundaryTo, collectionPointSize, collectionPointType, collectionPointNote, collectionPointIds, userIds, attributesNeeded, orderBy, userPosition, page, limit, cb) {
    var ds = CollectionPoint.app.dataSources.trashout;

    var attributes = [];
    if (attributesNeeded && attributesNeeded.length) {
      attributesNeeded.split(',').forEach(function (attribute) {
        if (Constants.COLLECTION_POINT_ALLOWED_ATTRIBUTES.indexOf(attribute) > -1) {
          attributes.push(attribute);
        }
      });
    }

    if (!attributes.length) {
      return cb({message: 'At least one attribute in attributeNeed parameter must be set', status: 403});
    }

    var sql = getCollectionPointListSQL(attributes, area, geocells, geoAreaStreet, geoAreaZip, geoAreaSubLocality, geoAreaLocality, geoAreaAa3, geoAreaAa2, geoAreaAa1, geoAreaCountry, geoAreaContinent, spam, unreviewed, timeBoundaryFrom, timeBoundaryTo, collectionPointSize, collectionPointType, collectionPointNote, collectionPointIds, userIds, orderBy, userPosition, page, limit);

    ds.connector.execute(sql, CollectionPoint.app.models.BaseModel.sqlParameters, function (err, instances) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      var result = [];
      instances.forEach(function (instance) {

        var temp = {};

        if (attributes.indexOf(Constants.COLLECTION_POINT_ATTR_ID) > -1) {
          temp.id = Number(instance.id);
          temp.activityId = Number(instance.activity_id);
        }

        if (attributes.indexOf(Constants.COLLECTION_POINT_ATTR_IMAGES) > -1) {
          temp.images = instance.images;
        }

        if (attributes.indexOf(Constants.COLLECTION_POINT_ATTR_GPS_SHORT) > -1 || attributes.indexOf(Constants.COLLECTION_POINT_ATTR_GPS_FULL) > -1) {
          temp.gps = {
            lat: instance.gps_lat,
            long: instance.gps_long,
            accuracy: instance.gps_accuracy,
            source: instance.gps_source,
            area: instance.gps_area ? instance.gps_area[0] : null
          };
        }

        if (attributes.indexOf(Constants.COLLECTION_POINT_ATTR_USER_INFO) > -1) {
          temp.userInfo = {
            id: instance.user_info_id,
            firstName: instance.user_info_first_name,
            lastName: instance.user_info_last_name
          };
        }

        if (attributes.indexOf(Constants.COLLECTION_POINT_ATTR_NAME) > -1) {
          temp.name = instance.name;
        }

        if (attributes.indexOf(Constants.COLLECTION_POINT_ATTR_SIZE) > -1) {
          temp.size = instance.size;
        }

        if (attributes.indexOf(Constants.COLLECTION_POINT_ATTR_TYPES) > -1) {
          temp.types = instance.types;
        }

        if (attributes.indexOf(Constants.COLLECTION_POINT_ATTR_NOTE) > -1) {
          temp.note = instance.note;
        }

        if (attributes.indexOf(Constants.COLLECTION_POINT_ATTR_EMAIL) > -1) {
          temp.email = instance.email;
        }

        if (attributes.indexOf(Constants.COLLECTION_POINT_ATTR_OPENING_HOURS) > -1) {
          temp.openingHours = JSON.parse(instance.opening_hours);
        }

        if (attributes.indexOf(Constants.COLLECTION_POINT_ATTR_PHONE) > -1) {
          temp.phone = instance.phone;
        }

        if (attributes.indexOf(Constants.COLLECTION_POINT_ATTR_URL) > -1) {
          temp.url = instance.url;
        }

        if (attributes.indexOf(Constants.COLLECTION_POINT_ATTR_CREATED) > -1) {
          temp.created = instance.created;
        }

        if (attributes.indexOf(Constants.COLLECTION_POINT_ATTR_UPDATE_TIME) > -1) {
          temp.updateTime = instance.update_time;
        }

        if (attributes.indexOf(Constants.COLLECTION_POINT_ATTR_UPDATE_NEEDED) > -1) {
          temp.updateNeeded = instance.update_needed;
        }

        if (attributes.indexOf(Constants.COLLECTION_POINT_ATTR_UPDATE_HISTORY) > -1) {
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
                updateTime: h.data.updateTime
              });
            });
          }

          temp.updateHistory = history;
        }

        if (attributes.indexOf(Constants.COLLECTION_POINT_ATTR_SPAM) > -1) {
          temp.spam = instance.spam;
        }

        if (attributes.indexOf(Constants.COLLECTION_POINT_ATTR_UNREVIEWED) > -1) {
          temp.unreviewed = instance.unreviewed;
        }

        result.push(temp);
      });

      cb(null, result);
    });

  };

  CollectionPoint.zoomPoints = function (zoomLevel, geocells, spam, unreviewed, timeBoundaryFrom, timeBoundaryTo, collectionPointSize, collectionPointType, collectionPointNote, collectionPointIds, userIds, cb) {

    var filter = {
      where: {
        lastId: null
      },
      include: [{relation: 'collectionPoint', scope: {where: {deleted: null}}}]
    };
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
      geocellLength = 5;
      break;
    }

    createZoomPointGpsFilter(geocells).then(function (collectionPointActivityIds) {

      filter.where.id = {inq: collectionPointActivityIds};

      var gpsRelation = {relation: 'gps', scope: {}}; //where: {geocell: {regexp: pattern}}}

      if (zoomLevel === 5) {
        gpsRelation.scope.include = {relation: 'country', scope: {where: {type: 'country', zoomLevel: zoomLevel}}};
      }

      filter.include.push(gpsRelation);

      if (spam) {
        filter.include.push({relation: 'spam', scope: {where: {resolved: null}}});

        filter.include.push({history: {relation: 'spam', scope: {where: {resolved: null}}}});
      }

      if (timeBoundaryFrom && timeBoundaryTo) {

        var validFrom = (new Date(timeBoundaryFrom)).getTime() > 0;
        var validTo = (new Date(timeBoundaryTo)).getTime() > 0;

        if (validFrom && validTo) {

          filter.where.and = [
            {
              or: [
                {
                  created: {
                    between: [timeBoundaryFrom, timeBoundaryTo]
                  }
                }
//            ,
//            {
//              updateTime: {
//                between: [timeBoundaryFrom, timeBoundaryTo]
//              }
//            }
              ]
            }
          ];

        }

      }

      if (collectionPointSize) {
        filter.include.push('size');
      }

      if (collectionPointType) {
        filter.include.push('types');
      }

      if (collectionPointNote) {
        filter.where.note = {like: '%' + collectionPointNote + '%'};
      }

      if (collectionPointIds) {
        filter.where.collectionPointId = {inq: collectionPointIds.split(',').map(Number).filter(Boolean) || []};
      }

      if (userIds) {
        filter.include.push({relation: 'history', scope: {where: {userId: {inq: userIds.split(',').map(Number).filter(Boolean) || []}}}});
      }

      CollectionPoint.app.models.CollectionPointActivity.find(filter, function (err, instances) {

        if (err) {
          console.error(err);
          return cb(err);
        }

        var result = [];
        instances.forEach(function (instance) {
          var current = instance.toJSON();
          if (!current.collectionPoint) {
            return;
          }

          switch (unreviewed) {
          case 'true':
          case '1':
            // skip reviewed CollectionPoints
            if (current.collectionPoint.reviewed !== null) {
              return;
            }
            break;
          case 'false':
          case '0':
            // skip unreviewed CollectionPoints
            if (current.collectionPoint.reviewed === null) {
              return;
            }
            break;
          }

          switch (spam) {
          case 'true':
          case '1':
            // skip CollectionPoints that has no activity marked as spam
            if (current.spam.length) {
              break;
            }

            if (current.history) {
              var dontSkip = false;
              current.history.forEach(function (h) {
                if (h.spam.length) {
                  dontSkip = true;
                  return;
                }
              });

              if (dontSkip) {
                break;
              }
            }

            return;
          case 'false':
          case '0':
            // skip CollectionPoints that has at least one activity marked as spam
            if (current.history) {
              var skip = false;
              current.history.forEach(function (h) {
                if (h.spam.length) {
                  skip = true;
                  return;
                }
              });

              if (skip) {
                return;
              }
            }

            if (current.spam.length) {
              return;
            }

            break;
          }

          if (collectionPointSize && collectionPointSize.split(',').indexOf(current.size.name) === -1) {
            // Skip all the CollectionPoints that doesn't have any of given CollectionPointSizes
            return;
          }

          if (collectionPointType) {
            var currentTrashTypeNames = [];
            current.types.forEach(function (type) {
              currentTrashTypeNames.push(type.name);
            });

            if (!currentTrashTypeNames.intersect(collectionPointType.split(',')).length) {
              // Skip all the CollectionPoints that doesn't have at least one of given CollectionPointTypes
              return;
            }
          }

          if (userIds && userIds.split(',').indexOf(String(current.userId)) === -1 && !current.history.length) {
            // Skipp all the CollectionPoint that has no relation (in whole history of the CollectionPoint) with given array of users
            return;
          }

          var temp = {
            geocell: current.gps.geocell.substr(0, geocellLength),
            collectionPoint: {
              id: current.collectionPointId,
              lat: current.gps.lat,
              long: current.gps.long,
              updateNeeded: dateDiffInDays(new Date(current.created), new Date(current.collectionPoint.created)) >= Constants.COLLECTION_POINT_UPDATE_NEEDED_DAYS
            }
          };

          if (current.gps.country) {
            temp.lat = current.gps.country.centerLat;
            temp.long = current.gps.country.centerLong;
          }

          result.push(temp);

        });

        var groupByGeocells = Underscore.chain(result).groupBy('geocell').map(function (value, key) {
          var points = Underscore.pluck(value, 'collectionPoint');

          var lat = Underscore.pluck(value, 'lat')[0];
          var long = Underscore.pluck(value, 'long')[0];
          if (!lat || !long) {
            // Zoom level 5 takes latitude and longitude from geocell (in order to place centroid/cluster in the center of countries)
            // Other zoom levels need to compute latitutde and longitude from CollectionPoint locations.

            lat = parseFloat((Underscore.reduce(points, function (memo, num) { return Number(memo) + Number(num.lat); }, 0) / points.length).toFixed(6));
            long = parseFloat((Underscore.reduce(points, function (memo, num) { return Number(memo) + Number(num.long); }, 0) / points.length).toFixed(6));
          }

          return {
            geocell: key,
            lat: lat,
            long: long,
            count: points.length,
            updateNeeded: Underscore.countBy(points, 'updateNeeded')['true'] || 0
                    //collectionPoints: points
          };
        }).value();

        cb(null, groupByGeocells);
      });
    }).catch(function (error) {
      return cb(error);
    });
  };

  /**
   * Creates CollectionPoint
   * 
   * @param {Array} images
   * @param {Object} gps
   * @param {String} size
   * @param {Array} types
   * @param {String} name
   * @param {String} note
   * @param {String} phone
   * @param {String} url
   * @param {String} email
   * @param {Array} openingHours
   * @param {Function} cb
   * @returns {Object}
   */
  CollectionPoint.reportCollectionPoint = function (images, gps, size, types, name, note, phone, url, email, openingHours, cb) {

    var check = checkParameters(images, gps, size, types, name, note, phone, url, email, openingHours);

    check.then(function (response) {

      CollectionPoint.beginTransaction({isolationLevel: CollectionPoint.Transaction.READ_COMMITTED}, function (err, tx) {

        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        GeoLocation.upsertGps(response.lat, response.long, response.accuracy, response.gpsSourceId).then(function (gpsId) {

          CollectionPoint.create({userId: CollectionPoint.app.models.BaseModel.user.id}, {transaction: tx}, function (err, responseCollectionPoint) {

            if (err) {
              console.error(err);
              return cb({message: err.detail});
            }

            var data = {
              gpsId: gpsId,
              collectionPointId: responseCollectionPoint.id,
              userId: CollectionPoint.app.models.BaseModel.user.id,
              collectionPointSizeId: response.collectionPointSizeId,
              name: response.name,
              note: response.note,
              phone: response.phone,
              url: url,
              email: response.email,
              openingHours: response.openingHours
            };

            CollectionPoint.app.models.CollectionPointActivity.create(data, {transaction: tx}, function (err, responseCollectionPointActivity) {

              if (err) {
                console.error(err);
                return cb({message: err.detail});
              }

              var p1, p2, p3 = Promise.defer();

              var cpTypes = [];
              response.collectionPointTypeIds.forEach(function (collectionPointTypeId) {
                cpTypes.push({collectionPointTypeId: collectionPointTypeId, collectionPointActivityId: responseCollectionPointActivity.id});
              });

              p1 = CollectionPoint.app.models.CollectionPointActivityHasCollectionPointType.create(cpTypes, {transaction: tx}, function (err) {

                if (err) {
                  console.error(err);
                  return cb({message: err.detail});
                }

              });

              if (response.images) {
                p2 = CollectionPoint.app.models.Image.create(response.images, {transaction: tx}, function (err, responseImage) {

                  if (err) {
                    console.error(err);
                    return cb({message: err.detail});
                  }

                  var collectionPointImages = [];
                  responseImage.forEach(function (image) {
                    collectionPointImages.push({imageId: image.id, collectionPointActivityId: responseCollectionPointActivity.id});
                  });

                  p3 = CollectionPoint.app.models.CollectionPointActivityHasImage.create(collectionPointImages, {transaction: tx}, function (err) {

                    if (err) {
                      console.error(err);
                      return cb({message: err.detail});
                    }

                  });
                });
              } else {
                p2 = Promise.resolve();
                p3 = Promise.resolve();
              }

              Promise.all([p1, p2, p3]).then(function () {

                tx.commit(function (err) {

                  if (err) {
                    console.error(err);
                    return cb({message: err.detail});
                  }

                  cb(null, responseCollectionPoint.id, responseCollectionPointActivity.id, 200);
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

    }).catch(function (error) {
      console.error(error);
      return cb(error);
    });

  };

  /**
   * Updates CollectionPoint
   * 
   * @param {Number} id
   * @param {Array} images
   * @param {Object} gps
   * @param {String} size
   * @param {Array} types
   * @param {String} name
   * @param {String} note
   * @param {String} phone
   * @param {String} url
   * @param {String} email
   * @param {Array} openingHours
   * @param {Function} cb
   * @returns {Object}
   */
  CollectionPoint.updateCollectionPoint = function (id, images, gps, size, types, name, note, phone, url, email, openingHours, cb) {

    var check = checkParameters(images, gps, size, types, name, note, phone, url, email, openingHours);

    check.then(function (response) {

      CollectionPoint.app.models.CollectionPointActivity.findOne({where: {collectionPointId: id, lastId: null}, include: [{images: 'imageKeys'}, 'size', 'types', {gps: 'source'}]}, function (err, instance) {

        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        if (!instance) {
          return cb({message: 'CollectionPoint does not exist', status: 404});
        }

        var current = instance.toJSON();

        CollectionPoint.beginTransaction({isolationLevel: CollectionPoint.Transaction.READ_COMMITTED}, function (err, tx) {

          if (err) {
            console.error(err);
            return cb({message: err.detail});
          }

          GeoLocation.upsertGps(response.lat, response.long, response.accuracy, response.gpsSourceId).then(function (gpsId) {

            if (err) {
              console.error(err);
              return cb({message: err.detail});
            }

            var data = {
              status: response.status,
              gpsId: gpsId,
              collectionPointId: id,
              userId: CollectionPoint.app.models.BaseModel.user.id,
              collectionPointSizeId: response.collectionPointSizeId,
              name: response.name,
              note: response.note,
              phone: response.phone,
              url: url,
              email: response.email,
              openingHours: response.openingHours
            };

            CollectionPoint.app.models.CollectionPointActivity.create(data, {transaction: tx}, function (err, responseCollectionPointActivity) {

              if (err) {
                console.error(err);
                return cb({message: err.detail});
              }

              CollectionPoint.app.models.CollectionPointActivity.updateAll({collectionPointId: id, id: {neq: responseCollectionPointActivity.id}}, {lastId: responseCollectionPointActivity.id}, {transaction: tx}, function (err) {

                if (err) {
                  console.error(err);
                  return cb({message: err.detail});
                }

                var p1, p2, p3 = Promise.defer(), p4;

                var cpTypes = [];
                response.collectionPointTypeIds.forEach(function (collectionPointTypeId) {
                  cpTypes.push({collectionPointTypeId: collectionPointTypeId, collectionPointActivityId: responseCollectionPointActivity.id});
                });

                p1 = CollectionPoint.app.models.CollectionPointActivityHasCollectionPointType.create(cpTypes, {transaction: tx}, function (err) {

                  if (err) {
                    console.error(err);
                    return cb({message: err.detail});
                  }

                });

                if (response.images) {
                  response.images.map(function(img) {
                    delete img.id;
                  });

                  p2 = CollectionPoint.app.models.Image.create(response.images, {transaction: tx}, function (err, responseImage) {

                    if (err) {
                      console.error(err);
                      return cb({message: err.detail});
                    }

                    var collectionPointImages = [];
                    responseImage.forEach(function (image) {
                      collectionPointImages.push({imageId: image.id, collectionPointActivityId: responseCollectionPointActivity.id});
                    });

                    p3 = CollectionPoint.app.models.CollectionPointActivityHasImage.create(collectionPointImages, {transaction: tx}, function (err) {

                      if (err) {
                        console.error(err);
                        return cb({message: err.detail});
                      }

                    });
                  });
                } else {
                  p2 = Promise.resolve();
                  p3 = Promise.resolve();
                }

                p4 = CollectionPoint.app.models.CollectionPointActivity.updateAll({id: current.id}, {changed: createCollectionPointDiff(current, response)}, {transaction: tx}, function (err) {

                  if (err) {
                    console.error(err);
                    return cb({message: err.detail});
                  }

                });

                Promise.all([p1, p2, p3, p4]).then(function () {

                  tx.commit(function (err) {

                    if (err) {
                      console.error(err);
                      return cb({message: err.detail});
                    }

                    cb(null, id, responseCollectionPointActivity.id, 200);
                  });

                }).catch(function (error) {
                  return cb(error);
                });

              });

            });


          }).catch(function (error) {
            return cb(error);
          });

        });

      });

    }).catch(function (error) {
      return cb(error);
    });
  };

  CollectionPoint.disableRemoteMethod('create', true); // Removes (POST) /collection-point
  CollectionPoint.disableRemoteMethod('upsert', true); // Removes (PUT) /collection-point/:id
  CollectionPoint.disableRemoteMethod('find', true); // Removes (GET) /collection-point
  CollectionPoint.disableRemoteMethod('count', true); // Removes (GET) /collection-point/count
  CollectionPoint.disableRemoteMethod('deleteById', true); // Removes (DELETE) /collection-point/:id

  CollectionPoint.remoteMethod(
    'updateCollectionPoint',
    {
      http: {path: '/:id/', verb: 'put'},
      accepts: [
        {arg: 'id', type: 'number', required: true},
        {arg: 'images', type: 'array', description: 'Array of images'},
        {arg: 'gps', type: 'object', required: true},
        {arg: 'size', type: 'string', required: true},
        {arg: 'types', type: 'object'},
        {arg: 'name', type: 'string'},
        {arg: 'note', type: 'string'},
        {arg: 'phone', type: 'string'},
        {arg: 'url', type: 'string'},        
        {arg: 'email', type: 'string'},
        {arg: 'openingHours', type: 'array'}
      ],
      returns: [
        {arg: 'id', type: 'number'},
        {arg: 'activityId', type: 'number'},
        {arg: 'statusCode', type: 'number'}
      ]

    }
  );

  CollectionPoint.remoteMethod(
    'reportCollectionPoint',
    {
      http: {path: '/', verb: 'post'},
      accepts: [
        {arg: 'images', type: 'array', description: 'Array of images'},
        {arg: 'gps', type: 'object', required: true},
        {arg: 'size', type: 'string', required: true},
        {arg: 'types', type: 'object'},
        {arg: 'name', type: 'string'},
        {arg: 'note', type: 'string'},
        {arg: 'phone', type: 'string'},
        {arg: 'url', type: 'string'},        
        {arg: 'email', type: 'string'},
        {arg: 'openingHours', type: 'array'}
      ],
      returns: [
        {arg: 'id', type: 'number'},
        {arg: 'activityId', type: 'number'},
        {arg: 'statusCode', type: 'number'}
      ]

    }
  );

  CollectionPoint.remoteMethod(
    'getCollectionPoint',
    {
      http: {path: '/:id/', verb: 'get'},
      accepts: {arg: 'id', type: 'number', required: true},
      returns: {type: 'object', root: true}
    }
  );

  CollectionPoint.remoteMethod(
    'deleteCollectionPoint',
    {
      http: {path: '/:id/', verb: 'delete'},
      accepts: {arg: 'id', type: 'number', required: true}
    }
  );

  CollectionPoint.remoteMethod(
    'deleteActivity',
    {
      http: {path: '/activity/:id/', verb: 'delete'},
      accepts: {arg: 'id', type: 'number', required: true}

    }
  );

  CollectionPoint.remoteMethod(
    'deleteActivityImage',
    {
      http: {path: '/activity/:id/images/:imageId', verb: 'delete'},
      accepts: [
        {arg: 'id', type: 'number', required: true},
        {arg: 'imageId', type: 'string'}
      ]
    }
  );

  CollectionPoint.remoteMethod(
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
        {arg: 'spam', type: 'string', description: 'Whether CollectionPoint is marked as spam'},
        {arg: 'unreviewed', type: 'string', description: 'Whether CollectionPoint is marked as unreviewed'},
        {arg: 'timeBoundaryFrom', type: 'string', description: 'Timestamp format "2016-04-12T07:38:33+00:00"'},
        {arg: 'timeBoundaryTo', type: 'string', description: 'Timestamp format "2016-04-12T07:38:33+00:00"'},
        {arg: 'collectionPointSize', type: 'string', description: 'Comma separated sizes - dustbin, scrapyard'},
        {arg: 'collectionPointType', type: 'string', description: 'Comma separated types - "plastic", "metal", "electronic", "deadAnimals", "organic"'},
        {arg: 'collectionPointNote', type: 'string', description: 'Text'},
        {arg: 'collectionPointIds', type: 'string', description: 'Comma separated CollectionPoint identifiers'},
        {arg: 'userIds', type: 'string', description: 'Comma separated user identifiers (users who created report or made actualization)'},
        {arg: 'attributesNeeded', type: 'string', description: 'Comma separated attributes which will be contained in the result. Attributes are "id", "gps", "types", "size", "note", "openingHours", "userId", "images", "updateTime", "updateHistory", "url", "updateNeeded"'},
        {arg: 'orderBy', type: 'string', description: 'Order by'},
        {arg: 'userPosition', type: 'string', description: 'Current GPS position'},
        {arg: 'page', type: 'number', description: 'Page'},
        {arg: 'limit', type: 'number', description: 'Limit'}
      ],
      returns: {type: 'array', root: true}
    }
  );

  CollectionPoint.remoteMethod(
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
        {arg: 'spam', type: 'string', description: 'Whether CollectionPoint is marked as spam'},
        {arg: 'unreviewed', type: 'string', description: 'Whether CollectionPoint is marked as unreviewed'},
        {arg: 'timeBoundaryFrom', type: 'string', description: 'Timestamp format "2016-04-12T07:38:33+00:00"'},
        {arg: 'timeBoundaryTo', type: 'string', description: 'Timestamp format "2016-04-12T07:38:33+00:00"'},
        {arg: 'collectionPointSize', type: 'string', description: 'Comma separated sizes - dustbin, scrapyard'},
        {arg: 'collectionPointType', type: 'string', description: 'Comma separated types - "plastic", "metal", "electronic", "deadAnimals", "organic"'},
        {arg: 'collectionPointNote', type: 'string', description: 'Text'},
        {arg: 'collectionPointIds', type: 'string', description: 'Comma separated CollectionPoint identifiers'},
        {arg: 'userIds', type: 'string', description: 'Comma separated user identifiers (users who created report or made actualization)'}
      ],
      returns: {arg: 'count', type: 'number'}
    }
  );

  CollectionPoint.remoteMethod(
    'zoomPoints',
    {
      http: {path: '/zoom-point/', verb: 'get'},
      accepts: [
        {arg: 'zoomLevel', type: 'number', description: 'Zoom level'},
        {arg: 'geocells', type: 'string', description: 'Comma separated geocells'},
        {arg: 'spam', type: 'string', description: 'Whether CollectionPoint is marked as spam'},
        {arg: 'unreviewed', type: 'string', description: 'Whether CollectionPoint is marked as unreviewed'},
        {arg: 'timeBoundaryFrom', type: 'string', description: 'Timestamp format "2016-04-12T07:38:33+00:00"'},
        {arg: 'timeBoundaryTo', type: 'string', description: 'Timestamp format "2016-04-12T07:38:33+00:00"'},
        {arg: 'collectionPointSize', type: 'string', description: 'Comma separated sizes - dustbin, scrapyard'},
        {arg: 'collectionPointType', type: 'string', description: 'Comma separated types - "plastic", "metal", "electronic", "deadAnimals", "organic"'},
        {arg: 'collectionPointNote', type: 'string', description: 'Text'},
        {arg: 'collectionPointIds', type: 'string', description: 'Comma separated CollectionPoint identifiers'},
        {arg: 'userIds', type: 'string', description: 'Comma separated user identifiers (users who created report or made actualization)'}
      ],
      returns: {type: 'object', root: true}
    }
  );

};
