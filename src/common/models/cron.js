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
var async = require('async');

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

function buildAddress(gpsArea) {
  var address = '';

  var flag = false;
  if (gpsArea.street) {
    flag = true;
    address += gpsArea.street;
  }

  if (gpsArea.subLocality) {
    address += (flag ? ', ' : '') + gpsArea.subLocality;
    flag = true;
  }

  if (gpsArea.zip) {
    address += (flag ? ', ' : '') + gpsArea.zip;
    flag = true;
  }

  if (gpsArea.locality) {
    address += (flag ? ' ' : '') + gpsArea.locality;
    flag = true;
  }

  if (gpsArea.aa3) {
    address += (flag ? ', ' : '') + gpsArea.aa3;
    flag = true;
  }

  if (gpsArea.aa2) {
    address += (flag ? ', ' : '') + gpsArea.aa2;
    flag = true;
  }

  if (gpsArea.aa1) {
    address += (flag ? ', ' : '') + gpsArea.aa1;
    flag = true;
  }

  if (gpsArea.country) {
    address += (flag ? ', ' : '') + gpsArea.country;
    flag = true;
  }

  if (gpsArea.continent) {
    address += (flag ? ', ' : '') + gpsArea.continent;
    flag = true;
  }

  return address;
}

function formatStartDate(date) {
  return date.getUTCDate() + '/' + (date.getUTCMonth() + 1) + '/' + date.getUTCFullYear();
}

function formatStartTime(date) {
  var hours = date.getHours();
  var minutes = date.getMinutes();
  var ampm = hours >= 12 ? 'p.m.' : 'a.m.';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  minutes = minutes < 10 ? '0'+minutes : minutes;
  var strTime = hours + ':' + minutes + ' ' + ampm;
  return strTime;
}

function formatStartUTC(date) {
  var utc = (date.getTimezoneOffset() / 60) + 3;

  return 'UTC' + (utc >= 0 ? ' +' : ' -') + (Math.abs(utc) < 10 ? '0': '') + Math.abs(utc) + ':00';
}

