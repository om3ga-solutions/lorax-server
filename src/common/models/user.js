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
var UserPoints = require('../helpers/userPoints');
var AreaAccessControl = require('../area-access-control');
var Sentry = require('../helpers/sentry').getInstance();

var toBasicObject = function(obj) {
  return JSON.parse(JSON.stringify(obj));
};


/**
 *
 * @param {Mixed} param
 * @returns {Mixed}
 */
var checkNull = function (param) {
  return param === "null" ? null : param;
};

module.exports = function (User) {

  /**
   * Stores parameters for parametrized queries and returns parameter number
   *
   * @param {type} parameter
   * @returns {String}
   */
  function sanitize(parameter) {
    return User.app.models.BaseModel.sanitize(parameter);
  }

  /**
   *
   * @param {String} areaIds Comma separated area identifiers
   * @returns {Array}
   */
  function getUserIdsForAreaIds(areaIds) {
    var filter = {
      where: {
        areaId: {
          inq: areaIds.split(',').map(Number).filter(Boolean)
        }
      }
    };

    return new Promise(function (resolve, reject) {
      User.app.models.UserHasArea.find(filter, function (err, instances) {
        if (err) {
          return reject(err);
        }

        var userIds = [];

        instances.forEach(function (instance) {
          userIds.push(instance.userId);
        });

        resolve(userIds);
      });
    });
  }

  /**
   *
   * @param {Object} data
   * @param {Array} areas
   * @param {Array} organizations
   * @param {Array} badges
   * @param {Object} image
   * @param {Object} tx
   * @returns {Object}
   */
  function createUser(data, areas, organizations, badges, image, tx) {
    return new Promise(function (resolve, reject) {

      User.create(data, {transaction: tx}, function (err, instance) {
        if (err) {
          // Return 404, because in most of time there is a problem with foreign keys in DB (userRole, area)
          return reject({message: err.detail, status: 404});
        }

        var current = instance.toJSON();

        // Property "reviewed" is internally saved as timestamp with time zone
        // We have to convert it to boolean for response
        current.reviewed = Boolean(current.reviewed);

        // Save relations: organizations + badges + areas
        if (organizations && organizations.length) {
          organizations.forEach(function (orgRef) {
            User.app.models.UserHasOrganization.create({userId: current.id, organizationId: orgRef.organizationId, organizationRoleId: orgRef.organizationRoleId || Constants.USER_ORGANIZATION_ROLE_MEMBER}, {transaction: tx});
          });
        }

        if (badges && badges.length) {
          badges.forEach(function (badgeRef) {
            User.app.models.UserHasBadge.create({userId: current.id, badgeId: badgeRef.id}, {transaction: tx});
          });
        }

        if (areas && areas.length) {
          areas.forEach(function (areaRef) {
            User.app.models.UserHasArea.create({userId: current.id, areaId: areaRef.id, userAreaRoleId: areaRef.userAreaRoleId, notification: areaRef.notification === true ? true : false}, {transaction: tx});
          });
        }

        // Create image if there are any links provided (in image object)
        var p1, p2 = Promise.defer();
        if (image) {
          var imageData = {
            fullStorageLocation: image.fullStorageLocation,
            fullDownloadUrl: image.fullDownloadUrl,
            thumbDownloadUrl: image.thumbDownloadUrl,
            thumbStorageLocation: image.thumbStorageLocation,
            thumbRetinaStorageLocation: image.thumbRetinaStorageLocation,
            thumbRetinaDownloadUrl: image.thumbRetinaDownloadUrl
          };

          p1 = User.app.models.Image.create(imageData, {transaction: tx}, function (err, imageInstance) {
            if (err) {
              return reject({message: err.detail});
            }

            // Update user with new imageId
            p2 = User.updateAll({id: current.id}, {imageId: imageInstance.id}, function (err) {
              if (err) {
                return reject({message: err.detail});
              }
            });
          });
        } else {
          p1 = Promise.resolve();
          p2 = Promise.resolve();
        }

        Promise.all([p1, p2]).then(function () {

          resolve(current);

        }).catch(function (error) {
          return reject(error);
        });

      });

    });
  }

  /**
   *
   * @param {Number} id
   * @param {Object} data
   * @param {Object} tx
   * @returns {Object}
   */
  function migrateUser(id, data, tx) {
    return new Promise(function (resolve, reject) {
      User.app.models.UserHasArea.findOne({where: {userId: id}, order: 'user_area_role_id ASC'}, {transaction: tx}, function (err, maxArea) {
        if (err) {
          return reject(err);
        }

        if (maxArea) {
          data.userRoleId = maxArea.userAreaRoleId;
        }

        User.updateAll({id: id}, data, {transaction: tx}, function (err) {
          if (err) {
            return reject(err);
          }

          User.findById(id, {transaction: tx}, function (err, current) {
            if (err) {
              return reject(err);
            }

            resolve(current);
          });
        });
      });
    });
  }

  /**
   * @param {String} includeInCleanup
   * @returns {Array}
   */
  function getUserIdsForCleanupFilter(includeInCleanup) {
    var where = false;

    switch (includeInCleanup) {
    case 'true':
    case '1':
      where = 'uha.notification IS TRUE';
      break;
    case 'false':
    case '0':
      where = '(uha.notification IS NULL OR uha.notification IS FALSE)';
      break;
    }

    var ds = User.app.dataSources.trashout;
    var sql = 'SELECT ARRAY(SELECT u.id FROM public.user u LEFT JOIN public.user_has_area uha ON u.id = uha.user_id WHERE ' + where + ')';

    return new Promise(function (resolve, reject) {

      ds.connector.execute(sql, function (err, result) {
        if (err) {
          return reject(err);
        }

        resolve(result[0].array);
      });
    });
  }

  /**
   *
   * @param {String} organizationIds Comma separated organization identifiers
   * @returns {Array}
   */
  function getUserIdsForOrganizationIds(organizationIds) {
    var filter = {
      where: {
        organizationId: {
          inq: organizationIds.split(',').map(Number).filter(Boolean)
        }
      }
    };

    return new Promise(function (resolve, reject) {
      User.app.models.UserHasOrganization.find(filter, function (err, instances) {
        if (err) {
          return reject(err);
        }

        var userIds = [];

        instances.forEach(function (instance) {
          userIds.push(instance.userId);
        });

        resolve(userIds);
      });
    });
  }

  /**
   *
   * @param {String} emails
   * @param {String} userIds
   * @param {Number} minPoints
   * @param {Number} maxPoints
   * @param {String} areaIds
   * @param {String} organizationIds
   * @param {String} includeInCleanup
   * @param {String} reviewed
   * @param {String} orderBy
   * @param {Number} page
   * @param {Number} limit
   * @returns {Object}
   */
  function getListFilter(emails, userIds, minPoints, maxPoints, areaIds, organizationIds, includeInCleanup, reviewed, orderBy, page, limit) {

    return new Promise(function (resolve, reject) {

      var filter = {
        where: {
        },
        include: [
          'image',
          'userRole',
          {
            userHasBadge: {
              badge: [
                'image'
              ]
            }
          },
          { userHasArea: ['area', 'role'] },
          { userHasOrganization: 'organization' }
        ]
      };

      if (emails && emails.length) {
        filter.where.email = {inq: emails.split(',')};
      }

      if (userIds && userIds.length) {
        filter.where.id = {inq: userIds.split(',').map(Number).filter(Boolean)};
      }

      if (minPoints || maxPoints) {
        filter.where.points = {between: [minPoints || 0, maxPoints || (10000 * 10000)]};
      }

      var p1;
      if (areaIds) {
        p1 = getUserIdsForAreaIds(areaIds);
      } else {
        p1 = Promise.resolve();
      }

      var p2;
      if (includeInCleanup) {
        p2 = getUserIdsForCleanupFilter(includeInCleanup);
      } else {
        p2 = Promise.resolve();
      }

      var p3;
      if (organizationIds) {
        p3 = getUserIdsForOrganizationIds(organizationIds);
      } else {
        p3 = Promise.resolve();
      }

      switch (reviewed) {
      case 'true':
      case '1':
        filter.where.reviewed = {neq: null};
        break;

      case 'false':
      case '0':
        filter.where.reviewed = null;
        break;
      }

      if (orderBy) {
        var orders = [];

        orderBy.split(',').forEach(function (order) {
          var column = order.substr(0, 1) === '-' ? order.substr(1) : order;
          var trend = order.substr(0, 1) === '-' ? 'DESC' : 'ASC';

          if (Constants.USER_ALLOWED_ORDERING.indexOf(column) > -1) {
            column = (column === 'lastName') ? 'last_name' : column;
            column = (column === 'firstName') ? 'first_name' : column;
            orders.push(column + ' ' + trend);
          }
        });

        if (orders.length) {
          filter.order = orders;
        }
      }

      if (page && limit) {
        filter.skip = (parseInt(page, 10) - 1) * Math.abs(parseInt(limit, 10));
      } else {
        filter.skip = 0;
      }

      if (limit) {
        filter.limit = Math.abs(parseInt(limit, 10));
      } else {
        filter.limit = 100;
      }

      Promise.all([p1, p2, p3]).then(function (response) {
        response.forEach(function (userIdsArray) {
          if (userIdsArray) {
            if (filter.where.id && filter.where.id.inq) {
              filter.where.id.inq = filter.where.id.inq.intersect(userIdsArray.map(function (id) {return parseInt(id)}));
            } else {
              filter.where.id = {inq: userIdsArray};
            }
          }
        });

        return resolve(filter);
      }).catch(function (error) {
        return reject(error);
      });
    });
  }

  /**
   * Create new user
   *
   * @param {String} firstName
   * @param {String} lastName
   * @param {String} email
   * @param {String} created
   * @param {String} info
   * @param {String} birthdate Timestamp in format "2012-04-20T22:00:00.000Z"
   * @param {Boolean} active
   * @param {Boolean} newsletter
   * @param {String} uid Firebase uid
   * @param {String} tokenFCM
   * @param {String} facebookUrl
   * @param {String} facebookUID
   * @param {String} twitterUrl
   * @param {String} googlePlusUrl
   * @param {String} phoneNumber
   * @param {Number} points
   * @param {Boolean} reviewed
   * @param {Boolean} eventOrganizer
   * @param {Boolean} volunteerCleanup
   * @param {Number} userRoleId
   * @param {Object} areas
   * @param {Object} organizations
   * @param {Object} badges
   * @param {Object} image
   * @param {String} language
   * @param {Function} cb
   * @returns {Object}
   */
  User.add = function (firstName, lastName, email, created, info, birthdate, active, newsletter, uid, tokenFCM, facebookUrl, facebookUID, twitterUrl, googlePlusUrl,
       phoneNumber, points, reviewed, eventOrganizer, volunteerCleanup, userRoleId, areas, organizations, badges, image, language, cb) {

    // Check whether Firebase UID from POST request match real Firebase account
//    if (User.app.models.BaseModel.user.uid === uid) {
//      return cb({
//        message: "Uid does not match the Firebase account uid.",
//        status: 401
//      });
//    }

    var date = new Date();

    // Create data object
    var data = {
      firstName: checkNull(firstName) || null,
      lastName: checkNull(lastName) || null,
      email: checkNull(email) || null,
      info: checkNull(info) || null,
      birthdate: checkNull(birthdate) || null,
      created: checkNull(created) || date.toISOString(),
      active: active === null ? true : active,
      newsletter: checkNull(newsletter),
      uid: checkNull(uid),
      tokenFCM: checkNull(tokenFCM),
      facebookUrl: checkNull(facebookUrl) || null,
      facebookUID: checkNull(facebookUID) || null,
      twitterUrl: checkNull(twitterUrl) || null,
      googlePlusUrl: checkNull(googlePlusUrl) || null,
      phoneNumber: checkNull(phoneNumber) || null,
      points: checkNull(points) || 0,
      reviewed: checkNull(reviewed) ? date.toISOString() : null,
      eventOrganizer: eventOrganizer || false,
      volunteerCleanup: volunteerCleanup || false,
      userRoleId: 3,
      language: checkNull(language)
    };

    // Begin transaction
    User.beginTransaction({isolationLevel: User.Transaction.READ_COMMITTED}, function (err, tx) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      // Check whether uid exists in our database
      User.count({uid: uid}, {transaction: tx}, function (err, duplicateUidCount) {
        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        if (duplicateUidCount > 0) {
          return cb({
            message: 'Unique constraint fails: Uid ' + uid + ' already exists.',
            status: 400
          });
        }

        if (email) {

          User.findOne({where: {email: email}}, {transaction: tx}, function (err, existingUser) {
            if (err) {
              console.error(err);
              return cb({message: err.detail});
            }

            if (existingUser) {
              if (existingUser.facebookUrl) {

                // migrate default user
                migrateUser(existingUser.id, data, tx).then(function (user) {

                  tx.commit(function (err) {
                    if (err) {
                      console.error(err);
                      return cb({message: err.detail, status: 403});
                    }

                    cb(null, user);
                  });

                }).catch(function(error) {
                  console.error(error);
                  return cb(error);
                });

              } else {
                return cb({
                  message: 'Unique constraint fails: Email ' + email + ' already exists.',
                  status: 400
                });
              }
            } else {

              // create default user
              createUser(data, areas, organizations, badges, image, tx).then(function (user) {

                tx.commit(function (err) {
                  if (err) {
                    console.error(err);
                    return cb({message: err.detail, status: 403});
                  }

                  cb(null, user);
                });

              }).catch(function(error) {
                console.error(error);
                return cb(error);
              });

            }

          });

        } else {

          // create anonymous user
          createUser(data, areas, organizations, badges, image, tx).then(function (user) {

            tx.commit(function (err) {
              if (err) {
                console.error(err);
                return cb({message: err.detail, status: 403});
              }

              cb(null, user);
            });

          }).catch(function(error) {
            console.error(error);
            return cb(error);
          });

        }

      });
    });
  };

  /**
   * Delete user
   *
   * @param {Number} id
   * @param {Function} cb
   */
  User.del = function (id, cb) {
    if (User.app.models.BaseModel.user.id !== id) {
      return cb({message: 'User himself is allowed to delete user.', status: 403});
    }

    User.findById(id, function (err, instance) {
      if (err) {
        console.error(err);
        return cb({ message: err.detail });
      }

      if (!instance) {
        return cb({ message: 'User not found.', status: 404 });
      }

      User.destroyAll({ id: id }, function (err) {
        if (err) {
          console.error(err);
          return cb({ message: err.detail });
        }

        cb({ status: 204 });
      });
    });
  };

  /**
   * Update user
   *
   * @param {Number} id
   * @param {String} firstName
   * @param {String} lastName
   * @param {String} email
   * @param {String} info
   * @param {String} birthdate
   * @param {Boolean} active
   * @param {Boolean} newsletter
   * @param {String} uid
   * @param {String} tokenFCM
   * @param {String} facebookUrl
   * @param {String} facebookUID
   * @param {String} twitterUrl
   * @param {String} googlePlusUrl
   * @param {String} phoneNumber
   * @param {Number} points
   * @param {Boolean} reviewed
   * @param {Boolean} eventOrganizer
   * @param {Boolean} volunteerCleanup
   * @param {Boolean} trashActivityEmailNotification
   * @param {Number} userRoleId
   * @param {Object} areas
   * @param {Object} organizations
   * @param {Object} badges
   * @param {Object} image
   * @param {String} language
   * @param {Function} cb
   * @returns {Object}
   */
  User.upd = function (id, firstName, lastName, email, info, birthdate, active, newsletter, uid, tokenFCM, facebookUrl, facebookUID, twitterUrl, googlePlusUrl,
    phoneNumber, points, reviewed, eventOrganizer, volunteerCleanup, trashActivityEmailNotification, userRoleId,
    areas, organizations, badges, image, language, cb) {

    if (User.app.models.BaseModel.user.id === id) {
      // ok
    } else {
      if (User.app.models.BaseModel.user.userRole.code === Constants.USER_ROLE_SUPER_ADMIN || User.app.models.BaseModel.user.userRole.code === Constants.USER_ROLE_ADMIN) {
        // ok
      } else {
        return cb({message: 'Only admin or superAdmin is allowed to update other users.', status: 403});
      }
    }

    User.findById(id, function (err, instance) {
      if (err) {
        console.error(err);
        return cb({ message: err.detail });
      }

      if (!instance) {
        return cb({ message: 'User not found.', status: 404 });
      }

      var data = {
        firstName: checkNull(firstName),
        lastName: checkNull(lastName),
        email: checkNull(email),
        info: checkNull(info),
        birthdate: checkNull(birthdate),
        active: checkNull(active),
        newsletter: checkNull(newsletter),
        uid: checkNull(uid),
        tokenFCM: checkNull(tokenFCM),
        facebookUrl: checkNull(facebookUrl),
        facebookUID: checkNull(facebookUID),
        twitterUrl: checkNull(twitterUrl),
        googlePlusUrl: checkNull(googlePlusUrl),
        phoneNumber: checkNull(phoneNumber),
        points: checkNull(points),
        eventOrganizer: eventOrganizer,
        volunteerCleanup: volunteerCleanup,
        trashActivityEmailNotification: trashActivityEmailNotification,
        language: checkNull(language)
      };

      // Property "reviewed" is internally saved as timestamp with time zone
      // We have to convert it from Boolean
      if (instance.reviewed === null && reviewed === true) {
        data.reviewed = (new Date()).toUTCString();
        User.app.models.TrashPoint.approveAllUsersTrashes(id);
      } else if (instance.reviewed && reviewed === false) {
        data.reviewed = null;
      }

      User.beginTransaction({ isolationLevel: User.Transaction.READ_COMMITTED }, function (err, tx) {
        User.updateAll({ id: id }, data, { transaction: tx }, function (err) {
          if (err) {
            console.error(err);
            // Return 404, because in most of time there is a problem with foreign keys in DB (userRole, area)
            return cb({ message: err.detail, status: 404 });
          }

          // Save relations: organizations + badges + areas
          if(organizations && organizations.length) {
            User.app.models.UserHasOrganization.destroyAll({
              userId: id
            }, function() {
              organizations.forEach(function(orgRef) {
                User.app.models.UserHasOrganization.create({
                  userId: id,
                  organizationId: orgRef.organizationId,
                  organizationRoleId: orgRef.organizationRoleId || Constants.USER_ORGANIZATION_ROLE_MEMBER,
                }, { transaction: tx });
              });
            });
          }
          if(badges && badges.length) {
            User.app.models.UserHasBadge.destroyAll({
              userId: id
            }, function() {
              badges.forEach(function(badgeRef) {
                User.app.models.UserHasBadge.create({
                  userId: id,
                  badgeId: badgeRef.id,
                }, { transaction: tx });
              });
            });
          }
          if(areas && areas.length) {
            User.app.models.UserHasArea.destroyAll({
              userId: id
            }, function() {
              areas.forEach(function(areaRef) {
                User.app.models.UserHasArea.create({
                  userId: id,
                  areaId: areaRef.id,
                  userAreaRoleId: areaRef.userAreaRoleId,
                  notification: areaRef.notification === true ? true : false
                }, { transaction: tx });
              });
            });
          }

          var p1, p2 = Promise.defer();
          if (image) {
            var imageData = {
              fullStorageLocation: image.fullStorageLocation,
              fullDownloadUrl: image.fullDownloadUrl,
              thumbDownloadUrl: image.thumbDownloadUrl,
              thumbStorageLocation: image.thumbStorageLocation,
              thumbRetinaStorageLocation: image.thumbRetinaStorageLocation,
              thumbRetinaDownloadUrl: image.thumbRetinaDownloadUrl
            };

            if (instance.imageId) {
              p1 = User.app.models.Image.updateAll({ id: instance.imageId }, imageData, { transaction: tx }, function () {
                p2 = Promise.resolve();
              });
            } else {
              p1 = User.app.models.Image.create(imageData, { transaction: tx }, function (err, imageInstance) {
                p2 = User.updateAll({ id: id }, { imageId: imageInstance.id }, function () {

                });
              });
            }
          } else {
            p1 = Promise.resolve();
            p2 = Promise.resolve();
          }

          Promise.all([p1, p2]).then(function () {

            tx.commit(function (err) {
              if (err) {
                console.error(err);
                return cb({ message: err.detail, status: 403 });
              }

              cb(null, {id: id, statusCode: 200});
            });

          }).catch(function (err) {
            console.eror(err);
            cb(err);
          });

        });
      });

    });
  };


  /**
   * UserPoints list
   *
   * @param {String} emails
   * @param {String} userIds
   * @param {String} minPoints
   * @param {String} maxPoints
   * @param {String} areaIds
   * @param {String} organizationIds
   * @param {String} includeInCleanup - Boolean GET method fix
   * @param {String} reviewed - Boolean GET method fix
   * @param {String} orderBy
   * @param {Number} page
   * @param {Number} limit
   * @param {Function} cb
   * @returns {Array}
   */
  User.list = function (emails, userIds, minPoints, maxPoints, areaIds, organizationIds, includeInCleanup, reviewed, orderBy, page, limit, cb) {
    getListFilter(emails, userIds, minPoints, maxPoints, areaIds, organizationIds, includeInCleanup, reviewed, orderBy, page, limit).then(function (filter) {

      User.find(filter, function (err, instances) {
        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        var payload = [];
        instances.forEach(function (row) {
          var item = toBasicObject(row);

          item.organizations = [];
          item.userHasOrganization.forEach(function (orgRelation) {
            if (orgRelation.organization) {
              orgRelation.organization.organizationRoleId = orgRelation.organizationRoleId;
              item.organizations.push(orgRelation.organization);
            }
          });

          item.badges = [];
          item.userHasBadge.forEach(function (badgeRelation) {
            item.badges.push(badgeRelation.badge);
          });
          item.areas = [];

          item.userHasArea.forEach(function (areaRelation) {
            if(!areaRelation.area) {
              return;
            }
            var areaItem = areaRelation.area;
            areaItem.roleId = areaRelation.userAreaRoleId;
            areaItem.roleName = areaRelation.role ? areaRelation.role.name : null;
            item.areas.push(areaItem);
          });

          // protection of personal data
          if (User.app.models.BaseModel.user.id !== item.id && User.app.models.BaseModel.user.userRole.code !== Constants.USER_ROLE_SUPER_ADMIN) {
            delete item.email;
            delete item.phoneNumber;
          }

          payload.push(item);

          delete item.userHasOrganization;
          delete item.userHasBadge;
          delete item.userHasArea;
          delete item.userRoleId;
        });

        cb(null, payload);
      });
    }).catch(function (error) {
      console.error(error);
      return cb(error);
    });
  };

  /**
   * UserPoints count
   *
   * @param {String} emails
   * @param {String} userIds
   * @param {String} minPoints
   * @param {String} maxPoints
   * @param {String} areaIds
   * @param {String} organizationIds
   * @param {String} includeInCleanup - Boolean GET method fix
   * @param {String} reviewed - Boolean GET method fix
   * @param {Function} cb
   * @returns {Array}
   */
  User.listCount = function (emails, userIds, minPoints, maxPoints, areaIds, organizationIds, includeInCleanup, reviewed, cb) {
    getListFilter(emails, userIds, minPoints, maxPoints, areaIds, organizationIds, includeInCleanup, reviewed).then(function (filter) {

      User.find({where: filter.where}, function (err, instances) {
        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        cb(null, instances.length);
      });

    }).catch(function (error) {
      console.error(error);
      return cb(error);
    });
  };

  User.getUserActivitiesSQL = function(ids, types, page, limit, ownActivitiesOnly, countOnly) {
    var useUnion = false;

    var sql = '';
    if (types.indexOf('trashPoint') !== -1) {
      useUnion = true;

      if (countOnly) {
        sql += 'SELECT result.* \n';
      } else {
        sql += 'SELECT result.*, \n';
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
        sql += '  )::jsonb AS images \n';
      }

      sql += 'FROM ( \n';

      sql += '  SELECT \n';
      if (countOnly) {
        sql += '    tpa.trash_point_id AS id \n';
      } else {
        sql += '    \'trashPoint\' AS type, \n';
        sql += '    CASE WHEN (SELECT row_numbers.row_number FROM (SELECT tpa2.id, row_number() OVER (ORDER BY tpa2.created ASC) AS row_number FROM trash_point_activity tpa2 WHERE tpa2.trash_point_id = tpa.trash_point_id) AS row_numbers WHERE row_numbers.id = tpa.id) = 1 THEN \'create\' ELSE \'update\' END AS action, \n';
        sql += '    tpa.trash_point_id AS id, \n';
        sql += '    tpa.id AS activity_id, \n';

        sql += '    gps.lat AS gps_lat, \n';
        sql += '    gps.long AS gps_long, \n';
        sql += '    gps.accuracy AS gps_accuracy, \n';
        sql += '    gps_source.name AS gps_source, \n';

        sql += '    CASE WHEN gps.zip_id IS NOT NULL THEN \n';
        sql += '      (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.zip_id) AS a) \n';
        sql += '    WHEN gps.street_id IS NOT NULL THEN \n';
        sql += '      (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.street_id) AS a) \n';
        sql += '    WHEN gps.sub_locality_id IS NOT NULL THEN \n';
        sql += '      (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.sub_locality_id) AS a) \n';
        sql += '    WHEN gps.locality_id IS NOT NULL THEN \n';
        sql += '      (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.locality_id) AS a) \n';
        sql += '    WHEN gps.aa3_id IS NOT NULL THEN \n';
        sql += '      (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.aa3_id) AS a) \n';
        sql += '    WHEN gps.aa2_id IS NOT NULL THEN \n';
        sql += '      (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.aa2_id) AS a) \n';
        sql += '    WHEN gps.aa1_id IS NOT NULL THEN \n';
        sql += '      (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.aa1_id) AS a) \n';
        sql += '    WHEN gps.country_id IS NOT NULL THEN \n';
        sql += '      (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.country_id) AS a) \n';
        sql += '    WHEN gps.continent_id IS NOT NULL THEN \n';
        sql += '      (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.continent_id) AS a) \n';
        sql += '    ELSE \n';
        sql += '      NULL \n';
        sql += '    END AS gps_area, \n';

        sql += '    tpa.note AS note, \n';
        sql += '    tpa.status, \n';
        sql += '    tpa.anonymous, \n';
        sql += '    tpa.cleaned_by_me, \n';
        sql += '    tpa.created, \n';
        sql += '    tpa.user_id, \n';
        sql += '    u.email, \n';
        sql += '    u.first_name, \n';
        sql += '    u.last_name \n';
      }

      sql += '  FROM public.trash_point_activity tpa \n';
      sql += '  JOIN public.user u ON u.id = tpa.user_id \n';
      sql += '  JOIN public.gps ON gps.id = tpa.gps_id \n';
      sql += '  JOIN public.gps_source ON gps_source.id = gps.gps_source_id \n';

      if (ownActivitiesOnly === true) {
        sql += '  WHERE tpa.user_id IN(' + sanitize(ids) + ') \n';
      } else {
        sql += '  WHERE (tpa.trash_point_id IN(SELECT DISTINCT(tpa3.trash_point_id) FROM public.trash_point_activity tpa3 WHERE tpa3.user_id IN(' + sanitize(ids) + ')) \n';
        sql += '    AND tpa.created > (SELECT tpa4.created FROM public.trash_point_activity tpa4 WHERE tpa4.user_id IN(' + sanitize(ids) + ') ORDER BY tpa4.created ASC LIMIT 1)) OR tpa.user_id IN(' + sanitize(ids) + ') \n';
      }

      sql += ') AS result \n';
    }


    if (types.indexOf('collectionPoint') !== -1) {
      if (useUnion) {
        sql += 'UNION ALL \n';
      }
      useUnion = true;

      if (countOnly) {
        sql += 'SELECT result.* \n';
      } else {
        sql += 'SELECT result.*, \n';
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
        sql += '  )::jsonb AS images \n';
      }

      sql += 'FROM ( \n';
      sql += '  SELECT \n';
      if (countOnly) {
        sql += '    cpa.collection_point_id AS id \n';
      } else {
        sql += '    \'collectionPoint\' AS type, \n';
        sql += '    CASE WHEN (SELECT row_numbers.row_number FROM (SELECT cpa2.id, row_number() OVER (ORDER BY cpa2.created ASC) AS row_number FROM collection_point_activity cpa2 WHERE cpa2.collection_point_id = cpa.collection_point_id) AS row_numbers WHERE row_numbers.id = cpa.id) = 1 THEN \'create\' ELSE \'update\' END AS action, \n';
        sql += '    cpa.collection_point_id AS id, \n';
        sql += '    cpa.id AS activity_id, \n';

        sql += '    gps.lat AS gps_lat, \n';
        sql += '    gps.long AS gps_long, \n';
        sql += '    gps.accuracy AS gps_accuracy, \n';
        sql += '    gps_source.name AS gps_source, \n';

        sql += '    CASE WHEN gps.zip_id IS NOT NULL THEN \n';
        sql += '      (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.zip_id) AS a) \n';
        sql += '    WHEN gps.street_id IS NOT NULL THEN \n';
        sql += '      (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.street_id) AS a) \n';
        sql += '    WHEN gps.sub_locality_id IS NOT NULL THEN \n';
        sql += '      (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.sub_locality_id) AS a) \n';
        sql += '    WHEN gps.locality_id IS NOT NULL THEN \n';
        sql += '      (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.locality_id) AS a) \n';
        sql += '    WHEN gps.aa3_id IS NOT NULL THEN \n';
        sql += '      (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.aa3_id) AS a) \n';
        sql += '    WHEN gps.aa2_id IS NOT NULL THEN \n';
        sql += '      (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.aa2_id) AS a) \n';
        sql += '    WHEN gps.aa1_id IS NOT NULL THEN \n';
        sql += '      (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.aa1_id) AS a) \n';
        sql += '    WHEN gps.country_id IS NOT NULL THEN \n';
        sql += '      (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.country_id) AS a) \n';
        sql += '    WHEN gps.continent_id IS NOT NULL THEN \n';
        sql += '      (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.continent_id) AS a) \n';
        sql += '    ELSE \n';
        sql += '      NULL \n';
        sql += '    END AS gps_area, \n';

        sql += '    cpa.note AS note, \n';
        sql += '    NULL AS status, \n';
        sql += '    NULL AS anonymous, \n';
        sql += '    NULL AS cleaned_by_me, \n';
        sql += '    cpa.created, \n';
        sql += '    cpa.user_id, \n';
        sql += '    u.email, \n';
        sql += '    u.first_name, \n';
        sql += '    u.last_name \n';
      }

      sql += '  FROM collection_point_activity cpa \n';
      sql += '  JOIN public.user u ON u.id = cpa.user_id \n';
      sql += '  JOIN public.gps ON gps.id = cpa.gps_id \n';
      sql += '  JOIN public.gps_source ON gps_source.id = gps.gps_source_id \n';

      if (ownActivitiesOnly === true) {
        sql += '  WHERE cpa.user_id IN(' + sanitize(ids) + ') \n';
      } else {
        sql += '  WHERE cpa.collection_point_id IN(SELECT DISTINCT(cpa3.collection_point_id) FROM public.collection_point_activity cpa3 WHERE cpa3.user_id IN(' + sanitize(ids) + ')) \n';
        sql += '    AND cpa.created > (SELECT cpa4.created FROM public.collection_point_activity cpa4 WHERE cpa4.user_id IN(' + sanitize(ids) + ') ORDER BY cpa4.created ASC LIMIT 1) \n';
      }

      sql += ') AS result \n';
    }

    if (types.indexOf('event') !== -1) {
      if (useUnion) {
        sql += 'UNION ALL \n';
      }
      useUnion = true;

      sql += 'SELECT \n';
      if (countOnly) {
        sql += '  e.id AS id \n';
      } else {
        sql += '  \'event\' AS type, \n';
        sql += '  \'create\' AS action, \n';
        sql += '  e.id AS id, \n';
        sql += '  NULL AS activity_id, \n';
        sql += '  NULL::jsonb AS images, \n';
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

        sql += '  NULL AS note, \n';
        sql += '  NULL AS status, \n';
        sql += '  NULL AS anonymous, \n';
        sql += '  NULL AS cleaned_by_me, \n';
        sql += '  e.created, \n';
        sql += '  e.user_id, \n';
        sql += '  u.email, \n';
        sql += '  u.first_name, \n';
        sql += '  u.last_name \n';
      }

      sql += 'FROM event e \n';
      sql += 'JOIN public.user u ON u.id = e.user_id \n';
      sql += 'JOIN public.gps ON gps.id = e.gps_id \n';
      sql += 'JOIN public.gps_source ON gps_source.id = gps.gps_source_id \n';
      sql += 'WHERE e.user_id IN(' + sanitize(ids) + ') \n';

      sql += 'UNION ALL \n';

      sql += 'SELECT \n';
      if (countOnly) {
        sql += '  uhe.event_id AS id \n';
      } else {
        sql += '  \'event\' AS type, \n';
        sql += '  \'join\' AS action, \n';
        sql += '  uhe.event_id AS id, \n';
        sql += '  NULL AS activity_id, \n';
        sql += '  NULL::jsonb AS images, \n';
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

        sql += '  NULL AS note, \n';
        sql += '  NULL AS status, \n';
        sql += '  NULL AS anonymous, \n';
        sql += '  NULL AS cleaned_by_me, \n';
        sql += '  uhe.created, \n';
        sql += '  uhe.user_id, \n';
        sql += '  u.email, \n';
        sql += '  u.first_name, \n';
        sql += '  u.last_name \n';
      }

      sql += 'FROM public.user_has_event uhe \n';
      sql += 'JOIN public.user u ON u.id = uhe.user_id \n';
      sql += 'JOIN public.event e ON e.id = uhe.event_id \n';
      sql += 'JOIN public.gps ON gps.id = e.gps_id \n';
      sql += 'JOIN public.gps_source ON gps_source.id = gps.gps_source_id \n';
      sql += 'WHERE uhe.user_id IN(' + sanitize(ids) + ') \n';
    }

    if (countOnly) {
      // nothing to do here
    } else {
      sql += 'ORDER BY created DESC \n';

      if (limit) {
        sql += 'LIMIT ' + sanitize(limit) + ' OFFSET ' + sanitize(limit * (page - 1));
      }
    }

    return sql;
  };

  /**
   * Returns activities for given user
   *
   * @param {Number} id
   * @param {String} type
   * @param {Number} page
   * @param {Number} limit
   * @param {Function} cb
   * @returns {Object}
   */
  User.listActivities = function (id, type, page, limit, cb) {
    var ds = User.app.dataSources.trashout;

    page = page || 0;
    page = Math.max(1, parseInt(page));
    limit = limit || null;

    var types = (type && type.split(',')) || ['trashPoint'];
    // development workaround

    var sql = User.getUserActivitiesSQL([id], types, page, limit);

    ds.connector.execute(sql, User.app.models.BaseModel.sqlParameters, function (err, instances) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      var result = [];

      instances.forEach(function (instance) {
        var temp = {
          type: instance.type,
          action: instance.action,
          id: instance.id,
          created: instance.created,
          userInfo: {
            id: instance.user_id,
            firstName: instance.first_name,
            lastName: instance.last_name
          },
          gps: {
            lat: instance.gps_lat,
            long: instance.gps_long,
            accuracy: instance.gps_accuracy,
            source: instance.gps_source,
            area: instance.gps_area && instance.gps_area.length ? instance.gps_area[0] : null
          }
        };

        if (instance.type === 'trashPoint' || instance.type === 'collectionPoint') {
          temp.activity = {
            id: instance.activity_id,
            images: instance.images,
            note: instance.note
          };
        }

        if (instance.type === 'trashPoint') {
          temp.activity.status = instance.status;
          temp.activity.cleanedByMe = instance.cleaned_by_me;
          temp.activity.anonymous = instance.email ? instance.anonymous : true; // Check if this activity is created by Firebase anonymous user
        }

        result.push(temp);
      });

      cb(null, result);
    });
  };

  /**
   * Returns activities for given user
   *
   * @param {Number} id
   * @param {String} type
   * @param {Function} cb
   * @returns {Object}
   */
  User.listActivitiesCount = function (id, type, cb) {
    var ds = User.app.dataSources.trashout;

    // development workaround
    var types = (type && type.split(',')) || ['trashPoint'];

    var sql = User.getUserActivitiesSQL([id], types, null, null, null, true);

    ds.connector.execute(sql, User.app.models.BaseModel.sqlParameters, function (err, instances) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      cb(null, instances.length);
    });

  };

  /**
   * Returns SQL for review activity
   * - superAdmin can view all the activities
   * - admin of area can view the activities belonging into his area
   *
   * @param {Number} id
   * @param {String} types
   * @param {Boolean} anonymous
   * @param {boolean} areaBased
   * @param {Number} page
   * @param {Number} limit
   * @param {Boolean} countOnly
   * @returns {String}
   */
  User.getUserReviewActivitiesSQL = function (id, types, anonymous, areaBased, page, limit, countOnly) {
    var areaCondition = '';

    if (areaBased) {
      if (User.app.models.BaseModel.user.userRole.code === Constants.USER_ROLE_SUPER_ADMIN) {
        // nothing to do here
      } else {
        areaCondition = ' AND (0 = 1';

        User.app.models.BaseModel.user.userHasArea.forEach(function (relation) {
          if (relation.userAreaRoleId == Constants.USER_AREA_ROLE_ADMIN_ID) {
            areaCondition += 'OR (';
            areaCondition += '  gps.continent_id = ' + relation.areaId + ' OR ';
            areaCondition += '  gps.country_id = ' + relation.areaId + ' OR ';
            areaCondition += '  gps.aa1_id = ' + relation.areaId + ' OR ';
            areaCondition += '  gps.aa2_id = ' + relation.areaId + ' OR ';
            areaCondition += '  gps.aa3_id = ' + relation.areaId + ' OR ';
            areaCondition += '  gps.locality_id = ' + relation.areaId + ' OR ';
            areaCondition += '  gps.sub_locality_id = ' + relation.areaId + ' OR ';
            areaCondition += '  gps.street_id = ' + relation.areaId + ' OR ';
            areaCondition += '  gps.zip_id = ' + relation.areaId;
            areaCondition += ')';
          }
        });

        areaCondition += ' )';
      }
    }

    var useUnion = false;

    var sql = '';
    if (types.indexOf('trashPoint') !== -1) {
      useUnion = true;

      if (countOnly) {
        sql += 'SELECT result.* \n';
      } else {
        sql += 'SELECT result.*, \n';
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
        sql += '  )::jsonb AS images \n';
      }

      sql += 'FROM ( \n';

      sql += '  SELECT \n';
      if (countOnly) {
        sql += '    tpa.trash_point_id AS id \n';
      } else {
        sql += '    \'trashPoint\' AS type, \n';
        sql += '    CASE WHEN (SELECT row_numbers.row_number FROM (SELECT tpa2.id, row_number() OVER (ORDER BY tpa2.created ASC) AS row_number FROM trash_point_activity tpa2 WHERE tpa2.trash_point_id = tpa.trash_point_id) AS row_numbers WHERE row_numbers.id = tpa.id) = 1 THEN \'create\' ELSE \'update\' END AS action, \n';
        sql += '    tpa.trash_point_id AS id, \n';
        sql += '    tpa.id AS activity_id, \n';

        sql += '    gps.lat AS gps_lat, \n';
        sql += '    gps.long AS gps_long, \n';
        sql += '    gps.accuracy AS gps_accuracy, \n';
        sql += '    gps_source.name AS gps_source, \n';

        sql += '    CASE WHEN gps.zip_id IS NOT NULL THEN \n';
        sql += '      (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.zip_id) AS a) \n';
        sql += '    WHEN gps.street_id IS NOT NULL THEN \n';
        sql += '      (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.street_id) AS a) \n';
        sql += '    WHEN gps.sub_locality_id IS NOT NULL THEN \n';
        sql += '      (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.sub_locality_id) AS a) \n';
        sql += '    WHEN gps.locality_id IS NOT NULL THEN \n';
        sql += '      (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.locality_id) AS a) \n';
        sql += '    WHEN gps.aa3_id IS NOT NULL THEN \n';
        sql += '      (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.aa3_id) AS a) \n';
        sql += '    WHEN gps.aa2_id IS NOT NULL THEN \n';
        sql += '      (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.aa2_id) AS a) \n';
        sql += '    WHEN gps.aa1_id IS NOT NULL THEN \n';
        sql += '      (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.aa1_id) AS a) \n';
        sql += '    WHEN gps.country_id IS NOT NULL THEN \n';
        sql += '      (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.country_id) AS a) \n';
        sql += '    WHEN gps.continent_id IS NOT NULL THEN \n';
        sql += '      (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.continent_id) AS a) \n';
        sql += '    ELSE \n';
        sql += '      NULL \n';
        sql += '    END AS gps_area, \n';
        sql += '    tpa.note AS note, \n';
        sql += '    tpa.status, \n';
        sql += '    tpa.anonymous, \n';
        sql += '    tpa.cleaned_by_me, \n';
        sql += '    tpa.created, \n';
        sql += '    tpa.user_id, \n';
        sql += '    u.email, \n';
        sql += '    u.first_name, \n';
        sql += '    u.last_name, \n';
        sql += '    CASE WHEN (SELECT COUNT(gps.id) FROM public.gps WHERE gps.id = tpa.gps_id ' + areaCondition + ') = 1 THEN true ELSE false END AS can_delete \n';
      }

      sql += '  FROM public.trash_point_activity tpa \n';
      sql += '  JOIN public.user u ON u.id = tpa.user_id \n';
      sql += '  JOIN public.gps ON gps.id = tpa.gps_id \n';
      sql += '  JOIN public.gps_source ON gps_source.id = gps.gps_source_id \n';
      sql += '  WHERE tpa.user_id = ' + sanitize(id) + ' \n';

      if (anonymous === 'true' || anonymous === '1') {
        sql += '    AND tpa.anonymous IS TRUE \n';
      } else if (anonymous === 'false' || anonymous === '0') {
        sql += '    AND tpa.anonymous IS FALSE \n';
      }

      sql += ') AS result \n';
    }

    if (types.indexOf('collectionPoint') !== -1) {
      if (useUnion) {
        sql += 'UNION ALL \n';
      }
      useUnion = true;

      if (countOnly) {
        sql += 'SELECT result.* \n';
      } else {
        sql += 'SELECT result.*, \n';
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
        sql += '  )::jsonb AS images \n';
      }

      sql += 'FROM ( \n';

      sql += '  SELECT \n';
      if (countOnly) {
        sql += '    cpa.collection_point_id AS id \n';
      } else {
        sql += '    \'collectionPoint\' AS type, \n';
        sql += '    CASE WHEN (SELECT row_numbers.row_number FROM (SELECT cpa2.id, row_number() OVER (ORDER BY cpa2.created ASC) AS row_number FROM collection_point_activity cpa2 WHERE cpa2.collection_point_id = cpa.collection_point_id) AS row_numbers WHERE row_numbers.id = cpa.id) = 1 THEN \'create\' ELSE \'update\' END AS action, \n';
        sql += '    cpa.collection_point_id AS id, \n';
        sql += '    cpa.id AS activity_id, \n';

        sql += '    gps.lat AS gps_lat, \n';
        sql += '    gps.long AS gps_long, \n';
        sql += '    gps.accuracy AS gps_accuracy, \n';
        sql += '    gps_source.name AS gps_source, \n';

        sql += '    CASE WHEN gps.zip_id IS NOT NULL THEN \n';
        sql += '      (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.zip_id) AS a) \n';
        sql += '    WHEN gps.street_id IS NOT NULL THEN \n';
        sql += '      (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.street_id) AS a) \n';
        sql += '    WHEN gps.sub_locality_id IS NOT NULL THEN \n';
        sql += '     (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.sub_locality_id) AS a) \n';
        sql += '    WHEN gps.locality_id IS NOT NULL THEN \n';
        sql += '      (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.locality_id) AS a) \n';
        sql += '    WHEN gps.aa3_id IS NOT NULL THEN \n';
        sql += '      (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.aa3_id) AS a) \n';
        sql += '    WHEN gps.aa2_id IS NOT NULL THEN \n';
        sql += '      (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.aa2_id) AS a) \n';
        sql += '    WHEN gps.aa1_id IS NOT NULL THEN \n';
        sql += '      (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.aa1_id) AS a) \n';
        sql += '    WHEN gps.country_id IS NOT NULL THEN \n';
        sql += '      (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.country_id) AS a) \n';
        sql += '    WHEN gps.continent_id IS NOT NULL THEN \n';
        sql += '      (SELECT array_to_json(array_agg(a))::jsonb FROM (SELECT a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip FROM area a WHERE a.id = gps.continent_id) AS a) \n';
        sql += '    ELSE \n';
        sql += '      NULL \n';
        sql += '    END AS gps_area, \n';

        sql += '    cpa.note AS note, \n';
        sql += '    NULL AS status, \n';
        sql += '    NULL AS anonymous, \n';
        sql += '    NULL AS cleaned_by_me, \n';
        sql += '    cpa.created, \n';
        sql += '    cpa.user_id, \n';
        sql += '    u.email, \n';
        sql += '    u.first_name, \n';
        sql += '    u.last_name, \n';
        sql += '    CASE WHEN (SELECT COUNT(gps.id) FROM public.gps WHERE gps.id = cpa.gps_id ' + areaCondition + ') = 1 THEN true ELSE false END AS can_delete \n';
      }

      sql += '  FROM collection_point_activity cpa \n';
      sql += '  JOIN public.user u ON u.id = cpa.user_id \n';
      sql += '  JOIN public.gps ON gps.id = cpa.gps_id \n';
      sql += '  JOIN public.gps_source ON gps_source.id = gps.gps_source_id \n';
      sql += '  WHERE cpa.user_id = ' + sanitize(id) + ' \n';

      sql += ') AS result \n';
    }

    if (types.indexOf('event') !== -1) {
      if (useUnion) {
        sql += 'UNION ALL \n';
      }
      useUnion = true;

      sql += 'SELECT \n';
      if (countOnly) {
        sql += '  e.id AS id \n';
      } else {
        sql += '  \'event\' AS type, \n';
        sql += '  \'create\' AS action, \n';
        sql += '  e.id AS id, \n';
        sql += '  NULL AS activity_id, \n';
        sql += '  NULL::jsonb AS images, \n';
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

        sql += '  NULL AS note, \n';
        sql += '  NULL AS status, \n';
        sql += '  NULL AS anonymous, \n';
        sql += '  NULL AS cleaned_by_me, \n';
        sql += '  e.created, \n';
        sql += '  e.user_id, \n';
        sql += '  u.email, \n';
        sql += '  u.first_name, \n';
        sql += '  u.last_name, \n';
        sql += '  false AS can_delete \n';
      }

      sql += 'FROM event e \n';
      sql += 'JOIN public.user u ON u.id = e.user_id \n';
      sql += 'JOIN public.gps ON gps.id = e.gps_id \n';
      sql += 'JOIN public.gps_source ON gps_source.id = gps.gps_source_id \n';
      sql += 'WHERE e.user_id = ' + sanitize(id) + ' \n';

      sql += 'UNION ALL \n';

      sql += 'SELECT \n';
      if (countOnly) {
        sql += '  uhe.event_id AS id \n';
      } else {
        sql += '  \'event\' AS type, \n';
        sql += '  \'join\' AS action, \n';
        sql += '  uhe.event_id AS id, \n';
        sql += '  NULL AS activity_id, \n';
        sql += '  NULL::jsonb AS images, \n';
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

        sql += '  NULL AS note, \n';
        sql += '  NULL AS status, \n';
        sql += '  NULL AS anonymous, \n';
        sql += '  NULL AS cleaned_by_me, \n';
        sql += '  uhe.created, \n';
        sql += '  uhe.user_id, \n';
        sql += '  u.email, \n';
        sql += '  u.first_name, \n';
        sql += '  u.last_name, \n';
        sql += '  false AS can_delete \n';
      }

      sql += 'FROM public.user_has_event uhe \n';
      sql += 'JOIN public.user u ON u.id = uhe.user_id \n';
      sql += 'JOIN public.event e ON e.id = uhe.event_id \n';
      sql += 'JOIN public.gps ON gps.id = e.gps_id \n';
      sql += 'JOIN public.gps_source ON gps_source.id = gps.gps_source_id \n';
      sql += 'WHERE uhe.user_id = ' + sanitize(id) + ' \n';
    }

    if (countOnly) {
      // nothing to do here
    } else {
      sql += 'ORDER BY created DESC \n';

      if (limit) {
        sql += 'LIMIT ' + sanitize(limit) + ' OFFSET ' + sanitize(limit * (page - 1));
      }
    }

    return sql;
  };

  /**
   * Returns activities made by given user only
   * - "canDelete" - whether current user has permissions to delete this activity
   * - "action" - create/update/join
   *
   * @param {Number} id
   * @param {String} type
   * @param {Boolean} anonymous
   * @param {Number} page
   * @param {Number} limit
   * @param {Function} cb
   * @returns {Object}
   */
  User.listReviewActivities = function (id, type, anonymous, page, limit, cb) {
    var ds = User.app.dataSources.trashout;

    page = page || 0;
    page = Math.max(1, parseInt(page));
    limit = limit || null;

    // development workaround
    var types = (type && type.split(',')) || ['trashPoint'];

    var sql = User.getUserReviewActivitiesSQL([id], types, anonymous, true, page, limit);

    ds.connector.execute(sql, User.app.models.BaseModel.sqlParameters, function (err, instances) {

      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      var result = [];

      instances.forEach(function (instance) {
        var temp = {
          type: instance.type,
          action: instance.action,
          id: instance.id,
          created: instance.created,
          userInfo: {
            id: instance.user_id,
            firstName: instance.first_name,
            lastName: instance.last_name
          },
          gps: {
            lat: instance.gps_lat,
            long: instance.gps_long,
            accuracy: instance.gps_accuracy,
            source: instance.gps_source,
            area: instance.gps_area && instance.gps_area.length ? instance.gps_area[0] : null
          },
          canDelete: instance.can_delete
        };

        if (instance.type === 'trashPoint' || instance.type === 'collectionPoint') {
          temp.activity = {
            id: instance.activity_id,
            images: instance.images,
            note: instance.note
          };
        }

        if (instance.type === 'trashPoint') {
          temp.activity.status = instance.status;
          temp.activity.cleanedByMe = instance.cleaned_by_me;
          temp.activity.anonymous = instance.email ? instance.anonymous : true; // Check if this activity is created by Firebase anonymous user
        }

        result.push(temp);
      });

      cb(null, result);
    });
  };

  User.listReviewActivitiesCount = function (id, type, anonymous, cb) {
    var ds = User.app.dataSources.trashout;

    var types = (type && type.split(',')) || ['trashPoint'];
    // development workaround

    var sql = User.getUserReviewActivitiesSQL(id, types, anonymous, true, null, null, true);

    ds.connector.execute(sql, User.app.models.BaseModel.sqlParameters, function (err, instances) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      cb(null, instances.length);
    });

  };

  /**
   * Returns activities made by given user only
   * - "canDelete" - whether current user has permissions to delete this activity
   * - "action" - create/update/join
   *
   * @param {Number} id
   * @param {String} type
   * @param {Boolean} anonymous
   * @param {Number} page
   * @param {Number} limit
   * @param {Function} cb
   * @returns {Object}
   */
  User.listUserActivities = function (id, type, anonymous, page, limit, cb) {
//    if (User.app.models.BaseModel.user.id === id) {
//      return cb({message: 'Only User himself can view his own activities.', status: 401});
//    }

    var ds = User.app.dataSources.trashout;

    page = page || 0;
    page = Math.max(1, parseInt(page));
    limit = limit || null;

    // development workaround
    var types = (type && type.split(',')) || ['trashPoint'];

    var sql = User.getUserReviewActivitiesSQL([id], types, anonymous, false, page, limit);

    ds.connector.execute(sql, User.app.models.BaseModel.sqlParameters, function (err, instances) {

      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      var result = [];

      instances.forEach(function (instance) {
        var temp = {
          type: instance.type,
          action: instance.action,
          id: instance.id,
          created: instance.created,
          userInfo: {
            id: instance.user_id,
            firstName: instance.first_name,
            lastName: instance.last_name
          },
          gps: {
            lat: instance.gps_lat,
            long: instance.gps_long,
            accuracy: instance.gps_accuracy,
            source: instance.gps_source,
            area: instance.gps_area && instance.gps_area.length ? instance.gps_area[0] : null
          }
          //,
          //canDelete: instance.can_delete
        };

        if (instance.type === 'trashPoint' || instance.type === 'collectionPoint') {
          temp.activity = {
            id: instance.activity_id,
            images: instance.images,
            note: instance.note
          };
        }

        if (instance.type === 'trashPoint') {
          temp.activity.status = instance.status;
          temp.activity.cleanedByMe = instance.cleaned_by_me;
          temp.activity.anonymous = instance.email ? instance.anonymous : true; // Check if this activity is created by Firebase anonymous user
        }

        result.push(temp);
      });

      cb(null, result);
    });
  };

  User.listUserActivitiesCount = function (id, type, anonymous, cb) {
//    if (User.app.models.BaseModel.user.id === id) {
//      return cb({message: 'Only User himself can view his own activities.', status: 401});
//    }

    var ds = User.app.dataSources.trashout;

    var types = (type && type.split(',')) || ['trashPoint'];
    // development workaround

    var sql = User.getUserReviewActivitiesSQL(id, types, anonymous, false, null, null, true);

    ds.connector.execute(sql, User.app.models.BaseModel.sqlParameters, function (err, instances) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      cb(null, instances.length);
    });

  };

  /**
   * Returns UserPoints object by Firebase token (x-token) in header
   *
   * @param {Function} cb
   * @returns {Object}
   */
  User.getIdentityByFirebaseToken = function (cb) {
    // UserPoints object is retrieved in BaseModel via X-Token parameter
    var userId = User.app.models.BaseModel.user.id;

    var filter = {
      include: [
        'image',
        'userRole',
        {userHasBadge: 'badge'},
        {userHasArea: 'area'},
        {userHasOrganization: 'organization'},
        'devices'
      ]
    };

    User.findById(userId, filter, function (err, instance) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      if (!instance) {
        return cb({message: 'UserPoints not found by uid provided by firebase.', status: 404});
      }

      User.getStats(instance.id, false, function (err, statsData) {
        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        var payload = instance.toJSON();

        payload.stats = statsData;

        // add "image" field if strongloop has omitted it
        payload.image = payload.image || null;

        // cleanup organizations relation
        payload.organizations = [];
        payload.userHasOrganization.forEach(function (orgRelation) {
          if (orgRelation.organization) {
            orgRelation.organization.organizationRoleId = orgRelation.organizationRoleId;
            payload.organizations.push(orgRelation.organization);
          }
        });

        // cleanup badgs relation
        payload.badges = [];
        payload.userHasBadge.forEach(function (badgeRelation) {
          payload.badges.push(badgeRelation.badge);
        });

        delete payload.imageId;
        delete payload.userHasOrganization;
        delete payload.userHasBadge;

        cb(null, payload);
      });
    });
  };

  /**
   * Find UserPoints by id
   *
   * @param {Number} id
   * @param {Function} cb
   * @returns {Object}
   */
  User.findUser = function (id, cb) {
    var filter = {
      include: [
        'image',
        'userRole',
        { userHasBadge: 'badge' },
        { userHasArea: ['area', 'role'] },
        { userHasOrganization: 'organization' }
      ]
    };

    User.findById(id, filter, function (err, instance) {
      if (err) {
        console.error(err);
        return cb({ message: err.detail });
      }

      if (!instance) {
        return cb({ message: 'UserPoints not found', status: 404 });
      }

      instance.imageId = undefined;
      var current = instance.toJSON();
      current.reviewed = Boolean(current.reviewed);

      User.getStats(current.id, true, function (err, statsData) {

        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        current.stats = statsData;
        var payload = toBasicObject(current);

        // add "image" field if strongloop has omitted it
        payload.image = payload.image || null;

        // cleanup organizations relation
        payload.organizations = [];
        current.userHasOrganization.forEach(function (orgRelation) {
          if (orgRelation.organization) {
            orgRelation.organization.organizationRoleId = orgRelation.organizationRoleId;
            payload.organizations.push(orgRelation.organization);
          }
        });

        // cleanup badges relation
        payload.badges = [];
        current.userHasBadge.forEach(function (badgeRelation) {
          payload.badges.push(badgeRelation.badge);
        });

        // cleanup areas relation
        payload.areas = [];
        current.userHasArea.forEach(function (areaRelation) {
          payload.areas.push(areaRelation.area);
        });

        // protection of personal data
        if (User.app.models.BaseModel.user.id !== payload.id && User.app.models.BaseModel.user.userRole.code !== Constants.USER_ROLE_SUPER_ADMIN) {
          delete payload.email;
          delete payload.phoneNumber;
        }

        delete payload.imageId;
        delete payload.userHasOrganization;
        delete payload.userHasBadge;
        delete payload.userHasArea;

        cb(null, payload);
      });
    });
  };

  /**
   *
   * @param {String} emails
   * @param {Function} cb
   * @returns {Array}
   */
  User.getUsersByEmail = function (emails, cb) {
    if (User.app.models.BaseModel.user.userRole.code !== Constants.USER_ROLE_SUPER_ADMIN) {
      // if user is not superAdmin, check whether current user is manager in at least one organization
      var isManager = false;
      User.app.models.BaseModel.user.userHasOrganization.forEach(function (orgRelation) {
        if (orgRelation.organizationRoleId == Constants.USER_ORGANIZATION_ROLE_MANAGER) {
          isManager = true;
        }
      });

      if (!isManager) {
        return cb({message: "Only superAdmin or organization manager can use this endpoint.", status: 403});
      }
    }

    var filter = {
      where: {
        email: {
          inq: emails.split(',')
        }
      }
    };

    User.find(filter, function (err, instances) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      var result = [];
      instances.forEach(function (instance) {
        result.push({
          id: instance.id,
          firstName: instance.firstName,
          lastName: instance.lastName,
          email: instance.email
        });
      });

      cb(null, result);
    });
  };

  /**
   *
   * @param {Number} limit
   * @param {Number} page
   * @param {String} orderBy
   * @param {Function} cb
   */
  User.getUnreviewedUsersWithActivity = function (limit, page, orderBy, cb) {

    var currentPage = Math.max(page, 1);
    orderBy = orderBy || 'created DESC';

    User.app.models.TrashPointActivity.find({fields: {userId: true}}, function (err, userIdsFromActivities) {

      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      var userIds = [];
      userIdsFromActivities.forEach(function (item) {
        userIds.push(item.userId);
      });

      var filter = {
        where: {
          reviewed: null,
          id: {inq: userIds}
        },
        order: orderBy,
        include: [
          'image',
          'userRole',
          {userHasBadge: 'badge'},
          {userHasArea: 'area'},
          {userHasOrganization: 'organization'}
        ]
      };

      if (limit) {
        filter.limit = limit;
        filter.skip = parseInt(limit * (currentPage - 1));
      }

      User.find(filter, function (err, dataset) {
        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        // cleanup relations
        var payload = [];
        dataset.forEach(function (item) {

          item = toBasicObject(item);

          item.organizations = [];
          item.userHasOrganization.forEach(function (orgRelation) {
            item.organizations.push(orgRelation.organization);
          });

          item.badges = [];
          item.userHasBadge.forEach(function (badgeRelation) {
            item.badges.push(badgeRelation.badge);
          });

          item.areas = [];
          item.userHasArea.forEach(function (areaRelation) {
            item.areas.push(areaRelation.area);
          });

          delete item.userHasOrganization;
          delete item.userHasBadge;
          delete item.userHasArea;

          payload.push(item);
        });

        cb(null, payload);
      });
    });

  };

  /**
   * @param {Function} cb
   */
  User.getUnreviewedUsersWithActivityCount = function (cb) {

    User.app.models.TrashPointActivity.find({fields: {userId: true}}, function (err, userIdsFromActivities) {

      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      var userIds = [];
      userIdsFromActivities.forEach(function (item) {
        userIds.push(item.userId);
      });

      var filter = {
        where: {
          reviewed: null,
          id: {inq: userIds}
        },
        include: [
          'image',
          'userRole',
          {userHasBadge: 'badge'},
          {userHasArea: 'area'},
          {userHasOrganization: 'organization'}
        ]
      };

      User.count(filter.where, function (err, count) {
        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        cb(null, count);
      });
    });

  };

  /**
   *
   * @param {Number} organizationId
   * @param {Function} cb
   * @returns {Object}
   */
  User.joinOrganization = function (organizationId, cb) {
    var data = {
      userId: User.app.models.BaseModel.user.id,
      organizationId: organizationId,
      organizationRoleId: Constants.USER_ORGANIZATION_ROLE_MEMBER
    };

    User.app.models.UserHasOrganization.create(data, function (err) {
      if (err) {
        console.error(err);
        return cb({ message: err.detail });
      }

      cb(null, { success: true });
    });
  };

  /**
   *
   * @param {Number} organizationId
   * @param {Function} cb
   * @returns {Object}
   */
  User.leaveOrganization = function (organizationId, cb) {
    var filter = {
      userId: User.app.models.BaseModel.user.id,
      organizationId: organizationId
    };

    User.app.models.UserHasOrganization.deleteAll(filter, {}, function (err) {
      if (err) {
        console.error(err);
        return cb({ message: err.detail });
      }

      cb(null, { success: true });
    });
  };

  /**
   * Disable user
   *
   * @param {Number} id
   * @param {Function} cb
   * @returns {Object}
   */
  User.disableUser = function (id, cb) {

    User.findById(id, function (err, instance) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      if (!instance) {
        return cb({message: 'User not found.', status: 404});
      }

      if ([Constants.USER_ROLE_SUPER_ADMIN, Constants.USER_ROLE_ADMIN].indexOf(User.app.models.BaseModel.user.userRole.code) === -1 && parseInt(User.app.models.BaseModel.user.userRole.id) !== parseInt(id)) {
        return cb({message: 'Authorization required', status: 401});
      }

      var data = {
        active: false,
        uid: null,
        firstName: null,
        lastName: null,
        email: null,
        info: null,
        birthdate: null,
        newsletter: false,
        tokenFCM: null,
        facebookUrl: null,
        facebookUID: null,
        twitterUrl: null,
        googlePlusUrl: null,
        phoneNumber: null,
        points: 0,
        eventOrganizer: false
      };

      User.updateAll({id: instance.id}, data, function (err) {
        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        cb(null, {success: true});
      });
    });
  };

  /**
   * Get user stats (trashpoint counts by action type)
   * @param {Number} userId
   * @param {Boolean} nonAnonymousOnly
   * @param {Function} callback
   * @returns {Object}
   */
  User.getStats = function (userId, nonAnonymousOnly, callback) {
    var ds = User.app.dataSources.trashout;

    var sql = '';
    sql += 'SELECT \n';
    sql += '  u.id, \n';

    // Select all the reported trashes
    sql += '  (SELECT count(*) FROM public.trash_point_activity tpa WHERE tpa.user_id = u.id AND tpa.status IN(\'stillHere\', \'more\', \'less\') ' + (nonAnonymousOnly ? ' AND tpa.anonymous IS FALSE': '') + ' AND tpa.is_first IS TRUE) AS reported, \n';

    // Select all the updated trashes without first reported ones
    sql += '  (SELECT count(*) FROM public.trash_point_activity tpa WHERE tpa.user_id = u.id AND tpa.status IN(\'stillHere\', \'more\', \'less\') ' + (nonAnonymousOnly ? ' AND tpa.anonymous IS FALSE': '') + ' AND tpa.is_first IS NOT TRUE) AS updated, \n';

    // Select all the cleaned trashes
    sql += '  (SELECT count(*) FROM public.trash_point_activity tpa WHERE tpa.user_id = u.id AND tpa.cleaned_by_me = TRUE AND tpa.status = \'cleaned\'' + (nonAnonymousOnly ? ' AND tpa.anonymous IS FALSE': '') + ') AS cleaned \n';

    sql += 'FROM \n';
    sql += '  public.user u \n';
    sql += 'WHERE u.id = ' + sanitize(parseInt(userId));

    ds.connector.execute(sql, User.app.models.BaseModel.sqlParameters, function (err, dataset) {
      if (err) {
        return callback(err);
      }

      if (dataset && dataset.length) {
        callback(null, dataset.pop());
      } else {
        callback(null);
      }
    });
  };

  /**
   * Get user stats - direct method for route
   * @param {Number} userId
   * @param {Function} cb
   * @returns {Object}
   */
  User.getUserStatistics = function (userId, cb) {
    User.getStats(userId, true, function (err, dataset) {
      if (err) {
        console.error(err);
        return cb(err);
      }

      if (!dataset) {
        console.error(err);
        return cb({ message: 'User not found.', status: 404 });
      }

      cb(null, dataset);
    });
  };

  /**
   * Increments user points
   * @param {Number} userId
   * @param {Number} points
   * @param {Function} cb (optional)
   */
  User.incrementPoints = function(userId, points, cb) {
    User.findById(userId, function(err, usr) {
      var prevPoints = parseInt(usr.points) || 0;
      var newPoints = prevPoints + parseInt(points);

      User.updateAll({ id: userId }, {
        points: newPoints
      });

      if (typeof(cb) === 'function') {
        cb(null, newPoints);
      }
    });
  };

  /**
   * Calculates user's points and persists the sum to the datasource
   * @param {Number} userId
   * @param {Function} cb
   */
  User.refreshPoints = function(userId, cb) {
    User.findById(userId, function(err) {

      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      var sql = 'SELECT u1.id,' +
        '(SELECT COALESCE(count(*), 0) FROM public.trash_point WHERE user_id = u1.id) AS trash_points_created,' +
        '(SELECT COALESCE(count(*), 0) FROM public.trash_point_activity WHERE user_id = u1.id) AS trash_points_updated,' +
        '(SELECT COALESCE(count(tp.id), 0) FROM public.trash_point tp WHERE tp.id IN (SELECT trash_point_id FROM public.trash_point_activity WHERE user_id != u1.id AND status != \'cleaned\') AND user_id = u1.id) AS trash_points_with_update,' +
        '(SELECT COALESCE(count(tp.id), 0) FROM public.trash_point tp WHERE tp.id IN (SELECT trash_point_id FROM public.trash_point_activity WHERE user_id != u1.id AND status = \'cleaned\') AND user_id = u1.id) AS trash_points_cleaned ' +
        'FROM public.user u1 WHERE u1.id = ' + parseInt(userId);

      var ds = User.app.dataSources.trashout;
      ds.connector.execute(sql, function (err, stats) {
        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        var row = stats.pop();

        var newPointsCount = UserPoints.calculateUserPoints(
            row.trash_points_created,
            row.trash_points_updated,
            row.trash_points_with_update,
            row.trash_points_cleaned
        );

        User.updateAll({ id: userId }, {
          points: newPointsCount
        });

        if (typeof(cb) === 'function') {
          cb(null, {
            userId: userId,
            points: newPointsCount
          });
        }
      });
    });
  };

  /**
   * Associates area to user
   *
   * @param {Number} userId
   * @param {Number} areaId
   * @param {Number} notification
   * @param {Number} notificationFrequency
   * @param {Number} userAreaRoleId
   * @param {Function} cb
   */
  User.addArea = function (userId, areaId, notification, notificationFrequency, userAreaRoleId, cb) {

    var reject = cb;

    if (User.app.models.BaseModel.user.id === userId) {
      if (userAreaRoleId !== Constants.USER_AREA_ROLE_MEMBER_ID) {
        return reject({message: 'User himself can join area only as member.', status: 403});
      }
    } else {
      if ([Constants.USER_ROLE_SUPER_ADMIN, Constants.USER_ROLE_ADMIN].indexOf(User.app.models.BaseModel.user.userRole.code) === -1) {
        return reject({message: 'Authorization required', status: 401});
      }
    }

    // Begin transaction
    User.beginTransaction({isolationLevel: User.Transaction.READ_COMMITTED}, function (err, tx) {
      if (err) {
        console.error(err);
        return reject({message: err.detail});
      }

      // Fetch user data
      User.findById(userId, {include: ['userRole']}, {transaction: tx}, function (err, instance) {
        if (err) {
          console.error(err);
          return reject({message: err.detail});
        }

        if (!instance) {
          return reject({message: 'User not found.', status: 404});
        }

        var userInstance = instance.toJSON();

        // Check whether this relation already exists
        User.app.models.UserHasArea.count({userId: userId, areaId: areaId}, {transaction: tx}, function (err, existing) {
          if (err) {
            console.error(err);
            return cb({message: err.detail});
          }

          if (existing > 0) {
            return cb({message: 'This relation already exists.', status: 400});
          }

          // Check permissions
          AreaAccessControl.checkByAreaId(User.app.models.BaseModel.user, areaId, userAreaRoleId, 'insert').then(function () {
            var relation = {
              userId: userId,
              areaId: areaId,
              notification: notification,
              notificationFrequency: notificationFrequency,
              userAreaRoleId: userAreaRoleId
            };

            // Create new relation
            User.app.models.UserHasArea.create(relation, {transaction: tx}, function (err, instance) {
              if (err) {
                console.error(err);
                return cb({message: err.detail});
              }

              // update user's main role (administrator, manager, authenticated)
              if (userInstance.userRole.code === Constants.USER_ROLE_SUPER_ADMIN) {
                // user is SuperAdmin, there is no need increase role
                tx.commit(function (err) {
                  if (err) {
                    console.error(err);
                    return reject({message: err.detail});
                  }

                  cb(null, instance);
                });
              } else {
                // UserRole ID and UserAreaRole ID has the same numbers - we can use it for comparison
                // The lower number - the higher permissions
                // UserAreaRole "member" (id = 3) != UserRole "authenticated" (id = 3)
                if (userInstance.userRoleId > userAreaRoleId) {

                  User.updateAll({id: userInstance.id}, {userRoleId: userAreaRoleId}, function (err) {
                    if (err) {
                      console.error(err);
                      return cb({message: err.detail});
                    }

                    tx.commit(function (err) {
                      if (err) {
                        console.error(err);
                        return reject({message: err.detail});
                      }

                      cb(null, instance);
                    });

                  });

                } else {

                  tx.commit(function (err) {
                    if (err) {
                      console.error(err);
                      return reject({message: err.detail});
                    }

                    cb(null, instance);
                  });

                }
              }

            });

          }).catch(function (err) {
            return cb(err);
          });

        });

      });

    });
  };

  /**
   * Remove area to user association
   *
   * @param {Number} userId
   * @param {Number} areaId
   * @param {Function} cb
   */
  User.removeArea = function (userId, areaId, cb) {

    var reject = cb;
    // Begin transaction
    User.beginTransaction({isolationLevel: User.Transaction.READ_COMMITTED}, function (err, tx) {
      if (err) {
        console.error(err);
        return reject({message: err.detail});
      }

      // Fetch user data
      User.findById(userId, {include: ['userRole']}, {transaction: tx}, function (err, instance) {
        if (err) {
          console.error(err);
          return reject({message: err.detail});
        }

        if (!instance) {
          return reject({message: 'User not found.', status: 404});
        }

        var userInstance = instance.toJSON();

        // Fetch userHasArea data
        User.app.models.UserHasArea.findOne({where: {areaId: areaId, userId: userId}}, {transaction: tx}, function (err, instance) {
          if (err) {
            console.error(err);
            return cb({message: err.detail});
          }

          if (!instance) {
            return cb({message: 'Relation not found.', status: 404});
          }

          // Check whether current user can remove other users in given user's role from given area
          AreaAccessControl.checkByAreaId(User.app.models.BaseModel.user, areaId, instance.userAreaRoleId, 'remove').then(function () {

            // Delete given user from given area
            User.app.models.UserHasArea.deleteAll({userId: userId, areaId: areaId}, {transaction: tx}, function (err) {
              if (err) {
                console.error(err);
                return cb({message: err.detail});
              }
              // update user's main role (administrator, manager, authenticated)
              if (userInstance.userRole.code === Constants.USER_ROLE_SUPER_ADMIN) {
                // user is SuperAdmin, there is no need decrease role
                tx.commit(function (err) {
                  if (err) {
                    console.error(err);
                    return reject({message: err.detail});
                  }

                  cb(null, {success: true});
                });
              } else {

                // Find whether is given user present in another area and get his highest role
                User.app.models.UserHasArea.findOne({where: {userId: userId}, order: ['userAreaRoleId ASC']}, {transaction: tx}, function (err, instance) {
                  if (err) {
                    console.error(err);
                    return cb({message: err.detail});
                  }

                  // UserRole ID and UserAreaRole ID has same numbers - we can use it for comparison
                  // The lower number - the higher permissions
                  // UserAreaRole "member" (id = 3) != UserRole "authenticated" (id = 3)
                  if (!instance || instance.userAreaRoleId > 2) {
                    // Given user is not present in any other areas (in higher role than "member"). Set him his main role to "authenticated"
                    User.updateAll({id: userId}, {userRoleId: 3}, {transaction: tx}, function (err) {
                      if (err) {
                        console.error(err);
                        return cb({message: err.detail});
                      }

                      tx.commit(function (err) {
                        if (err) {
                          console.error(err);
                          return reject({message: err.detail});
                        }

                        cb(null, {success: true});
                      });
                    });
                  } else {
                    // Given user is present in another area. Set him his highest role
                    User.updateAll({id: userId}, {userRoleId: instance.userAreaRoleId}, {transaction: tx}, function (err) {
                      if (err) {
                        console.error(err);
                        return cb({message: err.detail});
                      }

                      tx.commit(function (err) {
                        if (err) {
                          console.error(err);
                          return reject({message: err.detail});
                        }

                        cb(null, {success: true});
                      });
                    });
                  }
                });
              }

            });
          }).catch(function (err) {
            return cb(err);
          });

        });
      });
    });
  };

  /**
   * Update area to user association
   *
   * @param {Number} userId
   * @param {Number} areaId
   * @param {Number} notification
   * @param {Number} notificationFrequency
   * @param {Number} userAreaRoleId
   * @param {Function} cb
   */
  User.updateArea = function (userId, areaId, notification, notificationFrequency, userAreaRoleId, cb) {

    var reject = cb;

    // Begin transaction
    User.beginTransaction({isolationLevel: User.Transaction.READ_COMMITTED}, function (err, tx) {
      if (err) {
        console.error(err);
        return reject({message: err.detail});
      }

      // Find the relation
      User.app.models.UserHasArea.findOne({where: {userId: userId, areaId: areaId}}, {transaction: tx}, function (err, relation) {
        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        if (!relation) {
          return cb({message: 'This relation does not exist.', status: 404});
        }

        if (User.app.models.BaseModel.user.id === userId) {
          if (userAreaRoleId < relation.userAreaRoleId) {
            return reject({message: 'User himself can\'t increase his permissions.', status: 403});
          }
        } else {

          if ([Constants.USER_ROLE_SUPER_ADMIN, Constants.USER_ROLE_ADMIN].indexOf(User.app.models.BaseModel.user.userRole.code) === -1) {
            return reject({message: 'Authorization required', status: 401});
          }

          if (parseInt(relation.userAreaRoleId) === parseInt(User.app.models.BaseModel.user.userRole.id) && User.app.models.BaseModel.user.userRole.code === Constants.USER_ROLE_ADMIN) {
            return reject({message: 'Admin can\'t decrease other admin\'s role.' , status: 401});
          }
        }

        // Fetch user data
        User.findById(userId, {include: ['userRole']}, {transaction: tx}, function (err, instance) {
          if (err) {
            console.error(err);
            return reject({message: err.detail});
          }

          if (!instance) {
            return reject({message: 'User not found.', status: 404});
          }

          var userInstance = instance.toJSON();

          // Check permissions
          AreaAccessControl.checkByAreaId(User.app.models.BaseModel.user, areaId, userAreaRoleId, 'update').then(function () {

            var relationUpdate = {
              notification: notification,
              notificationFrequency: notificationFrequency,
              userAreaRoleId: userAreaRoleId,
              userId: userId,
              areaId: areaId
            };

            // Update relation
            User.app.models.UserHasArea.updateAll({userId: userId, areaId: areaId}, relationUpdate, function (err) {
              if (err) {
                console.error(err);
                return cb({message: err.detail});
              }

              if (userAreaRoleId === relation.userAreaRoleId || userInstance.userRole.code === Constants.USER_ROLE_SUPER_ADMIN) {
                // user has not changed his roleId
                // or is super admin - we can't decrease/increase is role
                tx.commit(function (err) {
                  if (err) {
                    console.error(err);
                    return reject({message: err.detail});
                  }

                  cb(null, relationUpdate);
                });
              } else {
                // UserRole ID and UserAreaRole ID has the same numbers - we can use it for comparison
                // The lower number - the higher permissions
                // UserAreaRole "member" (id = 3) != UserRole "authenticated" (id = 3)
                if (userInstance.userRoleId > userAreaRoleId) {

                  User.updateAll({id: userInstance.id}, {userRoleId: userAreaRoleId}, function (err) {
                    if (err) {
                      console.error(err);
                      return cb({message: err.detail});
                    }

                    tx.commit(function (err) {
                      if (err) {
                        console.error(err);
                        return reject({message: err.detail});
                      }

                      cb(null, relationUpdate);
                    });

                  });

                } else {

                  tx.commit(function (err) {
                    if (err) {
                      console.error(err);
                      return reject({message: err.detail});
                    }

                    cb(null, relationUpdate);
                  });

                }
              }

            });

          }).catch(function (err) {
            return cb(err);
          });

        });
      });
    });

  };

  /**
   * Get user's area
   *
   * @param {Number} rootAreaId Subarea identifier in user's areas - e. g. User is admin in Europe and wants to filter only managers in Czech Republic
   * @param {Number} userAreaRoleId
   * @param {Function} cb
   */
  User.getUserArea = function (rootAreaId, userAreaRoleId, cb) {
    var ds = User.app.dataSources.trashout;
    var userAreaIds = [];
    var areaTypes = ['continent', 'country', 'aa1', 'aa2', 'aa3', 'locality', 'subLocality', 'street', 'zip'];

    User.app.models.BaseModel.user.userHasArea.forEach(function (relation) {
      userAreaIds.push(relation.areaId);
    });

    // Fetch user areas info
    User.app.models.Area.find({where: {id: {inq: userAreaIds}}}, function (err, instances) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      // Fetch root area info
      // Send SQL query even if rootAreaId is not set - otherwise it would be ugly code with Promises
      User.app.models.Area.findOne({where: {id: rootAreaId}}, function (err, rootAreaInstance) {
        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        var sql = '';
        sql += 'SELECT \n';
        sql += '  uha.*, \n';
        sql += '  a.type AS area_type, \n';
        sql += '  a.continent AS area_continent, \n';
        sql += '  a.country AS area_country, \n';
        sql += '  a.aa1 AS area_aa1, \n';
        sql += '  a.aa2 AS area_aa2, \n';
        sql += '  a.aa3 AS area_aa3, \n';
        sql += '  a.locality AS area_locality, \n';
        sql += '  a.sub_locality AS area_sub_locality, \n';
        sql += '  a.street AS area_street, \n';
        sql += '  a.zip AS area_zip \n';
        sql += 'FROM public.user_has_area uha \n';
        sql += 'JOIN public.area a ON a.id = uha.area_id \n';
        sql += 'WHERE 1 = 1 AND ( 0 = 1';

        instances.forEach(function (instance) {
          sql += ' \n OR ( 1 = 1';
          areaTypes.forEach(function (areaType, ordinalNumber) {
            if (areaTypes.indexOf(instance.type) >= ordinalNumber) {
              var columnName = areaType === 'subLocality' ? 'sub_locality' : areaType;
              var value = instance[areaType];
              if (value) {
                sql += ' AND a.' + columnName + ' = ' + sanitize(value);
              }
            }
          });

          sql += ' ) \n';
        });

        if (User.app.models.BaseModel.user.userRole.code === Constants.USER_ROLE_SUPER_ADMIN) {
          sql += ' OR 1 = 1';
        }
        sql += ') ';

        if (rootAreaId && rootAreaInstance) {
          areaTypes.forEach(function (areaType, ordinalNumber) {
            if (areaTypes.indexOf(rootAreaInstance.type) >= ordinalNumber) {
              var columnName = areaType === 'subLocality' ? 'sub_locality' : areaType;
              var value = rootAreaInstance[areaType];
              if (value) {
                sql += ' AND a.' + columnName + ' = ' + sanitize(value);
              }
            }
          });
        }

        if (userAreaRoleId) {
          sql += ' AND uha.user_area_role_id = ' + sanitize(userAreaRoleId);
        }

        ds.connector.execute(sql, User.app.models.BaseModel.sqlParameters, function (err, instances) {
          if (err) {
            console.error(err);
            return cb({message: err.detail});
          }

          var result = [];
          instances.forEach(function (instance) {
            result.push({
              areaId: instance.area_id,
              area: {
                id: instance.area_id,
                type: instance.area_type,
                continent: instance.area_continent,
                country: instance.area_country,
                aa1: instance.area_aa1,
                aa2: instance.area_aa2,
                aa3: instance.area_aa3,
                locality: instance.area_locality,
                subLocality: instance.area_sub_locality,
                street: instance.area_street,
                zip: instance.area_zip
              },
              userId: instance.user_id,
              id: instance.id,
              notification: instance.notification,
              notificationFrequency: instance.notification_frequency,
              userAreaRoleId: instance.user_area_role_id
            });
          });

          cb(null, result);
        });

      });
    });
  };

  /**
   *
   * @param {Function} cb
   * @returns {Array}
   */
  User.getDevices = function (cb) {
    var filter = {
      where: {
        userId: User.app.models.BaseModel.user.id
      }
    };

    User.app.models.Device.find(filter, function (err, devices) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      cb(null, devices);
    });
  };

  /**
   *
   * @param {String} tokenFCM
   * @param {String} deviceId
   * @param {String} language
   * @param {Function} cb
   * @returns {void}
   */
  User.addDevice = function (tokenFCM, deviceId, language, cb) {
    // console log debug info
    console.log('Call User.addDevice(tokenFCM:'+tokenFCM+', deviceId:'+deviceId+', language:'+language+')');

    // sentry info event
    if (Sentry) {
      Sentry.withScope(function(scope) {
        scope.setContext("arguments", arguments);
        scope.setContext("logged user", User.app.models.BaseModel.user);
        Sentry.captureMessage('Call User.addDevice()');
      });
    }

    var filter = {
      where: {
        deviceId: {neq: "addDevice"}, // temp debug // TODO: remove after debugging
        userId: User.app.models.BaseModel.user.id,
        tokenFCM: tokenFCM
      }
    };

    User.app.models.Device.findOne(filter, function (err, device) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      if (device) {
        return cb({message: 'Token already exists.', status: 404});
      }

      var data = {
        userId: User.app.models.BaseModel.user.id,
        tokenFCM: tokenFCM,
        deviceId: deviceId,
        language: language
      };

      User.app.models.Device.create(data, function (err, device) {
        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        cb(null, device);
      });
    });
  };

  /**
   *
   * @param {String} tokenFCM
   * @param {Function} cb
   * @returns {void}
   */
  User.deleteDevice = function (tokenFCM, cb) {
    // console log debug info
    console.log('Call User.deleteDevice(tokenFCM:'+tokenFCM+')');

    // sentry info event
    if (Sentry) {
      Sentry.withScope(function (scope) {
        scope.setContext("arguments", arguments);
        scope.setContext("logged user", User.app.models.BaseModel.user);
        Sentry.captureMessage('Call User.deleteDevice()');
      });
    }

    var filter = {
      where: {
        language: {neq: "deleteDevice"}, // temp debug // TODO: remove after debugging
        userId: User.app.models.BaseModel.user.id,
        tokenFCM: tokenFCM
      }
    };

    User.app.models.Device.findOne(filter, function (err, device) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      if (!device) {
        return cb({message: 'Token not found.', status: 404});
      }

      User.app.models.Device.destroyAll({tokenFCM: tokenFCM}, function (err) {
        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        cb(null);
      });
    });
  };

  User.testGetParameters = function (number, string, boolean, cb) {
    return cb(null, {
      number: number,
      string: string,
      boolean: boolean
    });
  };

  User.testPostParameters = function (number, string, boolean, object, cb) {
    return cb(null, {
      number: number,
      string: string,
      boolean: boolean,
      object: object
    });
  };

  // Disable built-in remote methods in order to avoid conflicts
  User.disableRemoteMethod('create', true); // Removes (POST) /user
  User.disableRemoteMethod('upsert', true); // Removes (PUT) /user/:id
  User.disableRemoteMethod('find', true); // Removes (GET) /user
  User.disableRemoteMethod('count', true); // Removes (GET) /user/count
  User.disableRemoteMethod('deleteById', true); // Removes (DELETE) /user/:id

  // remote methods

  User.remoteMethod(
    'testGetParameters',
    {
      http: { path: '/test-get-parameters', verb: 'get' },
      accepts: [
        { arg: 'number', type: 'string' },
        { arg: 'string', type: 'string' },
        { arg: 'boolean', type: 'number' }
      ],
      returns: { type: 'object', root: true }
    }
  );

  User.remoteMethod(
    'testPostParameters',
    {
      http: { path: '/test-post-parameters', verb: 'get' },
      accepts: [
        { arg: 'number', type: 'string' },
        { arg: 'string', type: 'string' },
        { arg: 'boolean', type: 'number' },
        { arg: 'object', type: 'object' }
      ],
      returns: { type: 'object', root: true }
    }
  );

  User.remoteMethod(
    'listCount',
    {
      http: { path: '/count', verb: 'get' },
      accepts: [
        { arg: 'emails', type: 'string' },
        { arg: 'userIds', type: 'string' },
        { arg: 'minPoints', type: 'number' },
        { arg: 'maxPoints', type: 'number' },
        { arg: 'areaIds', type: 'string' },
        { arg: 'organizationIds', type: 'string' },
        { arg: 'includeInCleanup', type: 'string' },
        { arg: 'reviewed', type: 'string' }
      ],
      returns: { arg: 'count', type: 'number' }
    }
  );

  User.remoteMethod(
    'list',
    {
      http: { path: '/', verb: 'get' },
      accepts: [
        { arg: 'emails', type: 'string' },
        { arg: 'userIds', type: 'string' },
        { arg: 'minPoints', type: 'number' },
        { arg: 'maxPoints', type: 'number' },
        { arg: 'areaIds', type: 'string' },
        { arg: 'organizationIds', type: 'string' },
        { arg: 'includeInCleanup', type: 'string' },
        { arg: 'reviewed', type: 'string' },
        { arg: 'orderBy', type: 'string' },
        { arg: 'page', type: 'number' },
        { arg: 'limit', type: 'number' }
      ],
      returns: { type: 'object', root: true }
    }
  );

  User.remoteMethod(
    'findUser',
    {
      http: { path: '/:id/', verb: 'get' },
      accepts: [
        { arg: 'id', type: 'number' }
      ],
      returns: { type: 'object', root: true }
    }
  );

  User.remoteMethod(
    'getUsersByEmail',
    {
      http: { path: '/usersForOrganizationManager', verb: 'get' },
      accepts: [
        { arg: 'emails', type: 'string', required: true }
      ],
      returns: { type: 'object', root: true }
    }
  );

  User.remoteMethod(
    'listActivities',
    {
      http: { path: '/:id/activity', verb: 'get' },
      accepts: [
        { arg: 'id', type: 'integer' },
        { arg: 'type', type: 'string' },
        { arg: 'page', type: 'number' },
        { arg: 'limit', type: 'number' }
      ],
      returns: { type: 'object', root: true }
    }
  );

  User.remoteMethod(
    'listActivitiesCount',
    {
      http: { path: '/:id/activity/count', verb: 'get' },
      accepts: [
        { arg: 'id', type: 'integer' },
        { arg: 'type', type: 'string' }
      ],
      returns: { arg: 'count', type: 'number' }
    }
  );

  User.remoteMethod(
    'listReviewActivities',
    {
      http: { path: '/:id/reviewActivity', verb: 'get' },
      accepts: [
        { arg: 'id', type: 'integer' },
        { arg: 'type', type: 'string' },
        { arg: 'anonymous', type: 'string' },
        { arg: 'page', type: 'number' },
        { arg: 'limit', type: 'number' }
      ],
      returns: { type: 'object', root: true }
    }
  );

  User.remoteMethod(
    'listReviewActivitiesCount',
    {
      http: { path: '/:id/reviewActivity/count', verb: 'get' },
      accepts: [
        { arg: 'id', type: 'integer' },
        { arg: 'type', type: 'string' },
        { arg: 'anonymous', type: 'string' }
      ],
      returns: { arg: 'count', type: 'number' }
    }
  );

  User.remoteMethod(
    'listUserActivities',
    {
      http: { path: '/:id/userActivity', verb: 'get' },
      accepts: [
        { arg: 'id', type: 'integer' },
        { arg: 'type', type: 'string' },
        { arg: 'anonymous', type: 'string' },
        { arg: 'page', type: 'number' },
        { arg: 'limit', type: 'number' }
      ],
      returns: { type: 'object', root: true }
    }
  );

  User.remoteMethod(
    'listUserActivitiesCount',
    {
      http: { path: '/:id/userActivity/count', verb: 'get' },
      accepts: [
        { arg: 'id', type: 'integer' },
        { arg: 'type', type: 'string' },
        { arg: 'anonymous', type: 'string' }
      ],
      returns: { arg: 'count', type: 'number' }
    }
  );

  User.remoteMethod(
    'add',
    {
      http: { path: '/', verb: 'post' },
      accepts: [
        { arg: 'firstName', type: 'string' },
        { arg: 'lastName', type: 'string' },
        { arg: 'email', type: 'string' },
        { arg: 'created', type: 'string' },
        { arg: 'info', type: 'string' },
        { arg: 'birthdate', type: 'date' },
        { arg: 'active', type: 'boolean' },
        { arg: 'newsletter', type: 'boolean' },
        { arg: 'uid', type: 'string', required: true },
        { arg: 'tokenFCM', type: 'string' },
        { arg: 'facebookUrl', type: 'string' },
        { arg: 'facebookUID', type: 'string' },
        { arg: 'twitterUrl', type: 'string' },
        { arg: 'googlePlusUrl', type: 'string' },
        { arg: 'phoneNumber', type: 'string' },
        { arg: 'points', type: 'number' },
        { arg: 'reviewed', type: 'string' },
        { arg: 'eventOrganizer', type: 'boolean' },
        { arg: 'volunteerCleanup', type: 'boolean' },
        { arg: 'userRoleId', type: 'number' },
        { arg: 'areas', type: 'object' },
        { arg: 'organizations', type: 'object' },
        { arg: 'badges', type: 'object' },
        { arg: 'image', type: 'object', description: 'Image data' },
        { arg: 'language', type: 'string' }
      ],
      returns: { type: 'object', root: true }
    }
  );

  User.remoteMethod(
    'upd',
    {
      http: { path: '/:id/', verb: 'put' },
      accepts: [
        { arg: 'id', type: 'number' },
        { arg: 'firstName', type: 'string' },
        { arg: 'lastName', type: 'string' },
        { arg: 'email', type: 'string' },
        { arg: 'info', type: 'string' },
        { arg: 'birthdate', type: 'date' },
        { arg: 'active', type: 'boolean' },
        { arg: 'newsletter', type: 'boolean' },
        { arg: 'uid', type: 'string', required: true },
        { arg: 'tokenFCM', type: 'string' },
        { arg: 'facebookUrl', type: 'string' },
        { arg: 'facebookUID', type: 'string' },
        { arg: 'twitterUrl', type: 'string' },
        { arg: 'googlePlusUrl', type: 'string' },
        { arg: 'phoneNumber', type: 'string' },
        { arg: 'points', type: 'number' },
        { arg: 'reviewed', type: 'boolean' },
        { arg: 'eventOrganizer', type: 'boolean' },
        { arg: 'volunteerCleanup', type: 'boolean' },
        { arg: 'trashActivityEmailNotification', type: 'boolean' },
        { arg: 'userRoleId', type: 'number' },
        { arg: 'areas', type: 'object' },
        { arg: 'organizations', type: 'object' },
        { arg: 'badges', type: 'object' },
        { arg: 'image', type: 'object', description: 'Image data' },
        { arg: 'language', type: 'string' }
      ],
      returns: { type: 'object', root: true }
    }
  );

  User.remoteMethod(
    'del',
    {
      http: { path: '/:id/', verb: 'delete' },
      accepts: [
        { arg: 'id', type: 'number' }
      ]
    }
  );

  User.remoteMethod(
    'getUnreviewedUsersWithActivity',
    {
      http: { path: '/unreviewedWithActivity', verb: 'get' },
      accepts: [
        { arg: 'limit', type: 'number' },
        { arg: 'page', type: 'number' },
        { arg: 'orderBy', type: 'string' }
      ],
      returns: { type: 'object', root: true }
    }
  );

  User.remoteMethod(
    'getUnreviewedUsersWithActivityCount',
    {
      http: { path: '/unreviewedWithActivity/count', verb: 'get' },
      accepts: [],
      returns: { arg: 'count', type: 'number' }
    }
  );

  User.remoteMethod(
    'joinOrganization',
    {
      http: { path: '/joinOrganization/:organizationId/', verb: 'post' },
      accepts: [
        { arg: 'organizationId', type: 'number', required: true }
      ],
      returns: { type: 'object', root: true }
    }
  );

  User.remoteMethod(
    'leaveOrganization',
    {
      http: { path: '/leaveOrganization/:organizationId/', verb: 'delete' },
      accepts: [
        { arg: 'organizationId', type: 'number', required: true }
      ],
      returns: { type: 'object', root: true }
    }
  );

  User.remoteMethod(
    'getIdentityByFirebaseToken',
    {
      http: { path: '/me', verb: 'get' },
      returns: { type: 'object', root: true }
    }
  );

  User.remoteMethod(
    'refreshPoints',
    {
      http: { path: '/refreshPoints/:id', verb: 'put' },
      accepts: [
        { arg: 'id', type: 'number' }
      ],
      returns: { type: 'object', root: true }
    }
  );

  User.remoteMethod(
    'disableUser',
    {
      http: { path: '/disable/:id', verb: 'patch' },
      accepts: [
        { arg: 'id', type: 'number' }
      ],
      returns: { type: 'object', root: true }
    }
  );

  User.remoteMethod(
    'getUserStatistics',
    {
      http: { path: '/stats/:id', verb: 'get' },
      accepts: [
        { arg: 'userId', type: 'number' }
      ],
      returns: { type: 'object', root: true }
    }
  );

  User.remoteMethod(
    'addArea',
    {
      http: { path: '/:userId/area', verb: 'post' },
      accepts: [
        { arg: 'userId', type: 'number', required: true },
        { arg: 'areaId', type: 'number', required: true },
        { arg: 'notification', type: 'string' },
        { arg: 'notificationFrequency', type: 'string' },
        { arg: 'userAreaRoleId', type: 'number', required: true }
      ],
      returns: { type: 'object', root: true }
    }
  );

  User.remoteMethod(
    'removeArea',
    {
      http: { path: '/:userId/area/:areaId', verb: 'delete' },
      accepts: [
          { arg: 'userId', type: 'number', required: true },
          { arg: 'areaId', type: 'number', required: true }
      ],
      returns: { type: 'object', root: true }
    }
  );

  User.remoteMethod(
    'updateArea',
    {
      http: { path: '/:userId/area/:areaId', verb: 'put' },
      accepts: [
          { arg: 'userId', type: 'number', required: true },
          { arg: 'areaId', type: 'number', required: true },
          { arg: 'notification', type: 'string' },
          { arg: 'notificationFrequency', type: 'string' },
          { arg: 'userAreaRoleId', type: 'number', required: true }
      ],
      returns: { type: 'object', root: true }
    }
  );

  User.remoteMethod(
    'getUserArea',
    {
      http: { path: '/area', verb: 'get' },
      accepts: [
          { arg: 'rootAreaId', type: 'number' },
          { arg: 'userAreaRoleId', type: 'number' }
      ],
      returns: { type: 'object', root: true }
    }
  );

  User.remoteMethod(
    'addDevice',
    {
      http: { path: '/devices', verb: 'post' },
      accepts: [
        { arg: 'tokenFCM', type: 'string', required: true },
        { arg: 'deviceId', type: 'string'},
        { arg: 'language', type: 'string', required: true }
      ],
      returns: { type: 'object', root: true }
    }
  );

  User.remoteMethod(
    'getDevices',
    {
      http: { path: '/devices', verb: 'get' },
      accepts: [],
      returns: { type: 'object', root: true }
    }
  );

  User.remoteMethod(
    'deleteDevice',
    {
      http: { path: '/devices/:tokenFCM', verb: 'delete' },
      accepts: [
        { arg: 'tokenFCM', type: 'string', required: true }
      ],
      returns: { type: 'object', root: true }
    }
  );

};
