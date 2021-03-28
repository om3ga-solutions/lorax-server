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
var firebaseFactory = require('./firebaseFactory.js');
var Constants = require('../../common/constants');

module.exports = function (app) {
  var Role = app.models.Role;

  /**
   * Authenticates user via Firebase and saves its instance for further usage
   *
   * @param {String} token
   * @param {String} role
   * @returns {Object}
   */
  function validateToken(token, role) {
    return new Promise(function (resolve, reject) {
      if (!token) {
        return reject({message: 'X-Token is not set.', status: 401});
      }

      firebaseFactory.validateToken(token, function (err, response) {

        if (token === 'e3VzZXJSb2xlOiAnc3VwZXJBZG1pbid9') {
          // user with role "superAdmin" - for endpoint testing purposes
          response = {
            uid: app.settings.port === 3000 ? 'pqGXagDCaRMsY0zmkTGQWe7Y59a2' : '5MTMwZs8RwRQbF8C8dieyk9E3gO2'
          };
        }

        if (token === 'e3VzZXJSb2xlOiBhZG1pbn0=') {
          // user with role "administrator" - for endpoint testing purposes
          response = {
            uid: app.settings.port === 3000 ? 'wRGs7flGaoeSu2J8XM3sMjzaDoo1' : '414047642cd8cfad09e40f3858ce6933007ec15b'
          };
        }

        if (token === 'e3VzZXJSb2xlOiByZXZpZXdlcn0=') {
          // user with role "manager" - for endpoint testing purposes
          response = {
            uid: app.settings.port === 3000 ? '7B9QspizfMRbrZAmunS1RNwPJqA3' : 'TfDSixNHVXfP5LcqPIHBcTGXCCK2'
          };
        }

        if (token === 'e3VzZXJSb2xlOiBhdXRoZW50aWNhdGVkfQ==') {
          // user with role "authenticated" - for endpoint testing purposes
          response = {
            uid: app.settings.port === 3000 ? 'NZAIbmM2ssVo4s1fN42sDo0AG6b2' : 'Hjgtc7SG4TQw74OoNsfuihKg74n2'
          };
        }

        if (err && !response) {
          return reject(err);
        }

        if (role === Constants.USER_ROLE_FIREBASE_TOKEN) {
          app.models.BaseModel.user = {uid: response.uid};
          return resolve();
        }

        app.models.User.findOne({where: {uid: response.uid}, include: ['userRole', {userHasArea: 'role'}, {userHasOrganization: 'organizationRole'}]}, function (err, instance) {
          if (err) {
            console.error(err);
            return reject({message: err.detail});
          }

          if (!instance) {
            return reject({message: 'X-Token is not valid.', status: 401});
          }

          var user = instance.toJSON();

          if (user.userRole.code === role || role === Constants.USER_ROLE_COMMON) {
            app.models.BaseModel.user = user;
            resolve(user);
          } else {
            return reject(null);
            //return reject({message: 'User is not in ' + role + ' role.', status: 401});
          }

        });
      });

    });
  }

  /**
   * Checks whether ApiKey is valid and whether doesn't reached the request count limit
   *
   * @param {String} apiKey
   * @returns {Object}
   */
  function validateApiKey(apiKey) {
    return new Promise(function (resolve, reject) {

      if (!apiKey) {
        return reject({message: 'X-Api-Key is not set.', status: 403});
      }

      app.models.ApiKey.findOne({where: {apiKey: apiKey}}, function (err, keyInstance) {

        if (err) {
          console.error(err);
          return reject(new Error(err.detail));
        }

        if (!keyInstance) {
          return reject({message: 'X-Api-Key is not valid.', status: 403});
        }

//        app.models.Redis.count({apiKey: apiKey}, function (err, count) {
//          if (err) {
//            console.error(err);
//            return reject({message: err.detail});
//          }
//
//          if (count > keyInstance.limitPerHour) {
//            return reject({message: 'Request limit reached.', status: 403});
//          }

        app.models.User.findById(keyInstance.userId, {include: ['userRole', {userHasArea: 'role'}]}, function (err, instance) {
          if (err) {
            console.error(err);
            return reject({message: err.detail});
          }

          if (!instance) {
            return reject({message: 'X-Api-Key is not valid.', status: 404});
          }

          var user = instance.toJSON();

          app.models.BaseModel.user = user;

//          app.models.Redis.create({apiKey: apiKey}, function (err, instance) {
//            if (err) {
//              console.error(err);
//              return reject({message: err.detail});
//            }

//            // Loopback redis connector can't set expiration. We have to use default Redis client to do that
//            RedisClient.expire('Redis:' + instance.id, 3600, function (err) {
//              if (err) {
//                console.error(err);
//                return reject({message: 'Redis error occured when trying to set expiration time.'});
//              }
//
//              resolve(user);
//            });

//          });

          resolve(user);
        });

//        });
      });
    });
  }

  /**
   * SuperAdmin role resolver
   *
   * @param {String} role
   * @param {Object} context
   * @param {Function} cb Callback
   */


  Role.registerResolver(Constants.USER_ROLE_SUPER_ADMIN, function (role, context, cb) {
    function reject(e) {
      process.nextTick(function () {
        if (e && e.status === 440) {
          cb(e, false);
        } else {
          cb(null, false);
        }
      });
    }

    validateToken(context.remotingContext.req.headers['x-token'], role).then(function () {
      return cb(null, true);
    }).catch(function (e) {
      return reject(e);
    });
  });

  /**
   * Admin role resolver
   *
   * @param {String} role
   * @param {Object} context
   * @param {Function} cb Callback
   */
  Role.registerResolver(Constants.USER_ROLE_ADMIN, function (role, context, cb) {
    function reject(e) {
      process.nextTick(function () {
        if (e && e.status === 440) {
          cb(e, false);
        } else {
          cb(null, false);
        }
      });
    }

    validateToken(context.remotingContext.req.headers['x-token'], role).then(function () {
      return cb(null, true);
    }).catch(function (e) {
      return reject(e);
    });
  });

  /**
   * Manager role resolver
   *
   * @param {String} role
   * @param {Object} context
   * @param {Function} cb Callback
   */
  Role.registerResolver(Constants.USER_ROLE_MANAGER, function (role, context, cb) {
    function reject(e) {
      process.nextTick(function () {
        if (e && e.status === 440) {
          cb(e, false);
        } else {
          cb(null, false);
        }
      });
    }

    validateToken(context.remotingContext.req.headers['x-token'], role).then(function () {
      return cb(null, true);
    }).catch(function (e) {
      return reject(e);
    });
  });

  /**
   * Authenticated role resolver
   *
   * @param {String} role
   * @param {Object} context
   * @param {Function} cb Callback
   */
  Role.registerResolver(Constants.USER_ROLE_AUTHENTICATED, function (role, context, cb) {
    function reject(e) {
      process.nextTick(function () {
        if (e && e.status === 440) {
          cb(e, false);
        } else {
          cb(null, false);
        }
      });
    }

    validateToken(context.remotingContext.req.headers['x-token'], role).then(function () {
      return cb(null, true);
    }).catch(function (e) {
      return reject(e);
    });
  });

  /**
   * Common role resolver - virtual role for authorization purposes only (user will obtain his real role)
   * This role is used for checking area based privileges
   *
   * @param {String} role
   * @param {Object} context
   * @param {Function} cb Callback
   */
  Role.registerResolver(Constants.USER_ROLE_COMMON, function (role, context, cb) {
    function reject(e) {
      process.nextTick(function () {
        if (e && e.status === 440) {
          cb(e, false);
        } else {
          cb(null, false);
        }
      });
    }
    validateToken(context.remotingContext.req.headers['x-token'], role).then(function () {
      return cb(null, true);
    }).catch(function (e) {
      return reject(e);
    });
  });

  /**
   * API role resolver
   *
   * @param {String} role
   * @param {Object} context
   * @param {Function} cb Callback
   */
  Role.registerResolver(Constants.USER_ROLE_API_KEY, function (role, context, cb) {
    function reject() {
      process.nextTick(function () {
        cb(null, false);
      });
    }

    validateApiKey(context.remotingContext.req.headers['x-api-key']).then(function () {
      return cb(null, true);
    }).catch(function (e) {
      return reject(e && e.message);
    });
  });

  /**
   * API role resolver
   *
   * @param {String} role
   * @param {Object} context
   * @param {Function} cb Callback
   */
  Role.registerResolver(Constants.USER_ROLE_FIREBASE_TOKEN, function (role, context, cb) {
    function reject() {
      process.nextTick(function () {
        cb(null, false);
      });
    }
    validateToken(context.remotingContext.req.headers['x-token'], role).then(function () {
      return cb(null, true);
    }).catch(function (e) {
      return reject(e && e.message);
    });
  });
};
