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

var server = require('./../server/server');
var Constants = require('./constants');
var Promise = require('bluebird');

var permissions = {
};

permissions[Constants.METHOD_TRASH_POINT_DELETE] = [Constants.USER_AREA_ROLE_ADMIN];
permissions[Constants.METHOD_TRASH_POINT_ACTIVITY_DELETE] = [Constants.USER_AREA_ROLE_ADMIN];
permissions[Constants.METHOD_TRASH_POINT_ACTIVITY_IMAGE_DELETE] = [Constants.USER_AREA_ROLE_ADMIN];

permissions[Constants.METHOD_COLLECTION_POINT_DELETE] = [Constants.USER_AREA_ROLE_ADMIN];
permissions[Constants.METHOD_COLLECTION_POINT_ACTIVITY_DELETE] = [Constants.USER_AREA_ROLE_ADMIN];
permissions[Constants.METHOD_COLLECTION_POINT_ACTIVITY_IMAGE_DELETE] = [Constants.USER_AREA_ROLE_ADMIN];

permissions[Constants.METHOD_SPAM_DELETE] = [Constants.USER_AREA_ROLE_ADMIN];
permissions[Constants.METHOD_SPAM_TRASH_POINT_DELETE] = [Constants.USER_AREA_ROLE_ADMIN];
permissions[Constants.METHOD_SPAM_COLLECTION_POINT_DELETE] = [Constants.USER_AREA_ROLE_ADMIN];
permissions[Constants.METHOD_SPAM_EVENT_DELETE] = [Constants.USER_AREA_ROLE_ADMIN];
permissions[Constants.METHOD_SPAM_RESOLVE] = [Constants.USER_AREA_ROLE_ADMIN];

permissions[Constants.METHOD_USER_HAS_AREA_POST] = [Constants.USER_AREA_ROLE_ADMIN];
permissions[Constants.METHOD_USER_HAS_AREA_PUT] = [Constants.USER_AREA_ROLE_ADMIN];

var modelPropertyNames = {
};

modelPropertyNames[Constants.METHOD_TRASH_POINT_DELETE] = 'deleteTrash';
modelPropertyNames[Constants.METHOD_TRASH_POINT_ACTIVITY_DELETE] = 'deleteActivity';
modelPropertyNames[Constants.METHOD_TRASH_POINT_ACTIVITY_IMAGE_DELETE] = 'deleteActivityImage';

modelPropertyNames[Constants.METHOD_COLLECTION_POINT_DELETE] = 'deleteCollectionPoint';
modelPropertyNames[Constants.METHOD_COLLECTION_POINT_ACTIVITY_DELETE] = 'deleteActivity';
modelPropertyNames[Constants.METHOD_COLLECTION_POINT_ACTIVITY_IMAGE_DELETE] = 'deleteActivityImage';

modelPropertyNames[Constants.METHOD_SPAM_DELETE] = 'deleteSpam';
modelPropertyNames[Constants.METHOD_SPAM_TRASH_POINT_DELETE] = 'deleteSpam';
modelPropertyNames[Constants.METHOD_SPAM_COLLECTION_POINT_DELETE] = 'deleteSpam';
modelPropertyNames[Constants.METHOD_SPAM_EVENT_DELETE] = 'deleteSpam';
modelPropertyNames[Constants.METHOD_SPAM_RESOLVE] = 'resolveSpam';

modelPropertyNames[Constants.METHOD_USER_HAS_AREA_POST] = 'addArea';
modelPropertyNames[Constants.METHOD_USER_HAS_AREA_PUT] = 'removeArea';

var areaTypes = ['continent', 'country', 'aa1', 'aa2', 'aa3', 'locality', 'subLocality', 'street', 'zip'];

/**
 * Check user permission for editing entity (TrashPoint/CollectionPoint/Event etc.) in given Area
 * 
 * @param {Object} user
 * @param {Object} gps
 * @param {Array} acls Array of ACL object
 * @returns {Promise}
 */
