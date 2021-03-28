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
//var messageManager = require('../firebase-message-manager');

var emailTranslations = {
  'cs_CZ': require(__dirname + '/../../data/localization/cs.json'),
  'de_DE': require(__dirname + '/../../data/localization/de.json'),
  'en_US': require(__dirname + '/../../data/localization/en.json'),
  'es_ES': require(__dirname + '/../../data/localization/es.json'),
  'ru_RU': require(__dirname + '/../../data/localization/ru.json'),
  'sk_SK': require(__dirname + '/../../data/localization/sk.json')
};

function checkLanguage(lang) {
  var languages = ['cs_CZ', 'de_DE', 'en_US', 'es_ES', 'ru_RU', 'sk_SK'];

  if (!lang || languages.indexOf(lang) === -1) {
    lang = 'en_US';
  }

  return lang;
}

/**
 *
 * @param {Mixed} param
 * @returns {Mixed}
 */
var checkNull = function (param) {
  return param === "null" ? null : param;
};

/**
 * Returns identifiers of Images for deletation and insertation
 *
 * @param {Object} currentImages
 * @param {Object} newImages
 * @returns {Object}
 */
function checkImageChanges(currentImages, newImages) {
  var toInsert = [];
  var toDelete = [];

  var skipNewImages = [];
  currentImages.forEach(function (cImage) {
    var found = false;
    newImages.forEach(function (nImage, index) {
      if (cImage.imageKeys.fullStorageLocation === nImage.fullStorageLocation &&
              cImage.imageKeys.fullDownloadUrl === nImage.fullDownloadUrl &&
              cImage.imageKeys.thumbDownloadUrl === nImage.thumbDownloadUrl &&
              cImage.imageKeys.thumbStorageLocation === nImage.thumbStorageLocation &&
              cImage.imageKeys.thumbRetinaStorageLocation === nImage.thumbRetinaStorageLocation &&
              cImage.imageKeys.thumbRetinaDownloadUrl === nImage.thumbRetinaDownloadUrl) {
        found = true;
        return;
      }

      if (skipNewImages.indexOf(index) === -1) {
        skipNewImages.push(index);
        toInsert.push(nImage);
      }
    });

    if (!found) {
      toDelete.push(cImage.id);
    }

  });

  return {
    insert: toInsert,
    delete: toDelete
  };
}

