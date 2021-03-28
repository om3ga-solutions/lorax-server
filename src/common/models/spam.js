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
var AreaAccessControl = require('../area-access-control');

module.exports = function (Spam) {

  /**
   * Stores parameters for parametrized queries and returns parameter number
   * 
   * @param {type} parameter
   * @returns {String}
   */
  function sanitize(parameter) {
    return Spam.app.models.BaseModel.sanitize(parameter);
  }

  /**
   * Creates SQL [where] clause for SQL query in Spam list
   * 
   * @param {String} spamType
   * @param {Object} user
   * @param {String} entityIds Entity ids (TrashPoint, CollectionPoint, Event)
   * @returns {String}
   */
  function getSpamListWhereClause(spamType, user, entityIds) {
    var entityTableName = '';

    var sql = '';

    sql += 'WHERE \n';

    switch (spamType) {
    case Constants.SPAM_TYPE_TRASH_POINT:
      entityTableName = 'trash_point_activity';
      sql += '  1 = 1 \n';

      if (entityIds) {
        sql += ' AND tpa.trash_point_id IN (' + sanitize(entityIds.split(',').map(Number).filter(Boolean)) + ') \n';
      }

      break;
    case Constants.SPAM_TYPE_COLLECTION_POINT:
      entityTableName = 'collection_point_activity';
      sql += '  1 = 1 \n';

      if (entityIds) {
        sql += ' AND cpa.collection_point_id IN (' + sanitize(entityIds.split(',').map(Number).filter(Boolean)) + ') \n';
      }

      sql += ' AND cp.deleted IS NULL \n';

      break;
    case Constants.SPAM_TYPE_TRASH_POINT_ACTIVITY:
      entityTableName = 'trash_point_activity';
      sql += '  s.trash_point_activity_id IS NOT NULL \n';

      if (entityIds) {
        sql += ' AND tpa.trash_point_id IN (' + sanitize(entityIds.split(',').map(Number).filter(Boolean)) + ') \n';
      }

      break;
    case Constants.SPAM_TYPE_COLLECTION_POINT_ACTIVITY:
      entityTableName = 'collection_point_activity';
      sql += '  s.collection_point_activity_id IS NOT NULL \n';

      if (entityIds) {
        sql += ' AND cpa.collection_point_id IN (' + sanitize(entityIds.split(',').map(Number).filter(Boolean)) + ') \n';
      }

      sql += ' AND cp.deleted IS NULL \n';

      break;
    case Constants.SPAM_TYPE_EVENT:
      entityTableName = 'event';
      sql += '  s.event_id IS NOT NULL \n';

      if (entityIds) {
        sql += ' AND s.event_id IN (' + sanitize(entityIds.split(',').map(Number).filter(Boolean)) + ') \n';
      }

      break;
    }

    if (user.userRole.code !== Constants.USER_ROLE_SUPER_ADMIN) {
      sql += '  AND ( 0 = 1 \n';

      user.userHasArea.forEach(function (area) {
        if (area.userAreaRoleId < Constants.USER_AREA_ROLE_MANAGER_ID) {
          sql += '  OR s.' + entityTableName + '_id IN (\n';
          sql += '    SELECT entity.id \n';
          sql += '    FROM public.' + entityTableName + ' entity \n';
          sql += '    JOIN public.gps ON gps.id = entity.gps_id \n';
          sql += '    WHERE ( \n';
          sql += '      gps.zip_id = ' + sanitize(area.areaId) + ' OR \n';
          sql += '      gps.street_id = ' + sanitize(area.areaId) + ' OR \n';
          sql += '      gps.sub_locality_id = ' + sanitize(area.areaId) + ' OR \n';
          sql += '      gps.locality_id = ' + sanitize(area.areaId) + ' OR \n';
          sql += '      gps.aa3_id = ' + sanitize(area.areaId) + ' OR \n';
          sql += '      gps.aa2_id = ' + sanitize(area.areaId) + ' OR \n';
          sql += '      gps.aa1_id = ' + sanitize(area.areaId) + ' OR \n';
          sql += '      gps.country_id = ' + sanitize(area.areaId) + ' OR \n';
          sql += '      gps.continent_id = ' + sanitize(area.areaId) + ' \n';
          sql += '    ) \n';
          sql += '  ) \n';
        }
      });

      sql += '  ) \n';
    }

    return sql;
  }

  /**
   * Creates SQL query for Spam count
   * 
   * @param {String} spamType
   * @param {Object} user
   * @param {String} entityIds Entity ids (TrashPoint, CollectionPoint, Event)
   * @returns {String}
   */
  function getSpamCountSQL(spamType, user, entityIds) {
    var sql = '';

    sql += 'SELECT COUNT(a.*) AS count \n';
    sql += 'FROM ( \n';

    sql += '  SELECT s.id FROM public.spam s \n';

    switch (spamType) {
    case Constants.SPAM_TYPE_TRASH_POINT_ACTIVITY:
      sql += '  JOIN public.trash_point_activity tpa ON tpa.id = s.trash_point_activity_id \n';

      break;
    case Constants.SPAM_TYPE_COLLECTION_POINT_ACTIVITY:
      sql += '  JOIN public.collection_point_activity cpa ON cpa.id = s.collection_point_activity_id \n';
      sql += '  JOIN public.collection_point cp ON cp.id = cpa.collection_point_id \n';

      break;
    }

    sql += getSpamListWhereClause(spamType, user, entityIds);
    sql += ') AS a \n';

    return sql;
  }

  /**
   * Creates SQL query for Spam list
   * 
   * @param {String} spamType
   * @param {Object} user
   * @param {String} entityIds Entity ids (TrashPoint, CollectionPoint, Event)
   * @param {String} orderBy
   * @param {String} page
   * @param {String} limit
   * @returns {String}
   */
  function getSpamListSQL(spamType, user, entityIds, orderBy, page, limit) {
    var sql = '';

    sql += 'SELECT * FROM (\n';

    sql += 'SELECT \n';

    switch (spamType) {
    case Constants.SPAM_TYPE_TRASH_POINT:
      sql += '  array_to_json(array_agg(( \n';
      sql += '    SELECT x FROM (SELECT s.trash_point_activity_id AS "trashPointActivityId", s.user_id AS "userId", s.reported, s.resolved, s.id, \n';
      sql += '      (SELECT array_to_json(array_agg(i)) \n';
      sql += '        FROM ( \n';
      sql += '          SELECT i.full_storage_location AS "fullStorageLocation", \n';
      sql += '          i.full_download_url AS "fullDownloadUrl", \n';
      sql += '          i.thumb_download_url AS "thumbDownloadUrl", \n';
      sql += '          i.thumb_retina_storage_location AS "thumbRetinaStorageLocation", \n';
      sql += '          i.thumb_retina_download_url AS "thumbRetinaDownloadUrl", \n';
      sql += '          i.created, \n';
      sql += '          i.id \n';
      sql += '          FROM public.image i \n';
      sql += '          JOIN public.trash_point_activity_has_image tpahi ON (tpahi.image_id = i.id AND s.trash_point_activity_id = tpahi.trash_point_activity_id) \n';
      sql += '        ) AS i \n';
      sql += '      ) AS images \n';
      sql += '  ) x))) AS spams, \n';
      sql += '  tpa.trash_point_id, \n';
      sql += '  max(s.reported) AS reported \n';
      break;
    case Constants.SPAM_TYPE_COLLECTION_POINT:
      sql += '  array_to_json(array_agg(( \n';
      sql += '    SELECT x FROM (SELECT s.collection_point_activity_id AS "collectionPointActivityId", s.user_id AS "userId", s.reported, s.resolved, s.id, \n';
      sql += '      (SELECT array_to_json(array_agg(i)) \n';
      sql += '        FROM ( \n';
      sql += '          SELECT i.full_storage_location AS "fullStorageLocation", \n';
      sql += '          i.full_download_url AS "fullDownloadUrl", \n';
      sql += '          i.thumb_download_url AS "thumbDownloadUrl", \n';
      sql += '          i.thumb_retina_storage_location AS "thumbRetinaStorageLocation", \n';
      sql += '          i.thumb_retina_download_url AS "thumbRetinaDownloadUrl", \n';
      sql += '          i.created, \n';
      sql += '          i.id \n';
      sql += '          FROM public.image i \n';
      sql += '          JOIN public.collection_point_activity_has_image cpahi ON (cpahi.image_id = i.id AND s.collection_point_activity_id = cpahi.collection_point_activity_id) \n';
      sql += '        ) AS i \n';
      sql += '      ) AS images \n';
      sql += '  ) x))) AS spams, \n';
      sql += '  cpa.collection_point_id, \n';
      sql += '  max(s.reported) AS reported \n';
      break;
    case Constants.SPAM_TYPE_TRASH_POINT_ACTIVITY:
      sql += '  s.id, \n';
      sql += '  s.trash_point_activity_id, \n';
      sql += '  tpa.trash_point_id, \n';
      sql += '  s.reported, \n';
      sql += '  s.resolved, \n';
      sql += '  s.user_id \n';
      break;
    case Constants.SPAM_TYPE_COLLECTION_POINT_ACTIVITY:
      sql += '  s.id, \n';
      sql += '  s.collection_point_activity_id, \n';
      sql += '  cpa.collection_point_id, \n';
      sql += '  s.reported, \n';
      sql += '  s.resolved, \n';
      sql += '  s.user_id \n';
      break;
    case Constants.SPAM_TYPE_EVENT:
      sql += '  s.event_id, \n';
      sql += '  s.reported, \n';
      sql += '  s.resolved, \n';
      sql += '  s.user_id \n';
      break;
    }

    sql += 'FROM public.spam s \n';

    switch (spamType) {
    case Constants.SPAM_TYPE_TRASH_POINT:
    case Constants.SPAM_TYPE_TRASH_POINT_ACTIVITY:
      sql += 'JOIN public.trash_point_activity tpa ON tpa.id = s.trash_point_activity_id \n';
      break;
    case Constants.SPAM_TYPE_COLLECTION_POINT_ACTIVITY:
    case Constants.SPAM_TYPE_COLLECTION_POINT:
      sql += 'JOIN public.collection_point_activity cpa ON cpa.id = s.collection_point_activity_id \n';
      sql += 'JOIN public.collection_point cp ON cp.id = cpa.collection_point_id \n';
      break;
    }

    sql += getSpamListWhereClause(spamType, user, entityIds);

    if (Constants.SPAM_TYPE_TRASH_POINT === spamType) {
      sql += 'GROUP BY tpa.trash_point_id \n';
    } else if(Constants.SPAM_TYPE_COLLECTION_POINT === spamType) {
      sql += 'GROUP BY cpa.collection_point_id \n';
    }

    sql += ') AS list \n';

    if (orderBy) {
      var order = [];
      orderBy.split(',').forEach(function (str) {
        var column = str.substr(0, 1) === '-' ? str.substr(1) : str;
        var trend = str.substr(0, 1) === '-' ? ' DESC' : ' ASC';

        switch (column) {
        case Constants.SPAM_ORDER_BY_ID:
          switch (spamType) {
          case Constants.SPAM_TYPE_TRASH_POINT:
            order.push('list.trash_point_id' + trend);
            break;
          case Constants.SPAM_TYPE_COLLECTION_POINT:
            order.push('list.collection_point_id' + trend);
            break;
          case Constants.SPAM_TYPE_TRASH_POINT_ACTIVITY:
            order.push('list.trash_point_activity_id' + trend);
            break;
          case Constants.SPAM_TYPE_COLLECTION_POINT_ACTIVITY:
            order.push('list.collection_point_activity_id' + trend);
            break;
          case Constants.SPAM_TYPE_EVENT:
            order.push('list.event_id' + trend);
            break;
          }
          //order.push('s.' + column + trend);
          break;
        case Constants.SPAM_ORDER_BY_REPORTED:
          order.push('list.' + column + trend);
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
   * General method for deleting spam
   * 
   * @param {Number} id
   * @param {Function} cb
   */
  Spam.deleteSpam = function (id, cb) {
    var filter = {
      include: [
        {trashPointActivity: 'gps'},
        {collectionPointActivity: 'gps'},
        {event: 'gps'}
      ]
    };

    Spam.beginTransaction({isolationLevel: Spam.Transaction.READ_COMMITTED}, function (err, tx) {

      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      Spam.findById(id, filter, {transaction: tx}, function (err, instance) {

        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        if (!instance) {
          return cb({message: 'Spam not found.', status: 404});
        }

        var current = instance.toJSON();
        var gps = current.trashPointActivity.gps || current.collectionPointActivity.gps || current.event.gps;

        AreaAccessControl.check(Constants.METHOD_SPAM_DELETE, Spam.app.models.BaseModel.user, gps, Spam.settings.acls).then(function () {

          Spam.destroyAll({id: id}, {transaction: tx}, function (err) {

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
   * Method for deleting all the trash point spam
   * 
   * @param {Number} trashPointId
   * @param {Function} cb
   */
  Spam.deleteAllTrashPointSpam = function (trashPointId, cb) {
    Spam.beginTransaction({isolationLevel: Spam.Transaction.READ_COMMITTED}, function (err, tx) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      Spam.app.models.TrashPointActivity.find({where: {trashPointId: trashPointId}, include: ['gps']}, {transaction: tx}, function (err, instances) {
        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        if (!instances.length) {
          return cb({message: 'Trash not found.', status: 404});
        }

        var trashPointActivityIds = [];
        instances.forEach(function (instance) {
          trashPointActivityIds.push(instance.id);
        });

        AreaAccessControl.check(Constants.METHOD_SPAM_DELETE, Spam.app.models.BaseModel.user, instances[0].toJSON().gps, Spam.settings.acls).then(function () {

          Spam.destroyAll({trashPointActivityId: {inq: trashPointActivityIds}}, {transaction: tx}, function (err) {
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
   * Method for deleting all the collection point spam
   * 
   * @param {Number} collectionPointId
   * @param {Function} cb
   */
  Spam.deleteAllCollectionPointSpam = function (collectionPointId, cb) {
    Spam.beginTransaction({isolationLevel: Spam.Transaction.READ_COMMITTED}, function (err, tx) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      Spam.app.models.CollectionPointActivity.find({where: {collectionPointId: collectionPointId}, include: ['gps']}, {transaction: tx}, function (err, instances) {
        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        if (!instances.length) {
          return cb({message: 'Trash not found.', status: 404});
        }

        var collectionPointActivityIds = [];
        instances.forEach(function (instance) {
          collectionPointActivityIds.push(instance.id);
        });

        AreaAccessControl.check(Constants.METHOD_SPAM_DELETE, Spam.app.models.BaseModel.user, instances[0].toJSON().gps, Spam.settings.acls).then(function () {

          Spam.destroyAll({collectionPointActivityId: {inq: collectionPointActivityIds}}, {transaction: tx}, function (err) {
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
   * General method for reporting spam
   * 
   * @param {Number} trashPointActivityId
   * @param {Number} collectionPointActivityId
   * @param {Number} eventId
   * @param {Function} cb
   * @returns {Number}
   */
  Spam.reportSpam = function (trashPointActivityId, collectionPointActivityId, eventId, cb) {
    if (!trashPointActivityId && !collectionPointActivityId && !eventId) {
      return cb({message: 'One of spam types must be set (trashPointActivityId, collectionPointActivity or eventId)', status: 404});
    }

    Spam.create({
      trashPointActivityId: trashPointActivityId || null,
      collectionPointActivityId: collectionPointActivityId || null,
      eventId: eventId || null,
      userId: Spam.app.models.BaseModel.user.id
    }, function (err, instance) {

      if (err) {
        if (err.detail.indexOf('already exist') !== -1) {
          return cb({message: 'This entity is already marked as spam.', status: 400});
        } else {
          console.error(err);
          return cb({message: err.detail});
        }
      }

      cb(null, instance.id);
    });
  };

  /**
   * Marks spam as resolved and deletes related entity
   * 
   * @param {Number} id
   * @param {Functione} cb
   * @returns {Number}
   */
  Spam.resolveSpam = function (id, cb) {
    var filter = {
      include: [
        {trashPointActivity: 'gps'},
        {collectionPointActivity: 'gps'},
        {event: 'gps'}
      ]
    };

    Spam.beginTransaction({isolationLevel: Spam.Transaction.READ_COMMITTED}, function (err, tx) {

      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      Spam.findById(id, filter, {transaction: tx}, function (err, instance) {

        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        if (!instance) {
          return cb({message: 'Spam not found.', status: 404});
        }

        var current = instance.toJSON();
        var gps = current.trashPointActivity.gps || current.collectionPointActivity.gps || current.event.gps;

        AreaAccessControl.check(Constants.METHOD_SPAM_DELETE, Spam.app.models.BaseModel.user, gps, Spam.settings.acls).then(function () {

          Spam.updateAll({id: id}, {resolved: (new Date()).toISOString()}, function (err, instance) {

            if (err) {
              console.error(err);
              return cb({message: err.detail});
            }

            var promise = Promise.defer();

            if (current.trashPointActivity) {
              // Foreign keys will delete the rest
              promise = Spam.app.models.TrashPoint.destroyAll({id: current.trashPointActivity.trashPointId});
            } else if (current.collectionPointActivity) {
              // Soft delete
              promise = Spam.app.models.TrashPoint.updateAll({id: current.collectionPoint.collectionPointId}, {deleted: (new Date()).toISOString()});
            } else if (current.event) {
              // Classic delete
              promise = Spam.app.models.Event.destroyAll({id: current.event.id});
            }

            Promise.all([promise]).then(function () {

              cb(null, instance.id);

            }).catch(function (e) {
              console.error(err);
              cb({message: e.message, status: 500});
            });

          });

        }).catch(function (e) {
          cb({message: e.message, status: 403});
        });

      });

    });
  };

  /**
   * Returns all spam for TrashPointActivity
   * 
   * @param {String} trashIds
   * @param {String} orderBy
   * @param {Number} page
   * @param {Number} limit
   * @param {Number} groupByTrash
   * @param {Function} cb
   * @returns {Array}
   */
  Spam.getTrashPointActivitySpam = function (trashIds, orderBy, page, limit, groupByTrash, cb) {
    var ds = Spam.app.dataSources.trashout;

    var sql = getSpamListSQL(groupByTrash ? Constants.SPAM_TYPE_TRASH_POINT : Constants.SPAM_TYPE_TRASH_POINT_ACTIVITY, Spam.app.models.BaseModel.user, trashIds, orderBy, page, limit);

    ds.connector.execute(sql, Spam.app.models.BaseModel.sqlParameters, function (err, instances) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      var result = [];
      instances.forEach(function (instance) {
        if (groupByTrash) {
          result.push({
            trashPointId: instance.trash_point_id,
            spams: instance.spams,
            reported: instance.reported
          });
        } else {          
          result.push({
            id: instance.id,
            trashPointId: instance.trash_point_id,
            trashPointActivityId: instance.trash_point_activity_id,
            userId: instance.user_id,
            reported: instance.reported,
            resolved: instance.resolved
          });
        }
      });

      cb(null, result);
    });
  };
  
  /**
   * Returns spam count for TrashPoint
   * 
   * @param {String} trashIds
   * @param {Function} cb
   * @returns {Array}
   */
  Spam.getTrashPointActivitySpamCount = function (trashIds, cb) {
    var ds = Spam.app.dataSources.trashout;

    var sql = getSpamCountSQL(Constants.SPAM_TYPE_TRASH_POINT_ACTIVITY, Spam.app.models.BaseModel.user, trashIds);

    ds.connector.execute(sql, Spam.app.models.BaseModel.sqlParameters, function (err, instance) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      cb(null, Number(instance[0].count));
    });
  };

  /**
   * Report TrashPoint as spam
   * 
   * @param {Number} trashPointActivityId
   * @param {Function} cb
   * @returns {Number}
   */
  Spam.reportTrashPointActivitySpam = function (trashPointActivityId, cb) {
    var data = {
      trashPointActivityId: trashPointActivityId,
      userId: Spam.app.models.BaseModel.user.id
    };

    Spam.create(data, function (err, responseSpam) {

      if (err) {
        if (err.detail.indexOf('already exist') !== -1) {
          return cb({message: 'This activity is already marked as spam.', status: 400});
        } else {
          console.error(err);
          return cb({message: err.detail});
        }
      }

      cb(null, responseSpam.id);
    });
  };

  /**
   * Returns all spam for CollectionPoint
   * 
   * @param {String} collectionPointIds
   * @param {String} orderBy
   * @param {Number} page
   * @param {Number} limit
   * @param {Boolean} groupByCollectionPoint
   * @param {Function} cb
   * @returns {Array}
   */
  Spam.getCollectionPointActivitySpam = function (collectionPointIds, orderBy, page, limit, groupByCollectionPoint, cb) {
    var ds = Spam.app.dataSources.trashout;

    var sql = getSpamListSQL(groupByCollectionPoint ? Constants.SPAM_TYPE_COLLECTION_POINT : Constants.SPAM_TYPE_COLLECTION_POINT_ACTIVITY, Spam.app.models.BaseModel.user, collectionPointIds, orderBy, page, limit);

    ds.connector.execute(sql, Spam.app.models.BaseModel.sqlParameters, function (err, instances) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      var result = [];
      instances.forEach(function (instance) {
        if (groupByCollectionPoint) {
          result.push({
            collectionPointId: instance.collection_point_id,
            spams: instance.spams,
            reported: instance.reported
          });
        } else {
          result.push({
            id: instance.id,
            collectionPointId: instance.collection_point_id,
            collectionPointActivityId: instance.collection_point_activity_id,
            userId: instance.user_id,
            reported: instance.reported,
            resolved: instance.resolved
          });
        }
      });

      cb(null, result);
    });
  };

  
  /**
   * Returns spam count for CollectionPoint
   * 
   * @param {String} collectionPointIds
   * @param {Function} cb
   * @returns {Array}
   */
  Spam.getCollectionPointActivitySpamCount = function (collectionPointIds, cb) {
    var ds = Spam.app.dataSources.trashout;

    var sql = getSpamCountSQL(Constants.SPAM_TYPE_COLLECTION_POINT_ACTIVITY, Spam.app.models.BaseModel.user, collectionPointIds);

    ds.connector.execute(sql, Spam.app.models.BaseModel.sqlParameters, function (err, instance) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      cb(null, Number(instance[0].count));
    });
  };

  /**
   * Report CollectionPoint as spam
   * 
   * @param {Number} collectionPointActivityId
   * @param {Function} cb
   * @returns {Number}
   */
  Spam.reportCollectionPointActivitySpam = function (collectionPointActivityId, cb) {
    var data = {
      collectionPointActivityId: collectionPointActivityId,
      userId: Spam.app.models.BaseModel.user.id
    };

    Spam.create(data, function (err, responseSpam) {

      if (err) {
        if (err.detail.indexOf('already exist') !== -1) {
          return cb({message: 'This activity is already marked as spam.', status: 400});
        } else {
          console.error(err);
          return cb({message: err.detail});
        }
      }


      cb(null, responseSpam.id);
    });
  };

  /**
   * Returns all spam for Event
   * 
   * @param {String} eventIds
   * @param {String} orderBy
   * @param {Number} page
   * @param {Number} limit
   * @param {Function} cb
   * @returns {Array}
   */
  Spam.getEventSpam = function (eventIds, orderBy, page, limit, cb) {
    var ds = Spam.app.dataSources.trashout;

    var sql = getSpamListSQL(Constants.SPAM_TYPE_EVENT, Spam.app.models.BaseModel.user, eventIds, orderBy, page, limit);

    ds.connector.execute(sql, Spam.app.models.BaseModel.sqlParameters, function (err, instances) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      var result = [];
      instances.forEach(function (instance) {
        result.push({
          id: instance.id,
          eventId: instance.event_id,
          userId: instance.user_id,
          reported: instance.reported,
          resolved: instance.resolved
        });
      });

      cb(null, result);
    });
  };

  
  /**
   * Returns spam count for Event
   * 
   * @param {String} eventIds
   * @param {Function} cb
   * @returns {Array}
   */
  Spam.getEventSpamCount = function (eventIds, cb) {
    var ds = Spam.app.dataSources.trashout;

    var sql = getSpamCountSQL(Constants.SPAM_TYPE_EVENT, Spam.app.models.BaseModel.user, eventIds);

    ds.connector.execute(sql, Spam.app.models.BaseModel.sqlParameters, function (err, instance) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      cb(null, Number(instance[0].count));
    });
  };

  /**
   * Report Event as spam
   * 
   * @param {Number} eventId
   * @param {Function} cb
   * @returns {Number}
   */
  Spam.reportEventSpam = function (eventId, cb) {
    var data = {
      eventId: eventId,
      userId: Spam.app.models.BaseModel.user.id
    };

    Spam.create(data, function (err, responseSpam) {

      if (err) {
        if (err.detail.indexOf('already exist') !== -1) {
          return cb({message: 'This event is already marked as spam.', status: 400});
        } else {
          console.error(err);
          return cb({message: err.detail});
        }
      }

      cb(null, responseSpam.id);
    });
  };

  Spam.disableRemoteMethod('create', true); // Removes (POST) /spam
  Spam.disableRemoteMethod('upsert', true); // Removes (PUT) /spam/:id
  Spam.disableRemoteMethod('find', true); // Removes (GET) /spam
  Spam.disableRemoteMethod('deleteById', true); // Removes (DELETE) /spam/:id
  Spam.disableRemoteMethod('__destroyById__trashes', false); // Removes (DELETE) /spam/trash/:trashPointId

  Spam.remoteMethod(
    'getSpam',
    {
      http: {path: '/', verb: 'get'},
      accepts: [
        {arg: 'orderBy', type: 'string', description: 'Order by'},
        {arg: 'page', type: 'number', description: 'Page'},
        {arg: 'limit', type: 'number', description: 'Limit'}
      ],
      returns: {arg: 'result', type: 'string'}
    }
  );

  Spam.remoteMethod(
    'reportSpam',
    {
      http: {path: '/', verb: 'post'},
      accepts: [
        {arg: 'trashPointActivityId', type: 'number'},
        {arg: 'collectionPointActivityId', type: 'number'},
        {arg: 'eventId', type: 'number'}
      ],
      returns: {arg: 'id', type: 'number'}
    }
  );

  Spam.remoteMethod(
    'deleteSpam',
    {
      http: {path: '/:id', verb: 'delete'},
      accepts: [
        {arg: 'id', type: 'number', required: true}
      ]
    }
  );

  Spam.remoteMethod(
    'deleteAllTrashPointSpam',
    {
      http: {path: '/trash/:trashPointId', verb: 'delete'},
      accepts: [
        {arg: 'trashPointId', type: 'number', required: true}
      ]
    }
  );

  Spam.remoteMethod(
    'deleteAllCollectionPointSpam',
    {
      http: {path: '/collection-point/:collectionPointId', verb: 'delete'},
      accepts: [
        {arg: 'collectionPointId', type: 'number', required: true}
      ]
    }
  );

  Spam.remoteMethod(
    'resolveSpam',
    {
      http: {path: '/:id', verb: 'put'},
      accepts: [
        {arg: 'id', type: 'string', required: true}
      ]
    }
  );

  Spam.remoteMethod(
    'getTrashPointActivitySpam',
    {
      http: {path: '/trash/', verb: 'get'},
      accepts: [
        {arg: 'trashIds', type: 'string', description: 'TrashPoint ids'},
        {arg: 'orderBy', type: 'string', description: 'Order by'},
        {arg: 'page', type: 'number', description: 'Page'},
        {arg: 'limit', type: 'number', description: 'Limit'},
        {arg: 'group', type: 'boolean', description: 'Group by TrashPoint'}
      ],
      returns: {arg: 'result', type: 'string'}
    }
  );
  
  Spam.remoteMethod(
    'getTrashPointActivitySpamCount',
    {
      http: {path: '/trash/count/', verb: 'get'},
      accepts: [
        {arg: 'trashIds', type: 'string', description: 'TrashPoint ids'}
      ],
      returns: {arg: 'count', type: 'number'}
    }
  );

  Spam.remoteMethod(
    'reportTrashPointActivitySpam',
    {
      http: {path: '/trash/', verb: 'post'},
      accepts: [
        {arg: 'trashPointActivityId', type: 'number', required: true}
      ],
      returns: {arg: 'id', type: 'number'}
    }
  );

  Spam.remoteMethod(
    'getCollectionPointActivitySpam',
    {
      http: {path: '/collection-point/', verb: 'get'},
      accepts: [
        {arg: 'collectionPointIds', type: 'string', description: 'CollectionPoint ids'},
        {arg: 'orderBy', type: 'string', description: 'Order by'},
        {arg: 'page', type: 'number', description: 'Page'},
        {arg: 'limit', type: 'number', description: 'Limit'},
        {arg: 'group', type: 'boolean', description: 'Group by CollectionPoint'}
      ],
      returns: {arg: 'result', type: 'string'}
    }
  );

  Spam.remoteMethod(
    'getCollectionPointActivitySpamCount',
    {
      http: {path: '/collection-point/count/', verb: 'get'},
      accepts: [
        {arg: 'collectionPointIds', type: 'string', description: 'CollectionPoint ids'}
      ],
      returns: {arg: 'count', type: 'number'}
    }
  );

  Spam.remoteMethod(
    'reportCollectionPointActivitySpam',
    {
      http: {path: '/collection-point/', verb: 'post'},
      accepts: [
        {arg: 'collectionPointActivityId', type: 'number', required: true}
      ],
      returns: {arg: 'id', type: 'number'}
    }
  );

  Spam.remoteMethod(
    'getEventSpam',
    {
      http: {path: '/event/', verb: 'get'},
      accepts: [
        {arg: 'eventIds', type: 'string', description: 'Event ids'},
        {arg: 'orderBy', type: 'string', description: 'Order by'},
        {arg: 'page', type: 'number', description: 'Page'},
        {arg: 'limit', type: 'number', description: 'Limit'}
      ],
      returns: {arg: 'result', type: 'string'}
    }
  );

  Spam.remoteMethod(
    'getEventSpamCount',
    {
      http: {path: '/event/count/', verb: 'get'},
      accepts: [
        {arg: 'eventIds', type: 'string', description: 'Event ids'}
      ],
      returns: {arg: 'count', type: 'number'}
    }
  );

  Spam.remoteMethod(
    'reportEventSpam',
    {
      http: {path: '/event/', verb: 'post'},
      accepts: [
        {arg: 'eventId', type: 'number', required: true}
      ],
      returns: {arg: 'id', type: 'number'}
    }
  );
};