module.exports = function (Cron) {

  /**
   * Stores parameters for parametrized queries and returns parameter number
   *
   * @param {type} parameter
   * @returns {String}
   */
  function sanitize(parameter) {
    return Cron.app.models.BaseModel.sanitize(parameter);
  }

  /**
   *
   * @param number areaId
   * @param date notificationLastSent
   * @returns string
   */
  function getNewActivitiesSQL(areaId, notificationLastSent) {
    var sql = '';

    sql += 'SELECT \n';
    sql += '  CASE WHEN (SELECT row_numbers.row_number FROM (SELECT tpa2.id, row_number() OVER (ORDER BY tpa2.created ASC) AS row_number FROM trash_point_activity tpa2 WHERE tpa2.trash_point_id = tpa.trash_point_id) AS row_numbers WHERE row_numbers.id = tpa.id) = 1 THEN \'create\' ELSE \'update\' END AS action, \n';
    sql += '  tpa.trash_point_id AS id, \n';
    sql += '  tpa.id AS activity_id, \n';
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
    sql += '      JOIN public.trash_point_activity_has_image tpahi ON (tpahi.image_id = i.id AND tpa.id = tpahi.trash_point_activity_id) \n';
    sql += '    ) AS i \n';
    sql += '  )::jsonb AS images, \n';
    sql += '  gps.lat AS gps_lat, \n';
    sql += '  gps.long AS gps_long, \n';
    sql += '  gps.accuracy AS gps_accuracy, \n';
    sql += '  gps_source.name AS gps_source, \n';

    sql += '  CASE WHEN gps.zip_id IS NOT NULL THEN \n';
    sql += '    (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.zip_id) AS a) \n';
    sql += '  WHEN gps.street_id IS NOT NULL THEN \n';
    sql += '    (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.street_id) AS a) \n';
    sql += '  WHEN gps.sub_locality_id IS NOT NULL THEN \n';
    sql += '    (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.sub_locality_id) AS a) \n';
    sql += '  WHEN gps.locality_id IS NOT NULL THEN \n';
    sql += '    (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.locality_id) AS a) \n';
    sql += '  WHEN gps.aa3_id IS NOT NULL THEN \n';
    sql += '    (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.aa3_id) AS a) \n';
    sql += '  WHEN gps.aa2_id IS NOT NULL THEN \n';
    sql += '    (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.aa2_id) AS a) \n';
    sql += '  WHEN gps.aa1_id IS NOT NULL THEN \n';
    sql += '    (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.aa1_id) AS a) \n';
    sql += '  WHEN gps.country_id IS NOT NULL THEN \n';
    sql += '    (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.country_id) AS a) \n';
    sql += '  WHEN gps.continent_id IS NOT NULL THEN \n';
    sql += '    (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.continent_id) AS a) \n';
    sql += '  ELSE \n';
    sql += '    NULL \n';
    sql += '  END AS gps_area, \n';

    sql += '  tpa.note AS note, \n';
    sql += '  tpa.status, \n';
    sql += '  tpa.anonymous, \n';
    sql += '  tpa.cleaned_by_me, \n';
    sql += '  tpa.created, \n';
    sql += '  tpa.user_id, \n';
    sql += '  u.first_name, \n';
    sql += '  u.last_name \n';

    sql += 'FROM public.trash_point_activity tpa \n';
    sql += 'JOIN public.user u ON u.id = tpa.user_id \n';
    sql += 'JOIN public.gps ON gps.id = tpa.gps_id \n';
    sql += 'JOIN public.gps_source ON gps_source.id = gps.gps_source_id \n';

    sql += 'WHERE 1 = 1 \n';

    sql += '  AND ( \n';
    sql += '    gps.zip_id = ' + sanitize(areaId) + ' OR \n';
    sql += '    gps.street_id = ' + sanitize(areaId) + ' OR \n';
    sql += '    gps.sub_locality_id = ' + sanitize(areaId) + ' OR \n';
    sql += '    gps.locality_id = ' + sanitize(areaId) + ' OR \n';
    sql += '    gps.aa3_id = ' + sanitize(areaId) + ' OR \n';
    sql += '    gps.aa2_id = ' + sanitize(areaId) + ' OR \n';
    sql += '    gps.aa1_id = ' + sanitize(areaId) + ' OR \n';
    sql += '    gps.country_id = ' + sanitize(areaId) + ' OR \n';
    sql += '    gps.continent_id = ' + sanitize(areaId) + ' \n';
    sql += '  ) \n';

    sql += '  AND tpa.last_id IS NULL';

    if(notificationLastSent) {
      sql += '  AND tpa.created > ' + sanitize(notificationLastSent) + ' \n';
    }

    sql += '  LIMIT 10';

    return sql;
  }

  /**
   * Retrieves data and sends the newsletter email
   *
   * @param {string} email
   * @param {string} name
   * @param {string} language
   * @param {Object} area
   * @param {string} notificationLastSent
   * @param {number} organizationId
   * @returns void
   */
  function sendNewsletterEmail(email, name, language, area, notificationLastSent, organizationId) {
    var ds = Cron.app.dataSources.trashout;


    Cron.app.models.BaseModel.initSqlParameters();
    var sql = getNewActivitiesSQL(area.id, notificationLastSent);

    Cron.app.models.BaseModel.sqlParameters;

    return new Promise(function (resolve, reject) {
      ds.connector.execute(sql, Cron.app.models.BaseModel.sqlParameters, function (err, activities) {
        if (err) {
          console.error('cron-debug', err);
          return reject(err);
        }

        var created = [];
        var updated = [];
        var cleaned = [];

        activities.forEach(function (instance) {

          var temp = {
            id: instance.id,
            activityId: instance.activity_id,
            images: instance.images,
            note: instance.note,
            status: instance.status,
            cleanedByMe: instance.cleaned_by_me,
            anonymous: instance.anonymous,
            userInfo: {
              id: instance.user_id,
              firstName: instance.first_name,
              lastName: instance.last_name
            },
            address: instance.gps_area && instance.gps_area.length ? buildAddress(instance.gps_area[0]) : null
          };

          if (instance.action === 'create' && instance.status !== Constants.TRASH_STATUS_CLEANED) {
            created.push(temp);
          }

          if (instance.action === 'update' && instance.status !== Constants.TRASH_STATUS_CLEANED) {
            updated.push(temp);
          }

          if (instance.status === Constants.TRASH_STATUS_CLEANED) {
            cleaned.push(temp);
          }

        });

        var params = {
          organizationId: organizationId,
          name: name,
          trashes: {
            created: created,
            updated: updated,
            cleaned: cleaned
          },
          area: buildAddress(area) || area.id
        };

        var headers = {
          to: email,
          subject: emailTranslations[checkLanguage(language)]['mail.newsletter.subject']
        };

        if (!headers.to) {
          return resolve();
        }

        Cron.app.models.BaseModel.sendEmail('newsletter', headers, params, language).then(function () {
          resolve();
        }).catch(function (err) {
          console.error('cron-debug', err);
          return reject(err);
        });

      });

    });
  }

  /**
   * Sends area activity notifications to users
   *
   * @returns void
   */
  function sendNewsletterToUsers() {
    var ds = Cron.app.dataSources.trashout;

    return new Promise(function (resolve, reject) {

      // Select users from database
      var sql = '';
      sql += 'SELECT \n';
      sql += '  u.id, \n';
      sql += '  u.first_name, \n';
      sql += '  u.last_name, \n';
      sql += '  u.email, \n';
      sql += '  u.language, \n';

      sql += '  uha.notification_last_sent, \n';
      sql += '  uha.area_id, \n';

      sql += '  a.continent, \n';
      sql += '  a.country, \n';
      sql += '  a.aa1, \n';
      sql += '  a.aa2, \n';
      sql += '  a.aa3, \n';
      sql += '  a.locality, \n';
      sql += '  a.sub_locality, \n';
      sql += '  a.street, \n';
      sql += '  a.zip \n';

      sql += 'FROM public.user_has_area uha \n';
      sql += 'JOIN public.user u ON u.id = uha.user_id \n';
      sql += 'JOIN public.area a ON a.id = uha.area_id \n';

      sql += 'WHERE ( (NOW() - uha.notification_last_sent) > (uha.notification_frequency * INTERVAL \'1 seconds\') AND uha.notification_frequency > 0 ) OR (uha.notification_last_sent IS NULL AND uha.notification_frequency > 0) ORDER BY uha.notification_last_sent NULLS LAST';

      var lastSentCondition = {or: []};
      ds.connector.execute(sql, Cron.app.models.BaseModel.sqlParameters, function (err, instances) {
        if (err) {
          console.error('cron-debug', err);
          return reject(err);
        }

        async.eachSeries(instances, function (instance, callback) {
          var area = {
            id: instance.area_id,
            continent: instance.continent,
            country: instance.country,
            aa1: instance.aa1,
            aa2: instance.aa2,
            aa3: instance.aa3,
            locality: instance.locality,
            subLocality: instance.sub_locality,
            street: instance.street,
            zip: instance.zip
          };

          // Send newsletter to each user
          sendNewsletterEmail(instance.email, instance.first_name, instance.language, area, instance.notification_last_sent).then(function () {
            lastSentCondition.or.push({and: [{areaId: area.id}, {userId: instance.id}]});
            async.setImmediate(callback);
          }).catch(function (error) {
            if (lastSentCondition.or.length) {
              Cron.app.models.UserHasArea.updateAll(lastSentCondition, {notificationLastSent: (new Date()).toISOString()}, function (err) {
                if (err) {
                  console.error('cron-debug', err);
                  return reject(err);
                }

                console.error('cron-debug', error);
                reject(error);
              });
            } else {
              console.error('cron-debug', err);
              reject(err);
            }
          });
        }, function (err) {
          if (err) {
            console.error('cron-debug', err);
            reject(err);
          }

          if (lastSentCondition.or.length) {
            Cron.app.models.UserHasArea.updateAll(lastSentCondition, {notificationLastSent: (new Date()).toISOString()}, function (err) {
              if (err) {
                console.error('cron-debug', err);
                return reject(err);
              }

              resolve();
            });
          }
        });
      });

    });
  }

  /**
   * Sends area activity notifications to organizations
   *
   * @returns void
   */
  function sendNewsletterToOrganizations() {
    var ds = Cron.app.dataSources.trashout;

    return new Promise(function (resolve, reject) {

      // Select organizations from database
      var sql = '';
      sql += 'SELECT \n';
      sql += '  o.id, \n';
      sql += '  o.name, \n';
      sql += '  o.contact_email, \n';
      sql += '  o.language, \n';

      sql += '  oha.notification_last_sent, \n';
      sql += '  oha.area_id, \n';

      sql += '  a.continent, \n';
      sql += '  a.country, \n';
      sql += '  a.aa1, \n';
      sql += '  a.aa2, \n';
      sql += '  a.aa3, \n';
      sql += '  a.locality, \n';
      sql += '  a.sub_locality, \n';
      sql += '  a.street, \n';
      sql += '  a.zip \n';

      sql += 'FROM public.organization_has_area oha \n';
      sql += 'JOIN public.organization o ON o.id = oha.organization_id \n';
      sql += 'JOIN public.area a ON a.id = oha.area_id \n';

      sql += 'WHERE ( (NOW() - oha.notification_last_sent) > (oha.notification_frequency * INTERVAL \'1 seconds\') AND oha.notification_frequency > 0 ) OR (oha.notification_last_sent IS NULL AND oha.notification_frequency > 0) ORDER BY oha.notification_last_sent NULLS LAST';

      var lastSentCondition = {or: []};
      ds.connector.execute(sql, Cron.app.models.BaseModel.sqlParameters, function (err, instances) {
        if (err) {
          console.error('cron-debug', err);
          return reject(err);
        }

        async.eachSeries(instances, function (instance, callback) {
          var area = {
            id: instance.area_id,
            continent: instance.continent,
            country: instance.country,
            aa1: instance.aa1,
            aa2: instance.aa2,
            aa3: instance.aa3,
            locality: instance.locality,
            subLocality: instance.sub_locality,
            street: instance.street,
            zip: instance.zip
          };

          // Send newsletter to each organization
          sendNewsletterEmail(instance.contact_email, instance.name, instance.language, area, instance.notification_last_sent, instance.id).then(function () {
            lastSentCondition.or.push({and: [{areaId: area.id}, {organizationId: instance.id}]});
            async.setImmediate(callback);
          }).catch(function (error) {
            if (lastSentCondition.or.length) {
              Cron.app.models.OrganizationHasArea.updateAll(lastSentCondition, {notificationLastSent: (new Date()).toISOString()}, function (err) {
                if (err) {
                  console.error('cron-debug', err);
                  return reject(err);
                }

                console.error('cron-debug', error);
                reject(error);
              });
            } else {
              console.error('cron-debug', err);
              reject(err);
            }
          });
        }, function (err) {
          if (err) {
            console.error('cron-debug', err);
            reject(err);
          }

          if (lastSentCondition.or.length) {
            Cron.app.models.OrganizationHasArea.updateAll(lastSentCondition, {notificationLastSent: (new Date()).toISOString()}, function (err) {
              if (err) {
                console.error('cron-debug', err);
                return reject(err);
              }

              resolve();
            });
          }
        });
      });

    });
  }

  /**
   * Sends event confirmations to users that are joined in given events
   * at least one day before the start.
   *
   * @returns void
   */
  function sendEventConfirmations() {
    var ds = Cron.app.dataSources.trashout;

    var sql = '';
    sql += 'SELECT \n';
    sql += '  u.id AS user_id, \n';
    sql += '  u.first_name AS user_first_name, \n';
    sql += '  u.last_name AS user_last_name, \n';
    sql += '  u.email AS user_email, \n';
    sql += '  u.language, \n';

    sql += '  o.id AS organizer_id, \n';
    sql += '  o.first_name AS organizer_first_name, \n';
    sql += '  o.last_name AS organizer_last_name, \n';
    sql += '  o.email AS organizer_email, \n';

    sql += '  e.id AS event_id, \n';
    sql += '  e.name AS event_name, \n';
    sql += '  e.start AS event_start, \n';
    sql += '  e.start_with_local_time_zone AS event_start_with_local_time_zone, \n';

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
    sql += '  END AS gps_area \n';

    sql += 'FROM public.event e \n';

    sql += 'JOIN public.user_has_event uhe ON uhe.event_id = e.id \n';
    sql += 'JOIN public.user u ON u.id = uhe.user_id \n';
    sql += 'LEFT JOIN public.user o ON o.id = e.user_id \n';

    sql += 'JOIN public.gps ON gps.id = e.gps_id \n';
    sql += 'JOIN public.gps_source ON gps_source.id = gps.gps_source_id \n';
    sql += 'LEFT JOIN public.area continent ON continent.id = gps.continent_id \n';
    sql += 'LEFT JOIN public.area country ON country.id = gps.country_id \n';
    sql += 'LEFT JOIN public.area aa1 ON aa1.id = gps.aa1_id \n';
    sql += 'LEFT JOIN public.area aa2 ON aa2.id = gps.aa2_id \n';
    sql += 'LEFT JOIN public.area aa3 ON aa3.id = gps.aa3_id \n';
    sql += 'LEFT JOIN public.area locality ON locality.id = gps.locality_id \n';
    sql += 'LEFT JOIN public.area sub_locality ON sub_locality.id = gps.sub_locality_id \n';
    sql += 'LEFT JOIN public.area street ON street.id = gps.street_id \n';
    sql += 'LEFT JOIN public.area zip ON zip.id = gps.zip_id \n';

    sql += 'WHERE e.start <= (CURRENT_DATE + INTERVAL \'2 days\') AND e.start >= (CURRENT_DATE + INTERVAL \'1 days\') AND u.email IS NOT NULL AND uhe.confirmation_notification_sent IS NULL';

    return new Promise(function (resolve, reject) {

      var lastSentCondition = {or: []};
      ds.connector.execute(sql, Cron.app.models.BaseModel.sqlParameters, function (err, instances) {
        if (err) {
          console.error('cron-debug', err);
          return reject(err);
        }

        async.eachSeries(instances, function (instance, callback) {
          var params = {
            user: {
              id: instance.user_id,
              firstName: instance.user_first_name,
              lastName: instance.user_last_name,
              email: instance.user_email
            },
            organizer: {
              id: instance.organizer_id,
              firstName: instance.organizer_first_name,
              lastName: instance.organizer_last_name,
              email : instance.organizer_email
            },
            event: {
              id: instance.event_id,
              name: instance.event_name,
              startDate: formatStartDate(instance.event_start_with_local_time_zone ? new Date(instance.event_start_with_local_time_zone) : instance.event_start),
              startTime: formatStartTime(instance.event_start_with_local_time_zone ? new Date(instance.event_start_with_local_time_zone) : instance.event_start),
              startUTC: formatStartUTC(instance.event_start),
              address: instance.gps_area && instance.gps_area.length ? buildAddress(instance.gps_area[0]) : null
            }
          };

          var headers = {
            to: instance.user_email,
            subject: emailTranslations[checkLanguage(instance.language)]['mail.eventConfirm.subject']
          };

          if (!headers.to) {
            return resolve();
          }

          Cron.app.models.BaseModel.sendEmail('event-confirm', headers, params, instance.language).then(function () {
            lastSentCondition.or.push({and: [{eventId: params.event.id}, {userId: params.user.id}]});
            async.setImmediate(callback);
          }).catch(function (err) {
            console.error('cron-debug', err);
            return reject(err);
          });

        }, function (err) {
          if (err) {
            console.error('cron-debug', err);
            reject(err);
          }

          if (lastSentCondition.or.length) {
            Cron.app.models.UserHasEvent.updateAll(lastSentCondition, {confirmationNotificationSent: (new Date()).toISOString()}, function (err) {
              if (err) {
                console.error('cron-debug', err);
                return reject(err);
              }

              resolve();
            });
          }
        });
      });
    });
  }

  /**
   * Sends event feedback emails to all the users that were joined in
   * given events right after the events are over. It doesn't matter whether
   * they confirmed their attendance.
   *
   * @returns void
   */
  function sendEventFeedbacks() {
    var ds = Cron.app.dataSources.trashout;

    var sql = '';
    sql += 'SELECT \n';
    sql += '  u.id AS user_id, \n';
    sql += '  u.first_name AS user_first_name, \n';
    sql += '  u.last_name AS user_last_name, \n';
    sql += '  u.email AS user_email, \n';
    sql += '  u.language, \n';

    sql += '  o.id AS organizer_id, \n';
    sql += '  o.first_name AS organizer_first_name, \n';
    sql += '  o.last_name AS organizer_last_name, \n';
    sql += '  o.email AS organizer_email, \n';

    sql += '  e.id AS event_id, \n';
    sql += '  e.name AS event_name, \n';
    sql += '  e.start AS event_start \n';

    sql += 'FROM public.event e \n';

    sql += 'JOIN public.user_has_event uhe ON uhe.event_id = e.id \n';
    sql += 'JOIN public.user u ON u.id = uhe.user_id \n';
    sql += 'LEFT JOIN public.user o ON o.id = e.user_id \n';

    sql += 'WHERE e.start >= (CURRENT_DATE - INTERVAL \'2 days\') AND e.start <= (CURRENT_DATE - INTERVAL \'1 days\') AND u.email IS NOT NULL AND uhe.feedback_notification_sent IS NULL';

    return new Promise(function (resolve, reject) {

      var lastSentCondition = {or: []};
      ds.connector.execute(sql, Cron.app.models.BaseModel.sqlParameters, function (err, instances) {
        if (err) {
          console.error('cron-debug', err);
          return reject(err);
        }

        async.eachSeries(instances, function (instance, callback) {
          var params = {
            user: {
              id: instance.user_id,
              firstName: instance.user_first_name,
              lastName: instance.user_last_name,
              email: instance.user_email
            },
            organizer: {
              id: instance.organizer_id,
              firstName: instance.organizer_first_name,
              lastName: instance.organizer_last_name,
              email : instance.organizer_email
            },
            event: {
              id: instance.event_id,
              name: instance.event_name
            }
          };

          var headers = {
            to: instance.user_email,
            subject: emailTranslations[checkLanguage(instance.language)]['mail.eventFeedback.subject']
          };

          if (!headers.to) {
            return resolve();
          }

          Cron.app.models.BaseModel.sendEmail('event-feedback', headers, params, instance.language).then(function () {
            lastSentCondition.or.push({and: [{eventId: params.event.id}, {userId: params.user.id}]});
            async.setImmediate(callback);
          }).catch(function (err) {
            console.error('cron-debug', err);
            return reject(err);
          });

        }, function (err) {
          if (err) {
            console.error('cron-debug', err);
            reject(err);
          }

          if (lastSentCondition.or.length) {
            Cron.app.models.UserHasEvent.updateAll(lastSentCondition, {feedbackNotificationSent: (new Date()).toISOString()}, function (err) {
              if (err) {
                console.error('cron-debug', err);
                return reject(err);
              }

              resolve();
            });
          }
        });
      });
    });
  }

  /**
   *
   * @param {String} hash
   * @param {Function} cb
   * @returns String
   */
  Cron.daily = function (hash, cb) {
    var newsletterToUsers = sendNewsletterToUsers();
    var newsletterToOrganizations = sendNewsletterToOrganizations();
    var eventConfirmations = sendEventConfirmations();
    var eventFeedbacks = sendEventFeedbacks();

    Promise.all([
      newsletterToUsers,
      newsletterToOrganizations,
      eventConfirmations,
      eventFeedbacks
    ]).then(function () {

      console.log('cron-debug', 'Cron.daily finished');
      cb(null, hash);

    }).catch(function (error) {
      console.error('cron-debug', error);
      return cb(error);
    });
  };

  Cron.remoteMethod(
    'daily',
    {
      http: {path: '/daily/', verb: 'get'},
      accepts: [
        {arg: 'hash', type: 'string', desription: 'Hash'}
      ],
      returns: {type: 'object', root: true}
    }
  );

};