module.exports = function (Event) {

  /**
   * Stores parameters for parametrized queries and returns parameter number
   *
   * @param {type} parameter
   * @returns {String}
   */
  function sanitize(parameter) {
    return Event.app.models.BaseModel.sanitize(parameter);
  }

  /**
   * Returns GPS source identifier by name
   *
   * @param {String} name
   * @returns {number}
   */
  function getGPSSourceIdByName(name) {
    return new Promise(function (resolve, reject) {
      Event.app.models.GPSSource.findOne({where: {name: name}}, function (err, instance) {

        if (err) {
          return reject({message: err.detail, status: 403});
        }

        // Check source existence
        if (!instance) {
          return reject({message: 'GPSSource is not valid', status: 404});
        }

        return resolve(instance.id);
      });
    });
  }

  /**
   * Creates SQL [where] clause for SQL query in Event list
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
   * @param {String} startFrom
   * @param {String} startTo
   * @param {String} eventName
   * @param {String} eventDescription
   * @param {String} eventIds
   * @param {String} userIds
   * @returns {String}
   */
  function getEventListFilterWhereClause(area, geocells, geoAreaStreet, geoAreaZip, geoAreaSubLocality, geoAreaLocality, geoAreaAa3, geoAreaAa2, geoAreaAa1, geoAreaCountry, geoAreaContinent, spam, unreviewed, timeBoundaryFrom, timeBoundaryTo, startFrom, startTo, eventName, eventDescription, eventIds, userIds) {
    var sql = '';

    sql += 'WHERE 1 = 1 \n';
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
      sql += ' AND e.id IN (SELECT e.id FROM public.event e JOIN public.gps ON gps.id = e.gps_id JOIN public.area zip ON zip.id = gps.zip_id WHERE zip.zip = ' + sanitize(geoAreaZip) + ') \n';
    }

    if (geoAreaStreet) {
      sql += ' AND e.id IN (SELECT e.id FROM public.event e JOIN public.gps ON gps.id = e.gps_id JOIN public.area street ON street.id = gps.street_id WHERE street.street = ' + sanitize(geoAreaStreet) + ') \n';
    }

    if (geoAreaSubLocality) {
      sql += ' AND e.id IN (SELECT e.id FROM public.event e JOIN public.gps ON gps.id = e.gps_id JOIN public.area sublocality ON sublocality.id = gps.sub_locality_id WHERE sublocality.sub_locality = ' + sanitize(geoAreaSubLocality) + ') \n';
    }

    if (geoAreaLocality) {
      sql += ' AND e.id IN (SELECT e.id FROM public.event e JOIN public.gps ON gps.id = e.gps_id JOIN public.area locality ON locality.id = gps.locality_id WHERE locality.locality = ' + sanitize(geoAreaLocality) + ') \n';
    }

    if (geoAreaAa3) {
      sql += ' AND e.id IN (SELECT e.id FROM public.event e JOIN public.gps ON gps.id = e.gps_id JOIN public.area aa3 ON aa3.id = gps.aa3_id WHERE aa3.aa3 = ' + sanitize(geoAreaAa3) + ') \n';
    }

    if (geoAreaAa2) {
      sql += ' AND e.id IN (SELECT e.id FROM public.event e JOIN public.gps ON gps.id = e.gps_id JOIN public.area aa2 ON aa2.id = gps.aa2_id WHERE aa2.aa2 = ' + sanitize(geoAreaAa2) + ') \n';
    }

    if (geoAreaAa1) {
      sql += ' AND e.id IN (SELECT e.id FROM public.event e JOIN public.gps ON gps.id = e.gps_id JOIN public.area aa1 ON aa1.id = gps.aa1_id WHERE aa1.aa1 = ' + sanitize(geoAreaAa1) + ') \n';
    }

    if (geoAreaCountry) {
      sql += ' AND e.id IN (SELECT e.id FROM public.event e JOIN public.gps ON gps.id = e.gps_id JOIN public.area country ON country.id = gps.country_id WHERE country.country = ' + sanitize(geoAreaCountry) + ') \n';
    }

    if (geoAreaContinent) {
      sql += ' AND e.id IN (SELECT e.id FROM public.event e JOIN public.gps ON gps.id = e.gps_id JOIN public.area continent ON continent.id = gps.continent_id WHERE continent.continent = ' + sanitize(geoAreaContinent) + ') \n';
    }

    switch (spam) {
    case 'true':
    case '1':
      sql += '  AND e.id IN (SELECT DISTINCT(s.event_id) FROM public.spam s) \n';
      break;
    case 'false':
    case '0':
      // There must be at least one record in table spam
      sql += '  AND e.id NOT IN (SELECT DISTINCT(e.event_id) FROM public.spam s WHERE) \n';
      break;
    }

    switch (unreviewed) {
    case 'true':
    case '1':
      sql += '  AND e.reviewed IS NULL \n';
      break;
    case 'false':
    case '0':
      sql += '  AND e.reviewed IS NOT NULL \n';
      break;
    }

    if (timeBoundaryFrom) {
      sql += '  AND e.created >= ' + sanitize(timeBoundaryFrom.replace(' ', '+')) + ' \n';
    }

    if (timeBoundaryTo) {
      sql += '  AND e.created <= ' + sanitize(timeBoundaryTo.replace(' ', '+')) + ' \n';
    }

    if (startFrom) {
      sql += '  AND e.start >= ' + sanitize(startFrom.replace(' ', '+')) + ' \n';
    }

    if (startTo) {
      sql += '  AND e.start <= ' + sanitize(startTo.replace(' ', '+')) + ' \n';
    }

    if (eventName) {
      sql += '  AND e.name ILIKE ' + sanitize('%' + eventName + '%') + ' \n';
    }

    if (eventDescription) {
      sql += '  AND e.description ILIKE ' + sanitize('%' + eventDescription + '%') + ' \n';
    }

    if (eventIds) {
      sql += '  AND e.id IN (' + sanitize(eventIds.split(',').map(Number).filter(Boolean)) + ') \n';
    }

    if (userIds) {
      sql += '  AND e.user_id IN (' + sanitize(userIds.split(',').map(Number).filter(Boolean)) + ') \n';
    }

    return sql;
  }

  /**
   * Creates SQL query for Event count
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
   * @param {String} startFrom
   * @param {String} startTo
   * @param {String} eventName
   * @param {String} eventDescription
   * @param {String} eventIds
   * @param {String} userIds
   * @returns {String}
   */
  function getEventListCountSQL(area, geocells, geoAreaStreet, geoAreaZip, geoAreaSubLocality, geoAreaLocality, geoAreaAa3, geoAreaAa2, geoAreaAa1, geoAreaCountry, geoAreaContinent, spam, unreviewed, timeBoundaryFrom, timeBoundaryTo, startFrom, startTo, eventName, eventDescription, eventIds, userIds) {
    var sql = 'SELECT COUNT (a.id) AS count \n';
    sql += 'FROM ( \n';

    sql += '  SELECT e.id \n';
    sql += '  FROM public.event e \n';

    if (area || geocells) {
      sql += '  JOIN public.gps ON gps.id = e.gps_id \n';
    }

    sql += getEventListFilterWhereClause(area, geocells, geoAreaStreet, geoAreaZip, geoAreaSubLocality, geoAreaLocality, geoAreaAa3, geoAreaAa2, geoAreaAa1, geoAreaCountry, geoAreaContinent, spam, unreviewed, timeBoundaryFrom, timeBoundaryTo, startFrom, startTo, eventName, eventDescription, eventIds, userIds);

    sql += ') AS a \n';

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
   * @param {String} startFrom
   * @param {String} startTo
   * @param {String} eventName
   * @param {String} eventDescription
   * @param {String} eventIds
   * @param {String} userIds
   * @param {String} orderBy
   * @param {String} userPosition
   * @param {Number} page
   * @param {Number} limit
   * @returns {String}
   */
  function getEventListSQL(attributes, area, geocells, geoAreaStreet, geoAreaZip, geoAreaSubLocality, geoAreaLocality, geoAreaAa3, geoAreaAa2, geoAreaAa1, geoAreaCountry, geoAreaContinent, spam, unreviewed, timeBoundaryFrom, timeBoundaryTo, startFrom, startTo, eventName, eventDescription, eventIds, userIds, orderBy, userPosition, page, limit) {

    var sql = '';
    sql += 'SELECT \n';
    if (attributes.indexOf(Constants.EVENT_ATTR_ID) > -1) {
      sql += '  e.id AS id, \n';
    }

    if (attributes.indexOf(Constants.EVENT_ATTR_IMAGES) > -1) {
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
      sql += '      JOIN public.event_has_image ehi ON (ehi.image_id = i.id AND e.id = ehi.event_id) \n';
      sql += '    ) AS i \n';
      sql += '  ) AS images, \n';
    }

    var safeOrderByUserPosition = false;
    if (attributes.indexOf(Constants.EVENT_ATTR_GPS_SHORT) > -1 || attributes.indexOf(Constants.EVENT_ATTR_GPS_FULL) > -1) {
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

    if (attributes.indexOf(Constants.EVENT_ATTR_GPS_FULL) > -1) {
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

    if (attributes.indexOf(Constants.EVENT_ATTR_CLEANING_AREA) > -1) {
      sql += '  CASE WHEN e.cleaning_area_upper_left_gps_id IS NOT NULL THEN \n';
      sql += '    (SELECT array_to_json(array_agg(a)) FROM (SELECT cgps.lat, cgps.long, cgps.accuracy, cgpss.name AS source FROM gps cgps JOIN public.gps_source cgpss ON cgpss.id = cgps.gps_source_id WHERE cgps.id = e.cleaning_area_upper_left_gps_id) AS a) \n';
      sql += '  END AS cleaning_area_upper_left, \n';

      sql += '  CASE WHEN e.cleaning_area_bottom_right_gps_id IS NOT NULL THEN \n';
      sql += '    (SELECT array_to_json(array_agg(a)) FROM (SELECT cgps.lat, cgps.long, cgps.accuracy, cgpss.name AS source FROM gps cgps JOIN public.gps_source cgpss ON cgpss.id = cgps.gps_source_id WHERE cgps.id = e.cleaning_area_bottom_right_gps_id) AS a) \n';
      sql += '  END AS cleaning_area_bottom_right, \n';
    }

    if (attributes.indexOf(Constants.EVENT_ATTR_USER_INFO) > -1) {
      sql += '  u.id AS user_info_id, \n';
      sql += '  u.first_name AS user_info_first_name, \n';
      sql += '  u.last_name AS user_info_last_name, \n';
    }

    if (attributes.indexOf(Constants.EVENT_ATTR_NAME) > -1) {
      sql += '  e.name AS name, \n';
    }

    if (attributes.indexOf(Constants.EVENT_ATTR_DESCRIPTION) > -1) {
      sql += '  e.description AS description, \n';
    }

    if (attributes.indexOf(Constants.EVENT_ATTR_START) > -1) {
      sql += '  e.start AS start, \n';
      sql += '  e.start_with_local_time_zone AS start_with_time_zone, \n';
    }

    if (attributes.indexOf(Constants.EVENT_ATTR_DURATION) > -1) {
      sql += '  e.duration_in_minute AS duration, \n';
    }

    if (attributes.indexOf(Constants.EVENT_ATTR_BRING) > -1) {
      sql += '  e.bring AS bring, \n';
    }

    if (attributes.indexOf(Constants.EVENT_ATTR_HAVE) > -1) {
      sql += '  e.have AS have, \n';
    }

    if (attributes.indexOf(Constants.EVENT_ATTR_CHILD_FRIENDLY) > -1) {
      sql += '  e.child_friendly AS child_friendly, \n';
    }

    if (attributes.indexOf(Constants.EVENT_ATTR_CONTACT) > -1) {
      sql += '  e.contact_phone, \n';
      sql += '  e.contact_email, \n';
      sql += '  e.contact_name, \n';
      sql += '  e.contact_occupation, \n';
    }

    if (attributes.indexOf(Constants.EVENT_ATTR_CREATED) > -1) {
      sql += '  e.created, \n';
    }

    if (attributes.indexOf(Constants.EVENT_ATTR_SPAM) > -1) {
      sql += '  CASE WHEN e.id IN (SELECT DISTINCT(s.event_id) FROM public.spam s) THEN true ELSE false END AS spam, \n';
    }

    if (attributes.indexOf(Constants.EVENT_ATTR_UNREVIEWED) > -1) {
      sql += '  CASE WHEN e.reviewed IS NOT NULL THEN false ELSE true END AS unreviewed, \n';
    }

    if (attributes.indexOf(Constants.EVENT_ATTR_TRASH_POINT_IDS) > -1) {
      sql += '  ARRAY(SELECT tphe.trash_point_id FROM public.trash_point_has_event tphe WHERE tphe.event_id = e.id) AS trash_point_ids, \n';
    }

    if (attributes.indexOf(Constants.EVENT_ATTR_COLLECTION_POINT_IDS) > -1) {
      sql += '  ARRAY(SELECT cphe.collection_point_id FROM public.collection_point_has_event cphe WHERE cphe.event_id = e.id) AS collection_point_ids, \n';
    }

    sql += '\'last_column_fix\' AS last_column_fix \n';

    sql += 'FROM public.event e \n';

    if (attributes.indexOf(Constants.EVENT_ATTR_GPS_SHORT) > -1 || attributes.indexOf(Constants.EVENT_ATTR_GPS_FULL) > -1 || area || geocells) {
      sql += 'JOIN public.gps ON gps.id = e.gps_id \n';
      sql += 'JOIN public.gps_source ON gps_source.id = gps.gps_source_id \n';
    }

    if (attributes.indexOf(Constants.EVENT_ATTR_GPS_FULL) > -1) {
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
      sql += 'JOIN public.user u ON u.id = e.user_id \n';
    }

    sql += getEventListFilterWhereClause(area, geocells, geoAreaStreet, geoAreaZip, geoAreaSubLocality, geoAreaLocality, geoAreaAa3, geoAreaAa2, geoAreaAa1, geoAreaCountry, geoAreaContinent, spam, unreviewed, timeBoundaryFrom, timeBoundaryTo, startFrom, startTo, eventName, eventDescription, eventIds, userIds);

    if (orderBy) {
      var order = [];
      orderBy.split(',').forEach(function (str) {
        var column = str.substr(0, 1) === '-' ? str.substr(1) : str;
        var trend = str.substr(0, 1) === '-' ? ' DESC' : ' ASC';

        switch (column) {
        case Constants.EVENT_ORDER_BY_ID:
        case Constants.EVENT_ORDER_BY_NAME:
        case Constants.EVENT_ORDER_BY_DESCRIPTION:
        case Constants.EVENT_ORDER_BY_REVIEWED:
        case Constants.EVENT_ORDER_BY_CREATED:
        case Constants.EVENT_ORDER_BY_START:
          order.push('e.' + column + trend);
          break;
        case Constants.EVENT_ORDER_BY_GPS:
          if (safeOrderByUserPosition) {
            order.push('closest ASC');
          }
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

    return sql;
  }

  /**
   * Check input parameter
   *
   * @param {Array} images
   * @param {String} name
   * @param {Object} gps
   * @param {Object} cleaningArea
   * @param {String} description
   * @param {Timestamp} start
   * @param {String} startWithTimeZone
   * @param {Integer} duration
   * @param {String} bring
   * @param {String} have
   * @param {Boolean} childFriendly
   * @param {Object} contact
   * @param {Array} trashPointIds
   * @param {Array} collectionPointIds
   * @returns {Object}
   */
  function checkParameters(images, name, gps, cleaningArea, description, start, startWithTimeZone, duration, bring, have, childFriendly, contact, trashPointIds, collectionPointIds) {
    return new Promise(function (resolve, reject) {

      if (!name) {
        return reject({message: 'Name of the event must be provided', status: 404});
      }

      if (!gps || gps.lat === undefined || gps.long === undefined || gps.accuracy === undefined || !gps.source) {
        return reject({message: 'GPS object is not valid', status: 404});
      }

      if (!start || !((new Date(start)).getTime() > 0)) {
        return reject({message: 'Start time is not valid', status: 404});
      }

      if (!duration) {
        return reject({message: 'Duration must be provided', status: 404});
      }

      if (!contact || !contact.email || !contact.phone) {
        return reject({message: 'Contact information (email and phone) must be provided', status: 404});
      }

      // Get GPS source id for given name
      var gpsSourceIdPromise = getGPSSourceIdByName(gps.source);

      var cleaningAreaGpsSourceId1;
      var cleaningAreaGpsSourceId2;
      if (cleaningArea && cleaningArea.upperLeft && cleaningArea.bottomRight) {
        cleaningAreaGpsSourceId1 = getGPSSourceIdByName(cleaningArea.upperLeft.source);
        cleaningAreaGpsSourceId2 = getGPSSourceIdByName(cleaningArea.bottomRight.source);
      } else {
        cleaningAreaGpsSourceId1 = Promise.resolve();
        cleaningAreaGpsSourceId2 = Promise.resolve();
      }

      Promise.all([gpsSourceIdPromise, cleaningAreaGpsSourceId1, cleaningAreaGpsSourceId2]).then(function (response) {

        if (response[1] && response[2]) {
          cleaningArea.upperLeft.gpsSourceId = response[1];
          cleaningArea.bottomRight.gpsSourceId = response[2];
        } else {
          cleaningArea = null;
        }

        resolve({
          images: images || [],
          name: name,
          lat: gps.lat,
          long: gps.long,
          accuracy: gps.accuracy,
          gpsSourceId: response[0],
          cleaningArea: cleaningArea,
          description: description,
          start: start,
          startWithTimeZone: startWithTimeZone,
          duration: duration,
          bring: bring,
          have: have,
          childFriendly: childFriendly === undefined ? null : childFriendly,
          contactEmail: contact.email,
          contactPhone: contact.phone,
          contactName: contact.name,
          contactOccupation: contact.occupation,
          trashPointIds: trashPointIds || [],
          collectionPointIds: collectionPointIds || []
        });

      }).catch(function (error) {
        return reject(error);
      });

    });
  }

  /**
   * Returns count of Events that matches given conditions
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
   * @param {String} startFrom
   * @param {String} startTo
   * @param {String} eventName
   * @param {String} eventDescription
   * @param {String} eventIds
   * @param {String} userIds
   * @param {Function} cb
   * @returns {Object}
   */
  Event.listCount = function (area, geocells, geoAreaStreet, geoAreaZip, geoAreaSubLocality, geoAreaLocality, geoAreaAa3, geoAreaAa2, geoAreaAa1, geoAreaCountry, geoAreaContinent, spam, unreviewed, timeBoundaryFrom, timeBoundaryTo, startFrom, startTo, eventName, eventDescription, eventIds, userIds, cb) {
    var ds = Event.app.dataSources.trashout;

    var sql = getEventListCountSQL(area, geocells, geoAreaStreet, geoAreaZip, geoAreaSubLocality, geoAreaLocality, geoAreaAa3, geoAreaAa2, geoAreaAa1, geoAreaCountry, geoAreaContinent, spam, unreviewed, timeBoundaryFrom, timeBoundaryTo, startFrom, startTo, eventName, eventDescription, eventIds, userIds);

    ds.connector.execute(sql, Event.app.models.BaseModel.sqlParameters, function (err, instance) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      cb(null, Number(instance[0].count));
    });
  };

  /**
   * Returns array of Events matching given conditions
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
   * @param {String} startFrom
   * @param {String} startTo
   * @param {String} eventName
   * @param {String} eventDescription
   * @param {String} eventIds
   * @param {String} userIds
   * @param {String} attributesNeeded
   * @param {String} orderBy
   * @param {String} userPosition
   * @param {Number} page
   * @param {Number} limit
   * @param {Function} cb
   * @returns {Array}
   */
  Event.list = function (area, geocells, geoAreaStreet, geoAreaZip, geoAreaSubLocality, geoAreaLocality, geoAreaAa3, geoAreaAa2, geoAreaAa1, geoAreaCountry, geoAreaContinent, spam, unreviewed, timeBoundaryFrom, timeBoundaryTo, startFrom, startTo, eventName, eventDescription, eventIds, userIds, attributesNeeded, orderBy, userPosition, page, limit, cb) {
    var ds = Event.app.dataSources.trashout;

    var attributes = [];
    if (attributesNeeded && attributesNeeded.length) {
      attributesNeeded.split(',').forEach(function (attribute) {
        if (Constants.EVENT_ALLOWED_ATTRIBUTES.indexOf(attribute) > -1) {
          attributes.push(attribute);
        }
      });
    }

    if (!attributes.length) {
      return cb({message: 'At least one attribute in attributeNeed parameter must be set', status: 403});
    }

    var sql = getEventListSQL(attributes, area, geocells, geoAreaStreet, geoAreaZip, geoAreaSubLocality, geoAreaLocality, geoAreaAa3, geoAreaAa2, geoAreaAa1, geoAreaCountry, geoAreaContinent, spam, unreviewed, timeBoundaryFrom, timeBoundaryTo, startFrom, startTo, eventName, eventDescription, eventIds, userIds, orderBy, userPosition, page, limit);

    ds.connector.execute(sql, Event.app.models.BaseModel.sqlParameters, function (err, instances) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      var result = [];
      instances.forEach(function (instance) {

        var temp = {};

        if (attributes.indexOf(Constants.EVENT_ATTR_ID) > -1) {
          temp.id = Number(instance.id);
        }

        if (attributes.indexOf(Constants.EVENT_ATTR_IMAGES) > -1) {
          temp.images = instance.images;
        }

        if (attributes.indexOf(Constants.EVENT_ATTR_GPS_SHORT) > -1 || attributes.indexOf(Constants.EVENT_ATTR_GPS_FULL) > -1) {
          temp.gps = {
            lat: instance.gps_lat,
            long: instance.gps_long,
            accuracy: instance.gps_accuracy,
            source: instance.gps_source,
            area: instance.gps_area
          };
        }

        if (attributes.indexOf(Constants.EVENT_ATTR_USER_INFO) > -1) {
          temp.userInfo = {
            id: instance.user_info_id,
            firstName: instance.user_info_first_name,
            lastName: instance.user_info_last_name
          };
        }

        if (attributes.indexOf(Constants.EVENT_ATTR_NAME) > -1) {
          temp.name = instance.name;
        }

        if (attributes.indexOf(Constants.EVENT_ATTR_DESCRIPTION) > -1) {
          temp.description = instance.description;
        }

        if (attributes.indexOf(Constants.TRASH_ATTR_CREATED) > -1) {
          temp.created = instance.created;
        }

        if (attributes.indexOf(Constants.TRASH_ATTR_SPAM) > -1) {
          temp.spam = instance.spam;
        }

        if (attributes.indexOf(Constants.TRASH_ATTR_UNREVIEWED) > -1) {
          temp.unreviewed = instance.unreviewed;
        }

        if (attributes.indexOf(Constants.EVENT_ATTR_CLEANING_AREA) > -1) {
          var cleaningArea = null;
          if (instance.cleaning_area_upper_left && instance.cleaning_area_bottom_right) {
            cleaningArea = {
              upperLeft: instance.cleaning_area_upper_left,
              bottomRight: instance.cleaning_area_bottom_right
            };
          }

          temp.cleaningArea = cleaningArea;
        }

        if (attributes.indexOf(Constants.EVENT_ATTR_START) > -1) {
          temp.start = instance.start;
          temp.startWithTimeZone = instance.start_with_time_zone || instance.start.toIsoString();
        }

        if (attributes.indexOf(Constants.EVENT_ATTR_DURATION) > -1) {
          temp.duration = instance.duration;
        }

        if (attributes.indexOf(Constants.EVENT_ATTR_BRING) > -1) {
          temp.bring = instance.bring;
        }

        if (attributes.indexOf(Constants.EVENT_ATTR_HAVE) > -1) {
          temp.have = instance.have;
        }

        if (attributes.indexOf(Constants.EVENT_ATTR_CHILD_FRIENDLY) > -1) {
          temp.childFriendly = instance.child_friendly;
        }

        if (attributes.indexOf(Constants.EVENT_ATTR_CONTACT) > -1) {
          temp.contact = {
            email: instance.contact_email,
            phone: instance.contact_phone,
            name: instance.contact_name,
            occupation: instance.contact_occupation
          };
        }

        if (attributes.indexOf(Constants.EVENT_ATTR_TRASH_POINT_IDS) > -1) {
          temp.trashPointIds = instance.trash_point_ids.map(Number);
        }

        if (attributes.indexOf(Constants.EVENT_ATTR_COLLECTION_POINT_IDS) > -1) {
          temp.collectionPointIds = instance.collection_point_ids.map(Number);
        }

        if (attributes.indexOf(Constants.TRASH_ATTR_SPAM) > -1) {
          temp.spam = instance.spam;
        }

        if (attributes.indexOf(Constants.TRASH_ATTR_UNREVIEWED) > -1) {
          temp.unreviewed = instance.unreviewed;
        }

        result.push(temp);
      });

      cb(null, result);
    });
  };

  /**
   * Returns Event detail
   *
   * @param {Number} id
   * @param {Function} cb
   * @returns {Object}
   */
  Event.getEvent = function (id, cb) {
    var filter = {
      include: [
        {
          trashPoints: [{
            relation: 'activities',
            scope: {
              where: {
                lastId: null
              },
              include: ['size', 'types', {images: 'imageKeys'}, {gps: ['source', 'continent', 'country', 'aa1', 'aa2', 'aa3', 'locality', 'subLocality', 'street', 'zip']}]
            }
          }]
        },
        {relation: 'collectionPoints', scope: {fields: ['id']}},
        {
          gps: ['source', 'continent', 'country', 'aa1', 'aa2', 'aa3', 'locality', 'subLocality', 'street', 'zip']
        },
        {images: 'imageKeys'},
        'users',
        {cleaningAreaUpperLeft: ['source']},
        {cleaningAreaBottomRight: ['source']}
      ]
    };

    Event.findById(id, filter, function (err, instance) {

      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      if (!instance) {
        return cb({message: 'Event does not exist', status: 404});
      }

      var current = instance.toJSON();

      var images = [];
      current.images.forEach(function (image) {
        images.push(image.imageKeys);
      });

      var trashPoints = [];
      if (current.trashPoints) {
        current.trashPoints.forEach(function (trashPoint) {
          var trashPointImages = [];
          if (trashPoint.activities[0].images) {
            trashPoint.activities[0].images.forEach(function (image) {
              trashPointImages.push(image.imageKeys);
            });
          }

          var trashPointTypes = [];
          if (trashPoint.activities[0].types) {
            trashPoint.activities[0].types.forEach(function (type) {
              trashPointTypes.push(type.name);
            });
          }

          var updateNeeded = false;
          if (trashPoint.activities[0].status !== Constants.TRASH_STATUS_CLEANED) {
            var date = new Date();
            updateNeeded = ((date.getTime() - trashPoint.activities[0].created.getTime()) / (24 * 60 * 60 * 1000)) > Constants.TRASH_UPDATE_NEEDED_DAYS;
          }

          trashPoints.push({
            id: trashPoint.activities[0].trashPointId,
            activityId: trashPoint.activities[0].id,
            size: trashPoint.activities[0].size.name,
            gps: {
              lat: trashPoint.activities[0].gps.lat,
              long: trashPoint.activities[0].gps.long,
              accuracy: trashPoint.activities[0].gps.accuracy,
              source: trashPoint.activities[0].gps.source.name,
              area: trashPoint.activities[0].gps.zip || trashPoint.activities[0].gps.street || trashPoint.activities[0].gps.subLocality || trashPoint.activities[0].gps.locality || trashPoint.activities[0].gps.aa3 || trashPoint.activities[0].gps.aa2 || trashPoint.activities[0].gps.aa1 || trashPoint.activities[0].gps.country || trashPoint.activities[0].gps.continent || {}
            },
            status: trashPoint.activities[0].status,
            images: trashPointImages,
            types: trashPointTypes,
            created: trashPoint.activities[0].created,
            updateNeeded: updateNeeded
          });
        });
      }

      var collectionPointIds = [];
      current.collectionPoints.forEach(function (collectionPoint) {
        collectionPointIds.push(collectionPoint.id);
      });

      var cleaningArea = null;
      if (current.cleaningAreaUpperLeft && current.cleaningAreaBottomRight) {
        cleaningArea = {
          upperLeft: {
            lat: current.cleaningAreaUpperLeft.lat,
            long: current.cleaningAreaUpperLeft.long,
            accuracy: current.cleaningAreaUpperLeft.accuracy,
            source: current.cleaningAreaUpperLeft.source.name
          },
          bottomRight: {
            lat: current.cleaningAreaBottomRight.lat,
            long: current.cleaningAreaBottomRight.long,
            accuracy: current.cleaningAreaBottomRight.accuracy,
            source: current.cleaningAreaBottomRight.source.name
          }
        };
      }

      var result = {
        id: current.id,
        images: images,
        name: current.name,
        gps: {
          lat: current.gps.lat,
          long: current.gps.long,
          accuracy: current.gps.accuracy,
          source: current.gps.source.name,
          area: current.gps.zip || current.gps.street || current.gps.subLocality || current.gps.locality || current.gps.aa3 || current.gps.aa2 || current.gps.aa1 || current.gps.country || current.gps.continent || {}
        },
        cleaningArea: cleaningArea,
        description: current.description,
        start: current.start,
        startWithTimeZone: current.startWithTimeZone || current.start.toIsoString(),
        duration: current.duration,
        bring: current.bring,
        have: current.have,
        childFriendly: current.childFriendly,
        contact: {
          email: current.contactEmail,
          phone: current.contactPhone,
          name: current.contactName,
          occupation: current.contactOccupation
        },
        created: current.created,
        trashPoints: trashPoints,
        collectionPointIds: collectionPointIds,
        userId: current.userId,
        users: current.users
      };

      cb(null, result);

    });
  };

  /**
   * Deletes Event detail
   *
   * @param {Number} id
   * @param {Function} cb
   */
  Event.deleteEvent = function (id, cb) {
    Event.beginTransaction({isolationLevel: Event.Transaction.READ_COMMITTED}, function (err, tx) {

      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      Event.findById(id, {include: [{
        gps: ['source', 'continent', 'country', 'aa1', 'aa2', 'aa3', 'locality', 'subLocality', 'street', 'zip']
      }]}, {transaction: tx}, function (err, instance) {

        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        if (!instance) {
          return cb({message: 'Event does not exist', status: 404});
        }

        if (instance.userId == Event.app.models.BaseModel.user.id || Event.app.models.BaseModel.user.userRole.code === Constants.USER_ROLE_SUPER_ADMIN) {
          Event.destroyAll({id: id}, {transaction: tx}, function (err) {

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
        } else {
          return cb({message: 'Only super admin or creator is allowed to delete event.', status: 403});
        }

      });
    });
  };

  /**
   * Updates Event
   *
   * @param {Number} id
   * @param {Object} images
   * @param {String} name
   * @param {Object} gps
   * @param {Object} cleaningArea
   * @param {String} description
   * @param {Timestamp} start
   * @param {String} startWithTimeZone
   * @param {Number} duration
   * @param {String} bring
   * @param {String} have
   * @param {Boolean} childFriendly
   * @param {Object} contact
   * @param {Array} trashPointIds
   * @param {Array} collectionPointIds
   * @param {Function} cb
   * @returns {Object}
   */
  Event.updateEvent = function (id, images, name, gps, cleaningArea, description, start, startWithTimeZone, duration, bring, have, childFriendly, contact, trashPointIds, collectionPointIds, cb) {

    var check = checkParameters(images, name, gps, cleaningArea, description, start, startWithTimeZone, duration, bring, have, childFriendly, contact, trashPointIds, collectionPointIds);

    check.then(function (response) {
      var filter = {
        include: [
          {relation: 'trashPoints', scope: {fields: ['id']}},
          {relation: 'collectionPoints', scope: {fields: ['id']}},
          {images: 'imageKeys'}
        ]
      };

      Event.findById(id, filter, function (err, instance) {

        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        if (!instance) {
          return cb({message: 'Event does not exist', status: 404});
        }

        if (instance.userId != Event.app.models.BaseModel.user.id && Event.app.models.BaseModel.user.userRole.code !== Constants.USER_ROLE_SUPER_ADMIN && Event.app.models.BaseModel.user.userRole.code !== Constants.USER_ROLE_ADMIN) {
          return cb({message: 'Only admin or owner is allowed to edit event.', status: 403});
        }

        var current = instance.toJSON();
        GeoLocation.upsertGps(response.lat, response.long, response.accuracy, response.gpsSourceId).then(function (gpsId) {

          var data = {
            name: response.name,
            gpsId: gpsId,
            description: response.description,
            start: response.start,
            startWithTimeZone: response.startWithTimeZone,
            duration: response.duration,
            bring: response.bring,
            have: response.have,
            childFriendly: checkNull(response.childFriendly),
            contactEmail: response.contactEmail,
            contactPhone: response.contactPhone,
            contactName: response.contactName,
            contactOccupation: response.contactOccupation
          };

          var ca1, ca2;

          // We need to create GPS for cleaning area (upper left point and bottom right point) if its provided
          if (response.cleaningArea) {
            var upperLeft = response.cleaningArea.upperLeft;
            var bottomRight = response.cleaningArea.bottomRight;

            ca1 = GeoLocation.upsertGps(upperLeft.lat, upperLeft.long, upperLeft.accuracy, upperLeft.gpsSourceId);
            ca2 = GeoLocation.upsertGps(bottomRight.lat, bottomRight.long, bottomRight.accuracy, bottomRight.gpsSourceId);
          } else {
            ca1 = Promise.resolve();
            ca2 = Promise.resolve();
          }

          Promise.all([ca1, ca2]).then(function (cleaningAreaResponse) {

            if (cleaningAreaResponse[0] && cleaningAreaResponse[1]) {
              data.cleaningAreaUpperLeftGpsId = cleaningAreaResponse[0];
              data.cleaningAreaBottomRightGpsId = cleaningAreaResponse[1];
            }

            Event.beginTransaction({isolationLevel: Event.Transaction.READ_COMMITTED}, function (err, tx) {

              if (err) {
                console.error(err);
                return cb({message: err.detail});
              }

              var p1 = Event.updateAll({id: id}, data, {transaction: tx}, function (err) {
                if (err) {
                  console.error(err);
                  return cb({message: err.detail});
                }
              });

              // Update TrashPoint relations
              var currentTrashPointIds = [];
              current.trashPoints.forEach(function (trashPoint) {
                currentTrashPointIds.push(trashPoint.id);
              });

              var trashPointsToInsert = response.trashPointIds.diff(currentTrashPointIds);
              var trashPointsToDelete = currentTrashPointIds.diff(response.trashPointIds);

              var trashPointHasEventRelationsInsert = [];
              trashPointsToInsert.forEach(function (trashPointId) {
                trashPointHasEventRelationsInsert.push({trashPointId: trashPointId, eventId: id});
              });

              var trashPointHasEventRelationsDelete = {
                trashPointId: {
                  inq: trashPointsToDelete
                },
                eventId: id
              };

              var p2, p3;

              if (trashPointHasEventRelationsInsert.length) {
                p2 = Event.app.models.TrashPointHasEvent.create(trashPointHasEventRelationsInsert, {transaction: tx}, function (err) {
                  if (err) {
                    var message = [];
                    err.forEach(function (e) {
                      if (e.detail) {
                        message.push(e.detail);
                      }
                    });
                    console.error(err);
                    return cb({message: message, status: 404});
                  }
                });
              } else {
                p2 = Promise.resolve();
              }

              if (trashPointHasEventRelationsDelete.trashPointId.inq.length) {
                p3 = Event.app.models.TrashPointHasEvent.destroyAll(trashPointHasEventRelationsDelete, {transaction: tx}, function (err) {
                  if (err) {
                    console.error(err);
                    return cb({message: err.detail});
                  }
                });
              } else {
                p3 = Promise.resolve();
              }

              // Update CollectionPoint relations
              var currentCollectionPointIds = [];
              current.collectionPoints.forEach(function (collectionPoint) {
                currentCollectionPointIds.push(collectionPoint.id);
              });

              var collectionPointsToInsert = response.collectionPointIds.diff(currentCollectionPointIds);
              var collectionPointsToDelete = currentCollectionPointIds.diff(response.collectionPointIds);

              var collectionPointHasEventRelationsInsert = [];
              collectionPointsToInsert.forEach(function (collectionPointId) {
                collectionPointHasEventRelationsInsert.push({collectionPointId: collectionPointId, eventId: id});
              });

              var collectionPointHasEventRelationsDelete = {
                collectionPointId: {
                  inq: collectionPointsToDelete
                },
                eventId: id
              };

              var p4, p5;

              if (collectionPointHasEventRelationsInsert.length) {
                p4 = Event.app.models.CollectionPointHasEvent.create(collectionPointHasEventRelationsInsert, {transaction: tx}, function (err) {
                  if (err) {
                    var message = [];
                    err.forEach(function (e) {
                      if (e.detail) {
                        message.push(e.detail);
                      }
                    });
                    console.error(err);
                    return cb({message: message, status: 404});
                  }
                });
              } else {
                p4 = Promise.resolve();
              }

              if (collectionPointHasEventRelationsDelete.collectionPointId.inq.length) {
                p5 = Event.app.models.CollectionPointHasEvent.destroyAll(collectionPointHasEventRelationsDelete, {transaction: tx}, function (err) {
                  if (err) {
                    console.error(err);
                    return cb({message: err.detail});
                  }
                });
              } else {
                p5 = Promise.resolve();
              }

              // Update images
              var p6, p7, p8;
              var imageChanges = checkImageChanges(current.images, response.images);
              if (imageChanges.insert.length) {
                p6 = Event.app.models.Image.create(imageChanges.insert, {transaction: tx}, function (err, responseImage) {
                  if (err) {
                    console.error(err);
                    return cb({message: err.detail});
                  }

                  var eventImages = [];
                  responseImage.forEach(function (image) {
                    eventImages.push({imageId: image.id, eventId: instance.id});
                  });

                  p7 = Event.app.models.EventHasImage.create(eventImages, {transaction: tx}, function (err) {
                    if (err) {
                      console.error(err);
                      return cb({message: err.detail});
                    }
                  });
                });
              } else {
                p6 = Promise.resolve();
                p7 = Promise.resolve();
              }

              if (imageChanges.delete.length) {
                p8 = Event.app.models.EventHasImage.destroyAll({id: {inq: imageChanges.delete}}, {transaction: tx}, function (err) {
                  if (err) {
                    console.error(err);
                    return cb({message: err.detail});
                  }
                });
              } else {
                p8 = Promise.resolve();
              }

              Promise.all([p1, p2, p3, p4, p5, p6, p7, p8]).then(function () {

                tx.commit(function (err) {

                  if (err) {
                    console.error(err);
                    return cb({message: err.detail});
                  }

                  cb(null, instance.id, 200);

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
   * Creates Event
   *
   * @param {Object} images
   * @param {String} name
   * @param {Object} gps
   * @param {Object} cleaningArea
   * @param {String} description
   * @param {Number} start
   * @param {String} startWithTimeZone
   * @param {Number} duration
   * @param {String} bring
   * @param {String} have
   * @param {Boolean} childFriendly
   * @param {Object} contact
   * @param {Array} trashPointIds
   * @param {Array} collectionPointIds
   * @param {Function} cb
   * @returns {Object}
   */
  Event.createEvent = function (images, name, gps, cleaningArea, description, start, startWithTimeZone, duration, bring, have, childFriendly, contact, trashPointIds, collectionPointIds, cb) {

    var check = checkParameters(images, name, gps, cleaningArea, description, start, startWithTimeZone, duration, bring, have, childFriendly, contact, trashPointIds, collectionPointIds);

    check.then(function (response) {

      GeoLocation.upsertGps(response.lat, response.long, response.accuracy, response.gpsSourceId).then(function (gpsId) {

        var data = {
          name: response.name,
          gpsId: gpsId,
          description: response.description,
          start: response.start,
          startWithTimeZone: response.startWithTimeZone,
          duration: response.duration,
          bring: response.bring,
          have: response.have,
          childFriendly: response.childFriendly,
          contactEmail: response.contactEmail,
          contactPhone: response.contactPhone,
          contactName: response.contactName,
          contactOccupation: response.contactOccupation,
          userId: Event.app.models.BaseModel.user.id
        };

        var ca1, ca2;

        // We need to create GPS for cleaning area (upper left point and bottom right point) if its provided
        if (response.cleaningArea) {
          var upperLeft = response.cleaningArea.upperLeft;
          var bottomRight = response.cleaningArea.bottomRight;

          ca1 = GeoLocation.upsertGps(upperLeft.lat, upperLeft.long, upperLeft.accuracy, upperLeft.gpsSourceId);
          ca2 = GeoLocation.upsertGps(bottomRight.lat, bottomRight.long, bottomRight.accuracy, bottomRight.gpsSourceId);
        } else {
          ca1 = Promise.resolve();
          ca2 = Promise.resolve();
        }

        Promise.all([ca1, ca2]).then(function (cleaningAreaResponse) {

          if (cleaningAreaResponse[0] && cleaningAreaResponse[1]) {
            data.cleaningAreaUpperLeftGpsId = cleaningAreaResponse[0];
            data.cleaningAreaBottomRightGpsId = cleaningAreaResponse[1];
          }

          Event.beginTransaction({isolationLevel: Event.Transaction.READ_COMMITTED}, function (err, tx) {
            if (err) {
              console.error(err);
              return cb({message: err.detail});
            }

            Event.create(data, function (err, instance) {
              if (err) {
                console.error(err);
                return cb({message: err.detail});
              }

              var trashPointHasEventRelations = [];
              response.trashPointIds.forEach(function (trashPointId) {
                trashPointHasEventRelations.push({trashPointId: trashPointId, eventId: instance.id});
              });

              var p1;
              if (trashPointHasEventRelations.length) {
                p1 = Event.app.models.TrashPointHasEvent.create(trashPointHasEventRelations, {transaction: tx}, function (err) {
                  if (err) {
                    var message = [];
                    err.forEach(function (e) {
                      if (e.detail) {
                        message.push(e.detail);
                      }
                    });
                    console.error(err);
                    return cb({message: message, status: 404});
                  }
                });
              } else {
                p1 = Promise.resolve();
              }

              var collectionPointHasEventRelations = [];
              response.collectionPointIds.forEach(function (collectionPointId) {
                collectionPointHasEventRelations.push({collectionPointId: collectionPointId, eventId: instance.id});
              });

              var p2;
              if (collectionPointHasEventRelations.length) {
                p2 = Event.app.models.CollectionPointHasEvent.create(collectionPointHasEventRelations, {transaction: tx}, function (err) {
                  if (err) {
                    var message = [];
                    err.forEach(function (e) {
                      if (e.detail) {
                        message.push(e.detail);
                      }
                    });
                    console.error(err);
                    return cb({message: message, status: 404});
                  }
                });
              } else {
                p2 = Promise.resolve();
              }

              var p3, p4;
              if (response.images) {
                p3 = Event.app.models.Image.create(response.images, {transaction: tx}, function (err, responseImage) {
                  if (err) {
                    console.error(err);
                    return cb({message: err.detail});
                  }

                  var eventImages = [];
                  responseImage.forEach(function (image) {
                    eventImages.push({imageId: image.id, eventId: instance.id});
                  });

                  p4 = Event.app.models.EventHasImage.create(eventImages, {transaction: tx}, function (err) {
                    if (err) {
                      console.error(err);
                      return cb({message: err.detail});
                    }
                  });
                });
              } else {
                p3 = Promise.resolve();
                p4 = Promise.resolve();
              }

              Promise.all([p1, p2, p3, p4]).then(function () {

                tx.commit(function (err) {
                  if (err) {
                    console.error(err);
                    return cb({message: err.detail});
                  }

                  var headers = {
                    to: Event.app.models.BaseModel.user.email,
                    subject: emailTranslations[checkLanguage(Event.app.models.BaseModel.user.language)]['mail.eventCreate.subject']
                  };

                  var params = {
                    event: instance,
                    user: Event.app.models.BaseModel.user
                  };

                  Event.app.models.BaseModel.sendEmail('event-create', headers, params, Event.app.models.BaseModel.user.language).then(function () {
                    cb(null, instance.id, 200);
                  }).catch(function () {
                    cb(null, instance.id, 200);
                  });

                });

              }).catch(function (error) {
                console.error(error);
                return cb(error);
              });

            });
          });

        }).catch(function (error) {
          console.error(error);
          return cb(error);
        });

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
   * If logged user is admin, then joins given users to event
   * else joins current user to event
   *
   * @param {Number} id
   * @param {Array} userIds
   * @param {Function} cb
   * @returns {Number}
   */
  Event.joinUsersToEvent = function (id, userIds, cb) {
    var data = [];

    if (Event.app.models.BaseModel.user.userRole.code === Constants.USER_ROLE_SUPER_ADMIN) {
      // Only superAdmin can join other users
      if (userIds.length) {
        userIds.forEach(function (userId) {
          data.push({eventId: id, userId: userId});
        });
      } else {
        // superAdmin didn't provide other users to add - lets add him
        data.push({eventId: id, userId: Event.app.models.BaseModel.user.id});
      }
    } else {
      // User is not superAdmin, add him
      data.push({eventId: id, userId: Event.app.models.BaseModel.user.id});
    }

    Event.app.models.UserHasEvent.create(data, function (err) {

      if (err) {
        console.error(err);

        var message = [];
        err.forEach(function (e) {
          message.push(e.detail);
        });

        return cb({message: message});
      }

      cb(null, 200);

    });
  };

  /**
   *
   * @param {type} id
   * @param {type} cb
   * @returns {Array}
   */
  Event.getUsersInEvent = function (id, cb) {
    Event.app.models.UserHasEvent.find({where: {eventId: id}, include: ['user']}, function (err, instances) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      cb(null, instances);
    });
  };

  /**
   *
   * @param {type} id
   * @param {type} cb
   * @returns {Array}
   */
  Event.getUsersInEventCount = function (id, cb) {
    Event.app.models.UserHasEvent.count({eventId: id}, function (err, count) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      cb(null, count);
    });
  };

  /**
   * Updates given user in event
   * - confirm user in event
   * - feedback from event (guest count, trash count)
   *
   * @param {Number} id
   * @param {Number} userId
   * @param {Boolean} confirmed
   * @param {Number} feedbackGuessGuestCount
   * @param {Number} feedbackGuessTrashCount
   * @param {Function} cb
   * @returns {Number}
   */
  Event.updateUserInEvent = function (id, userId, confirmed, feedbackGuessGuestCount, feedbackGuessTrashCount, cb) {
    if (Event.app.models.BaseModel.user.id !== userId && Event.app.models.BaseModel.user.userRole.code !== Constants.USER_ROLE_SUPER_ADMIN) {
      return cb({message: 'Only admin or user himself is allowed to update user in event.', status: 403});
    }

    var data = {};

    if (confirmed) {
      data.confirmed = (new Date()).toISOString();
    }

    if (feedbackGuessGuestCount !== undefined) {
      data.feedbackGuessGuestCount = feedbackGuessGuestCount;
    }

    if (feedbackGuessTrashCount !== undefined) {
      data.feedbackGuessGuestCount = feedbackGuessTrashCount;
    }

    Event.app.models.UserHasEvent.updateAll({userId: userId, eventId: id}, data, function (err) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      cb(null, 200);
    });
  };

  /**
   * Confirm user in event
   *
   * @param {Number} id
   * @param {Function} cb
   * @returns {Number}
   */
  Event.confirmUserInEvent = function (id, cb) {

    var filter = {
      userId: Event.app.models.BaseModel.user.id,
      eventId: id
    };

    var data = {
      confirmed: (new Date()).toISOString()
    };

    Event.app.models.UserHasEvent.updateAll(filter, data, function (err) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      cb(null, 200);
    });
  };

  /**
   * Confirm user in event
   *
   * @param {Number} id
   * @param {Function} cb
   * @returns {Number}
   */
  Event.declineUserInEvent = function (id, cb) {

    var filter = {
      userId: Event.app.models.BaseModel.user.id,
      eventId: id
    };

    var data = {
      declined: (new Date()).toISOString()
    };

    Event.app.models.UserHasEvent.updateAll(filter, data, function (err) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      cb(null, 200);
    });
  };

  /**
   * Feedback from event (guest count, trash count)
   *
   * @param {Number} id
   * @param {Number} feedbackGuessGuestCount
   * @param {Number} feedbackGuessTrashCount
   * @param {Function} cb
   * @returns {Number}
   */
  Event.feedback = function (id, feedbackGuessGuestCount, feedbackGuessTrashCount, cb) {
    var filter = {
      userId: Event.app.models.BaseModel.user.id,
      eventId: id
    };

    var data = {};

    if (feedbackGuessGuestCount !== undefined) {
      data.feedbackGuessGuestCount = feedbackGuessGuestCount;
    }

    if (feedbackGuessTrashCount !== undefined) {
      data.feedbackGuessTrashCount = feedbackGuessTrashCount;
    }

    Event.app.models.UserHasEvent.updateAll(filter, data, function (err, result) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      if (result.count) {
        cb(null, 200);
      } else {
        cb({message: 'Event creators and users who has not attended the event cannot send feedback', status: 403});
      }
    });
  };

  /**
   *
   * @param {Number} id
   * @param {Array} images
   * @param {Function} cb
   * @returns {Number}
   */
  Event.addImage = function (id, images, cb) {

    if (!images.length) {
      return cb({message: 'Provide at least one image', status: 404});
    }

    Event.beginTransaction({isolationLevel: Event.Transaction.READ_COMMITTED}, function (err, tx) {

      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      Event.findById(id, function (err, instance) {

        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        if (!instance) {
          return cb({message: 'Event does not exist', status: 404});
        }

        Event.app.models.Image.create(images, {transaction: tx}, function (err, responseImage) {

          if (err) {
            console.error(err);
            return cb({message: err.detail});
          }

          var eventImages = [];
          responseImage.forEach(function (image) {
            eventImages.push({imageId: image.id, eventId: id});
          });

          Event.app.models.EventHasImage.create(eventImages, {transaction: tx}, function (err) {

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

      });

    });

  };

  /**
   * Deletes user from event
   *
   * @param {Number} id
   * @param {userId} userId
   * @param {Function} cb
   */
  Event.deleteUserFromEvent = function (id, userId, cb) {
    if (Event.app.models.BaseModel.user.id !== userId && Event.app.models.BaseModel.user.userRole.code !== Constants.USER_ROLE_SUPER_ADMIN) {
      return cb({message: 'Only admin or user himself is allowed to delete user from event.', status: 403});
    }

    Event.app.models.UserHasEvent.destroyAll({userId: userId, eventId: id}, function (err) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      cb(null);
    });
  };

  Event.disableRemoteMethod('create', true); // Removes (POST) /event
  Event.disableRemoteMethod('upsert', true); // Removes (PUT) /event/:id
  Event.disableRemoteMethod('find', true); // Removes (GET) /event
  Event.disableRemoteMethod('count', true); // Removes (GET) /event/count
  Event.disableRemoteMethod('deleteById', true); // Removes (DELETE) /event/:id
  Event.disableRemoteMethod('__destroyById__users', false); // DELETE
  Event.disableRemoteMethod('__updateById__users', false); // PUT
  Event.disableRemoteMethod('__create__users', false); // POST
  Event.disableRemoteMethod('__get__users', false); // GET
  Event.disableRemoteMethod('__get__users__count', false); // GET

  Event.remoteMethod(
    'deleteEvent',
    {
      http: {path: '/:id/', verb: 'delete'},
      accepts: {arg: 'id', type: 'number', required: true}
    }
  );

  Event.remoteMethod(
    'updateEvent',
    {
      http: {path: '/:id/', verb: 'put'},
      accepts: [
        {arg: 'id', type: 'number', required: true},
        {arg: 'images', type: 'array', description: 'Array of images'},
        {arg: 'name', type: 'string', required: true},
        {arg: 'gps', type: 'object'},
        {arg: 'cleaningArea', type: 'object'},
        {arg: 'description', type: 'string'},
        {arg: 'start', type: 'string', required: true},
        {arg: 'startWithTimeZone', type: 'string'},
        {arg: 'duration', type: 'number'},
        {arg: 'bring', type: 'string'},
        {arg: 'have', type: 'string'},
        {arg: 'childFriendly', type: 'string'},
        {arg: 'contact', type: 'object', required: true},
        {arg: 'trashPointIds', type: 'array'},
        {arg: 'collectionPointIds', type: 'array'}
      ],
      returns: [
        {arg: 'id', type: 'number'},
        {arg: 'statusCode', type: 'number'}
      ]
    }
  );

  Event.remoteMethod(
    'createEvent',
    {
      http: {path: '/', verb: 'post'},
      accepts: [
        {arg: 'images', type: 'array', description: 'Array of images'},
        {arg: 'name', type: 'string', required: true},
        {arg: 'gps', type: 'object', required: true},
        {arg: 'cleaningArea', type: 'object'},
        {arg: 'description', type: 'string'},
        {arg: 'start', type: 'string', required: true},
        {arg: 'startWithTimeZone', type: 'string'},
        {arg: 'duration', type: 'number'},
        {arg: 'bring', type: 'string'},
        {arg: 'have', type: 'string'},
        {arg: 'childFriendly', type: 'string'},
        {arg: 'contact', type: 'object', required: true},
        {arg: 'trashPointIds', type: 'array'},
        {arg: 'collectionPointIds', type: 'array'}
      ],
      returns: [
        {arg: 'id', type: 'number'},
        {arg: 'statusCode', type: 'number'}
      ]
    }
  );

  Event.remoteMethod(
    'getEvent',
    {
      http: {path: '/:id/', verb: 'get'},
      accepts: {arg: 'id', type: 'number', required: true},
      returns: {type: 'object', root: true}
    }
  );

  Event.remoteMethod(
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
        {arg: 'startFrom', type: 'string', description: 'Timestamp format "2016-04-12T07:38:33+00:00"'},
        {arg: 'startTo', type: 'string', description: 'Timestamp format "2016-04-12T07:38:33+00:00"'},
        {arg: 'eventName', type: 'string', description: 'Name'},
        {arg: 'eventDescription', type: 'string', description: 'Text'},
        {arg: 'eventIds', type: 'string', description: 'Comma separated event identifiers'},
        {arg: 'userIds', type: 'string', description: 'Comma separated user identifiers'},
        {arg: 'attributesNeeded', type: 'string', description: 'Comma separated attributes which will be contained in the result. Attributes are "id", "name", "gps", "images", "description", "bring", "have" "geographicArea", "start", "duration", "contact", "childFriendly"'},
        {arg: 'orderBy', type: 'string', description: 'Order by'},
        {arg: 'userPosition', type: 'string', description: 'Current GPS position'},
        {arg: 'page', type: 'number', description: 'Page'},
        {arg: 'limit', type: 'number', description: 'Page'}
      ],
      returns: {type: 'array', root: true}
    }
  );

  Event.remoteMethod(
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
        {arg: 'startFrom', type: 'string', description: 'Timestamp format "2016-04-12T07:38:33+00:00"'},
        {arg: 'startTo', type: 'string', description: 'Timestamp format "2016-04-12T07:38:33+00:00"'},
        {arg: 'eventName', type: 'string', description: 'Name'},
        {arg: 'eventDescription', type: 'string', description: 'Text'},
        {arg: 'eventIds', type: 'string', description: 'Comma separated event identifiers'},
        {arg: 'userIds', type: 'string', description: 'Comma separated user identifiers'}
      ],
      returns: {arg: 'count', type: 'number'}
    }
  );

  Event.remoteMethod(
    'getUsersInEvent',
    {
      http: {path: '/:id/users', verb: 'get'},
      accepts: [
        {arg: 'id', type: 'number', required: true}
      ],
      returns: {type: 'array', root: true}
    }
  );

  Event.remoteMethod(
    'getUsersInEventCount',
    {
      http: {path: '/:id/users/count', verb: 'get'},
      accepts: [
        {arg: 'id', type: 'number', required: true}
      ],
      returns: {arg: 'count', type: 'number'}
    }
  );

  Event.remoteMethod(
    'joinUsersToEvent',
    {
      http: {path: '/:id/users', verb: 'post'},
      accepts: [
        {arg: 'id', type: 'number', required: true},
        {arg: 'userIds', type: 'array'}
      ],
      returns: {arg: 'statusCode', type: 'number'}
    }
  );

  Event.remoteMethod(
    'updateUserInEvent',
    {
      http: {path: '/:id/users/:userId', verb: 'put'},
      accepts: [
        {arg: 'id', type: 'number', required: true},
        {arg: 'userId', type: 'number', required: true},
        {arg: 'confirmed', type: 'boolean'},
        {arg: 'feedbackGuessGuestCount', type: 'number'},
        {arg: 'feedbackGuessTrashCount', type: 'number'}
      ],
      returns: {arg: 'statusCode', type: 'number'}
    }
  );

  Event.remoteMethod(
    'confirmUserInEvent',
    {
      http: {path: '/:id/confirm', verb: 'put'},
      accepts: [
        {arg: 'id', type: 'number', required: true}
      ],
      returns: {arg: 'statusCode', type: 'number'}
    }
  );

  Event.remoteMethod(
    'declineUserInEvent',
    {
      http: {path: '/:id/decline', verb: 'put'},
      accepts: [
        {arg: 'id', type: 'number', required: true}
      ],
      returns: {arg: 'statusCode', type: 'number'}
    }
  );

  Event.remoteMethod(
    'feedback',
    {
      http: {path: '/:id/feedback', verb: 'put'},
      accepts: [
        {arg: 'id', type: 'number', required: true},
        {arg: 'feedbackGuessGuestCount', type: 'number'},
        {arg: 'feedbackGuessTrashCount', type: 'number'}
      ],
      returns: {arg: 'statusCode', type: 'number'}
    }
  );

  Event.remoteMethod(
    'deleteUserFromEvent',
    {
      http: {path: '/:id/users/:userId', verb: 'delete'},
      accepts: [
        {arg: 'id', type: 'number', required: true},
        {arg: 'userId', type: 'number', required: true}
      ]
    }
  );

  Event.remoteMethod(
    'addImage',
    {
      http: {path: '/:id/add-images', verb: 'post'},
      accepts: [
        {arg: 'id', type: 'number', required: true},
        {arg: 'images', type: 'array', required: true}
      ]
    }
  );

};