module.exports.check = function (method, user, gps, acls) {
  return new Promise(function (resolve, reject) {

    // Check whether user's real role has permissions defined in ACL of current model
    if (acls && checkModelACL(user.userRole.code, modelPropertyNames[method], acls)) {
      return resolve();
    } else {

      if (gps) {
        user.userHasArea.forEach(function (relation) {
          if (permissions[method].indexOf(relation.role.name) === -1) {
            // Skip, user doesn't have corrent permissions
            return;
          }

          if (relation.areaId === gps.continentId ||
            relation.areaId === gps.countryId ||
            relation.areaId === gps.aa1Id ||
            relation.areaId === gps.aa2Id ||
            relation.areaId === gps.aa3Id ||
            relation.areaId === gps.localityId ||
            relation.areaId === gps.subLocalityId ||
            relation.areaId === gps.streetId ||
            relation.areaId === gps.zipId
          ) {
            // User is present in exactly the same Area as given element and has correct permissions (it is checked in first if statement of this forEach)
            return resolve();
          }

        });
      }

      return reject({message: 'User is not authorized in this area.', status: 403});
    }
  });
};

/**
 * Check whether given user can add/remove other users in given role to/from given area
 * 
 * @param {Object} user
 * @param {Number} areaId
 * @param {Number} userAreaRoleId
 * @returns Boolean
 */
module.exports.checkByAreaId = function (user, areaId, userAreaRoleId, operation) {
  return new Promise(function (resolve, reject) {

    if (user.userRole.code === Constants.USER_ROLE_SUPER_ADMIN) {
      // SuperAdmin can do whatever he wants
      return resolve();
    }

    if (user.id === server.models.BaseModel.user.id && userAreaRoleId === Constants.USER_AREA_ROLE_MEMBER_ID) {
      // User can do whatever he wants with himself in member role
      return resolve();
    }

    if (user.id === server.models.BaseModel.user.id && operation === 'remove') {
      // Every user can remove himself from every area in every role
      return resolve();
    }

    if (user.id === server.models.BaseModel.user.id && operation === 'update') {
      var allowUpdate = false;
      user.userHasArea.forEach(function (relation) {
        if (parseInt(relation.areaId) === parseInt(areaId) && relation.userAreaRoleId <= userAreaRoleId){
          // Every user can update his area - if his userAreaRole is 1) lowered 2) not changed at all
          allowUpdate = true;
        }
      });

      if (allowUpdate) {        
        return resolve();
      }
    }

    var userAreaIds = [];
    user.userHasArea.forEach(function (relation) {
      if (relation.userAreaRoleId < userAreaRoleId) {
        // admin can add only lower role (manager, member)
        userAreaIds.push(relation.areaId);
      }
    });

    if (!userAreaIds.length) {
      return reject({message: 'User doesn\'t have correct permissions.', status: 403});
    }

    // Fetch user's area data from database
    server.models.Area.find({where: {id: {inq: userAreaIds}}}, function (err, userAreas) {
      if (err) {
        return reject({message: err.detail});
      }
      // Fetch desired area data from database
      server.models.Area.findById(areaId, function (err, desiredArea) {
        if (err) {
          return reject({message: err.detail});
        }

        if (!desiredArea) {
          return reject({message: 'Area not found.', status: 404});
        }

        // Check whether desired area belongs to at least one of the userAreas (and it's not the same area)
        userAreas.forEach(function (userArea) {
          if (areaTypes.indexOf(userArea.type) > areaTypes.indexOf(desiredArea.type)) {
            // Skip - user cannot add other users to higher area level         
            return;
          }

          areaTypes.forEach(function (areaType, ordinalNumber) {
            if (areaTypes.indexOf(userArea.type) >= ordinalNumber && (userArea[areaType] === desiredArea[areaType] || userArea[areaType] || desiredArea[areaType])) {
              return resolve();
            }
          });
        });
        
        return reject({message: 'User doesn\'t have correct permissions.', status: 403});
      });
    });

  });
};

/**
 * Checks whether user's role has permissions defined in ACL of current model
 * User can't be in virtual role "common" - this function checks only real user roles
 * 
 * @param {String} userRole
 * @param {String} method
 * @param {Array} acls
 * @returns {boolean}
 */
function checkModelACL(userRole, method, acls) {
  var found = false;
  acls.forEach(function (acl) {
    if (acl.principalId === userRole && acl.permission === 'ALLOW' && (typeof (acl.property) === 'undefined' || acl.property === method || acl.property.indexOf(method) !== -1)) {
      found = true;
      return true;
    }
  });

  return found;
}
