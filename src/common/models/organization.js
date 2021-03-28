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

var Constants = require('../constants');
var Promise = require('bluebird');
var async = require('async');

var toBasicObject = function (obj) {
  return JSON.parse(JSON.stringify(obj));
};

module.exports = function (Organization) {

  /**
   * Returns filter object
   *
   * @param {Object} params
   * @returns {Object}
   */
  Organization.createFilter = function (params) {

    if (typeof params === 'string') {
      params = JSON.parse(params);
    }

    var page = parseInt(params.page) || 1;

    var filter = {
      where: {},
      include: [
        'area',
        'image'
      ],
      order: "created DESC"
    };

    for (var i in params) {
      if(i === 'orderBy') {
        continue;
      }
      if (params.hasOwnProperty(i) && typeof params[i] !== 'undefined') {
        filter.where[i] = params[i];
      }
    }

    /* custom search fields */
    if (params.name) {
      filter.where.name = {
        like: params.name
      };
    }

    if (params.limit) {
      filter.limit = params.limit;
      filter.skip = params.limit * (page - 1);
    }
    if(params.orderBy) {
      var order = [];
      params.orderBy.split(',').forEach(function (str) {
        var column = str.substr(0, 1) === '-' ? str.substr(1) : str;
        var trend = str.substr(0, 1) === '-' ? ' DESC' : ' ASC';

        switch (column) {
        case Constants.ORGANIZATION_ORDER_BY_ID:
        case Constants.ORGANIZATION_ORDER_BY_NAME:
        case Constants.ORGANIZATION_ORDER_BY_CREATED:
          order.push(column + trend);
          break;
        }
      });

      filter.order = order;
    }

    return filter;
  };

  /**
   * Returns list of Organizations matching given conditions
   *
   * @param {String} name
   * @param {String} description
   * @param {String} mailSubject
   * @param {String} mailBodyHtml
   * @param {String} mailBodyMarkdown
   * @param {String} contactEmail
   * @param {String} contactPhone
   * @param {String} contactTwitter
   * @param {String} contactFacebook
   * @param {String} contactGooglePlus
   * @param {String} contactUrl
   * @param {Number} areaId
   * @param {String} type
   * @param {Number} parentId
   * @param {String} orderBy
   * @param {Number} page
   * @param {Number} limit
   * @param {Function} cb
   * @returns {Array}
   */
  Organization.list = function (name, description, mailSubject, mailBodyHtml, mailBodyMarkdown, contactEmail,
                                contactPhone, contactTwitter, contactFacebook, contactGooglePlus, contactUrl,
                                areaId, type, parentId,
                                orderBy, page, limit, cb) {
    var filter = Organization.createFilter({
      name: name,
      description: description,
      type: type,
      mailSubject: mailSubject,
      mailBodyHtml: mailBodyHtml,
      mailBodyMarkdown: mailBodyMarkdown,
      contactEmail: contactEmail,
      contactPhone: contactPhone,
      contactTwitter: contactTwitter,
      contactFacebook: contactFacebook,
      contactGooglePlus: contactGooglePlus,
      contactUrl: contactUrl,
      areaId: areaId,
      parentId: parentId,
      orderBy: orderBy,
      page: page,
      limit: limit
    });

    Organization.find(filter, function (err, instances) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      var output = [];
      instances.forEach(function (inst) {
        var item = toBasicObject(inst);
        item.image = item.image || null;
        delete item.imageId;
        item.area = item.area || null;
        delete item.areaId;
        output.push(item);
      });

      cb(null, output);
    });
  };

  /**
   * Returns count of Organizations matching given conditions
   *
   * @param {String} name
   * @param {String} description
   * @param {String} mailSubject
   * @param {String} mailBodyHtml
   * @param {String} mailBodyMarkdown
   * @param {String} contactEmail
   * @param {String} contactPhone
   * @param {String} contactTwitter
   * @param {String} contactFacebook
   * @param {String} contactGooglePlus
   * @param {String} contactUrl
   * @param {Number} areaId
   * @param {Strng} type
   * @param {Number} parentId
   * @param {Function} cb
   * @returns {Array}
   */
  Organization.listCount = function (name, description, mailSubject, mailBodyHtml, mailBodyMarkdown, contactEmail, contactPhone, contactTwitter, contactFacebook, contactGooglePlus, contactUrl, areaId, type, parentId, cb) {
    var filter = Organization.createFilter({
      name: name,
      description: description,
      type: type,
      mailSubject: mailSubject,
      mailBodyHtml: mailBodyHtml,
      mailBodyMarkdown: mailBodyMarkdown,
      contactEmail: contactEmail,
      contactPhone: contactPhone,
      contactTwitter: contactTwitter,
      contactFacebook: contactFacebook,
      contactGooglePlus: contactGooglePlus,
      contactUrl: contactUrl,
      areaId: areaId,
      parentId: parentId
    });

    Organization.count(filter, function (err, count) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      cb(null, count);
    });
  };

    /**
     *
     * @param {Number} id
     * @param {function} cb
     */
  Organization.detail = function (id, cb) {
    var filter = {
      where: {
        id: id
      },
      include: [
        'area',
        'image',
        {
          organizationHasArea: 'area'
        }
      ]
    };

    Organization.findOne(filter, function (err, item) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      cb(null, item);
    });
  };

  /**
   * Create new organization
   *
   * @param {String} name
   * @param {String} description
   * @param {String} mailSubject
   * @param {String} mailBodyHtml
   * @param {String} mailBodyMarkdown
   * @param {String} contactEmail
   * @param {String} contactPhone
   * @param {String} contactTwitter
   * @param {String} contactFacebook
   * @param {String} contactGooglePlus
   * @param {String} contactUrl
   * @param {Object} areaId
   * @param {String} type
   * @param {Object} image
   * @param {Number} parentId
   * @param {String} language
   * @param {function} cb
   */
  Organization.ins = function (name, description, mailSubject, mailBodyHtml, mailBodyMarkdown, contactEmail, contactPhone, contactTwitter, contactFacebook, contactGooglePlus, contactUrl, areaId, type, image, parentId, language, cb) {
    var data = {
      name: name,
      description: description,
      mailSubject: mailSubject,
      mailBodyHtml: mailBodyHtml,
      mailBodyMarkdown: mailBodyMarkdown,
      contactEmail: contactEmail,
      contactPhone: contactPhone,
      contactTwitter: contactTwitter,
      contactFacebook: contactFacebook,
      contactGooglePlus: contactGooglePlus,
      contactUrl: contactUrl,
      parentId: parentId,
      areaId: areaId,
      type: type ? type : 'other',
      language: language
    };

    // Begin transaction
    Organization.beginTransaction({isolationLevel: Organization.Transaction.READ_COMMITTED}, function (err, tx) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      var imagePromise = Promise.defer();
      if (image) {
        var imageData = {
          fullStorageLocation: image.fullStorageLocation,
          fullDownloadUrl: image.fullDownloadUrl,
          thumbDownloadUrl: image.thumbDownloadUrl,
          thumbStorageLocation: image.thumbStorageLocation,
          thumbRetinaStorageLocation: image.thumbRetinaStorageLocation,
          thumbRetinaDownloadUrl: image.thumbRetinaDownloadUrl
        };

        imagePromise = Organization.app.models.Image.create(imageData);
      } else {
        imagePromise = Promise.resolve();
      }

      Promise.all([imagePromise]).then(function (img) {
        data.imageId = img[0] ? img[0].id : null;

        Organization.create(data, {transaction: tx}, function (err, instance) {
          if (err) {
            console.error(err);
            return cb({message: err.detail});
          }

          var organizationRelation = {
            organizationId: instance.id,
            userId: Organization.app.models.BaseModel.user.id,
            organizationRoleId: Constants.USER_ORGANIZATION_ROLE_MANAGER
          };

          // set current user as organization manager
          Organization.app.models.UserHasOrganization.create(organizationRelation, {transaction: tx}, function (err) {
            if (err) {
              console.error(err);
              return cb({message: err.detail});
            }

            tx.commit(function (err) {
              if (err) {
                console.error(err);
                return cb({message: err.detail});
              }

              cb(null, instance);
            });
          });

        });

      }).catch(function (error) {
        console.error(err);
        return cb(error);
      });

    });
  };

  /**
   * Update an existing organization
   *
   * @param {String} id
   * @param {String} name
   * @param {String} description
   * @param {String} mailSubject
   * @param {String} mailBodyHtml
   * @param {String} mailBodyMarkdown
   * @param {String} contactEmail
   * @param {String} contactPhone
   * @param {String} contactTwitter
   * @param {String} contactFacebook
   * @param {String} contactGooglePlus
   * @param {String} contactUrl
   * @param {Object} areaId
   * @param {String} type
   * @param {Object} image
   * @param {Object} parentId
   * @param {String} language
   * @param {function} cb
   */
  Organization.upd = function (id, name, description, mailSubject, mailBodyHtml, mailBodyMarkdown, contactEmail, contactPhone, contactTwitter, contactFacebook, contactGooglePlus, contactUrl, areaId, type, image, parentId, language, cb) {
    Organization.beginTransaction({isolationLevel: Organization.Transaction.READ_COMMITTED}, function (err, tx) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      Organization.findById(id, {transaction: tx}, function (err, organization) {
        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        if (!organization) {
          return cb({message: "Organization not found by ID " + id, status: 404});
        }

        if (!Organization.canManageOrganization(organization.id)) {
          return cb({message: "Only superAdmin or manager can update this organization.", status: 403});
        }

        var orgData = {
          name: name,
          description: description,
          mailSubject: mailSubject,
          mailBodyHtml: mailBodyHtml,
          mailBodyMarkdown: mailBodyMarkdown,
          contactEmail: contactEmail,
          contactPhone: contactPhone,
          contactTwitter: contactTwitter,
          contactFacebook: contactFacebook,
          contactGooglePlus: contactGooglePlus,
          contactUrl: contactUrl,
          parentId: parentId,
          areaId: areaId,
          type: type ? type : 'other',
          language: language,
        };

        if (image) {
          var imageData = {
            fullStorageLocation: image.fullStorageLocation,
            fullDownloadUrl: image.fullDownloadUrl,
            thumbDownloadUrl: image.thumbDownloadUrl,
            thumbStorageLocation: image.thumbStorageLocation,
            thumbRetinaStorageLocation: image.thumbRetinaStorageLocation,
            thumbRetinaDownloadUrl: image.thumbRetinaDownloadUrl
          };

          Organization.app.models.Image.create(imageData, function (err, img) {
            if (err) {
              console.error(err);
              return cb({message: err.detail});
            }

            orgData.imageId = img.id;

            Organization.updateAll({id: id}, orgData, function (err, inst) {
              if (err) {
                console.error(err);
                return cb({message: err.detail});
              }

              tx.commit(function (err) {
                if (err) {
                  console.error(err);
                  return cb({message: err.detail});
                }

                cb(null, inst);
              });
            });
          });
        } else {
          Organization.updateAll({id: id}, orgData, function (err, inst) {
            if (err) {
              console.error(err);
              return cb({message: err.detail});
            }

            tx.commit(function (err) {
              if (err) {
                console.error(err);
                return cb({message: err.detail});
              }

              cb(null, inst);
            });
          });
        }
      });
    });

  };

  /**
   *
   * @param {Number} id
   * @param {Function} cb
   */
  Organization.del = function (id, cb) {
    Organization.beginTransaction({isolationLevel: Organization.Transaction.READ_COMMITTED}, function (err, tx) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      Organization.findById(id, {transaction: tx}, function (err, organization) {
        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        if (!organization) {
          return cb({message: "Organization not found by ID " + id, status: 404});
        }

        if (!Organization.canManageOrganization(organization.id)) {
          return cb({message: "Only superAdmin or manager can delete this organization.", status: 403});
        }

        Organization.deleteAll({id: organization.id}, {transaction: tx}, function (err) {
          if (err) {
            console.error(err);
            return cb({message: err.detail});
          }

          tx.commit(function (err) {
            if (err) {
              console.error(err);
              return cb({message: err.detail});
            }

            cb(null, {success: true});
          });
        });

      });
    });
  };

  /**
   * Sends email invitations to given organization
   *
   * @param {Number} id
   * @param {Array} emails
   * @param {String} headers
   * @param {String} bodyHtml
   * @param {Function} cb
   * @returns {Object}
   */
  Organization.sendInvitations = function (id, emails, headers, bodyHtml, cb) {

    emails = emails || [];

    Organization.findById(id, function (err, organization) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      if (!organization) {
        return cb({message: "Organization not found by ID " + id, status: 404});
      }

      if (Organization.app.models.BaseModel.user.userRole.code !== Constants.USER_ROLE_SUPER_ADMIN) {
        // if user is not superAdmin, check whether is manager of this organization
        var isManager = false;
        Organization.app.models.BaseModel.user.userHasOrganization.forEach(function (orgRelation) {
          if (orgRelation.organizationId == organization.id) {
            isManager = true;
          }
        });

        if (!isManager) {
          return cb({message: "Only superAdmin or manager/member of this organization can send invitations.", status: 403});
        }
      }

      var emailHtml = bodyHtml || organization.mailBodyHtml;
      var emailHeaders = {
        subject: headers ? (headers.subject || organization.mailSubject) : organization.mailSubject
      };

      async.eachSeries(emails, function (email, callback) {
        emailHeaders.to = email;
        Organization.app.models.BaseModel.sendEmail('organization-invitation', emailHeaders, {html: emailHtml, organization: organization}, Organization.app.models.BaseModel.user.language).then(function () {
          async.setImmediate(callback);
        }).catch (function (error) {
          return cb(error);
        });
      }, function (err) {
        if (err) {
          console.error(err);
          return cb(err);
        }

        cb(null, {
          success: true,
          messagesSent: emails.length
        });
      });

    });

  };

  /**
   * Add new member/manager to organization
   * Only for organization manager or superAdmin
   *
   * @param {Number} id Organization ID
   * @param {Number} userId
   * @param {Number} organizationRoleId
   * @param {Function} cb
   * @returns {Object}
   */
  Organization.addUser = function (id, userId, organizationRoleId, cb) {

    Organization.beginTransaction({isolationLevel: Organization.Transaction.READ_COMMITTED}, function (err, tx) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      Organization.findById(id, {transaction: tx}, function (err, organization) {
        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        if (!organization) {
          return cb({message: "Organization not found by ID " + id, status: 404});
        }

        if (!Organization.canManageOrganization(organization.id)) {
          return cb({message: "Only superAdmin or manager of this organization can add other managers/members.", status: 403});
        }

        var data = {
          userId: userId,
          organizationId: id,
          organizationRoleId: organizationRoleId
        };

        Organization.app.models.UserHasOrganization.deleteAll({userId: userId, organizationId: id}, {transaction: tx}, function (err) {
          if (err) {
            console.error(err);
            return cb({message: err.detail});
          }

          Organization.app.models.UserHasOrganization.create(data, {transaction: tx}, function (err) {
            if (err) {
              console.error(err);
              return cb({message: err.detail});
            }

            tx.commit(function (err) {
              if (err) {
                console.error(err);
                return cb({message: err.detail});
              }

              cb(null, {success: true});
            });
          });
        });
      });
    });
  };

  /**
   * Remove user from organization
   *
   * @param {Number} id Organization ID
   * @param {Number} userId
   * @param {Function} cb
   * @returns {Object}
   */
  Organization.removeUser = function (id, userId, cb) {
    Organization.app.models.UserHasOrganization.deleteAll({
      userId: userId,
      organizationId: id
    }, {}, function (err) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      cb(null, {success: true});
    });
  };

  /**
   * List users associated with an organization
   *
   * @param {Number} id Organization ID
   * @param {Number} organizationRoleIds (optional)
   * @param {Number} limit (optional)
   * @param {Number} page (optional)
   * @param {Function} cb
   * @returns {Object}
   */
  Organization.listUsers = function (id, organizationRoleIds, limit, page, cb) {

    var filter = {
      where: {
        organizationId: id
      },
      include: [
        'user',
        {
          user: 'image'
        }
      ],
      limit: limit,
      skip: ((page || 1) - 1) * limit
    };

    if (organizationRoleIds) {
      filter.where.organizationRoleId = {
        inq: organizationRoleIds.split(',').map(Number).filter(Boolean)
      };
    }

    Organization.app.models.UserHasOrganization.find(filter, function (err, instances) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      var payload = [];
      instances.forEach(function(instance) {
        var temp = instance.toJSON();

        var user = temp.user;
        user.organizationRoleId = temp.organizationRoleId;

        if (Organization.app.models.BaseModel.user.userRole.code !== Constants.USER_ROLE_SUPER_ADMIN) {
          // hide some personal information - because GDPR
          delete user.email;
          delete user.birthdate;
          delete user.phoneNumber;
        }

        payload.push(user);
      });

      cb(null, payload);
    });
  };

  /**
   * List users as array of user IDs
   *
   * @param {Number} id Organization ID
   * @param {Function} cb
   * @returns {Object}
   */
  Organization.listUserIds = function (id, cb) {

    var filter = {
      fields: {
        userId: true
      },
      where: {
        organizationId: id
      }
    };

    Organization.app.models.UserHasOrganization.find(filter, function (err, instances) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      var payload = [];
      instances.forEach(function(instance) {
        var temp = instance.toJSON();

        var user = temp.userId;

        payload.push(user);
      });

      cb(null, payload);
    });
  };

  /**
   * List users associated with an organization
   *
   * @param {Number} id Organization ID
   * @param {Number} organizationRoleIds (optional)
   * @param {Function} cb
   * @returns {Object}
   */
  Organization.listUsersCount = function (id, organizationRoleIds, cb) {
    var filter = {
      where: {
        organizationId: id
      }
    };

    if (organizationRoleIds) {
      filter.where.organizationRoleId = {
        inq: organizationRoleIds.split(',').map(Number).filter(Boolean)
      };
    }

    Organization.app.models.UserHasOrganization.count(filter.where, function (err, count) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      cb(null, count);
    });
  };

  /**
   * Activities of organization's users
   *
   * @param {Number} id
   * @param {String} type
   * @param {Number} page
   * @param {Number} limit
   * @param {Function} cb
   * @returns {Array}
   */
  Organization.activities = function (id, type, page, limit, cb) {
    var ds = Organization.app.dataSources.trashout;

    Organization.findById(id, function (err, instance) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      if (!instance) {
        return cb({message: 'Organization not found.', status: 404});
      }

      Organization.app.models.UserHasOrganization.find({where: {organizationId: id}}, function (err, instances) {
        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        var userIds = [];
        instances.forEach(function(instance){
          userIds.push(instance.userId);
        });

        if (!userIds.length) {
          return cb(null, []);
        }

        var types = (type && type.split(',')) || ['trashPoint'];
        // development workaround

        var sql = Organization.app.models.User.getUserActivitiesSQL(userIds, types, page, limit, true);

        ds.connector.execute(sql, Organization.app.models.BaseModel.sqlParameters, function (err, instances) {
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
              temp.activity.anonymous = instance.anonymous;
            }

            result.push(temp);
          });

          cb(null, result);
        });
      });
    });
  };



  /**
   * Get organization stats
   *
   * @param {Number} id Organization ID
   * @param {Number} organizationRoleIds (optional)
   * @param {Function} cb
   * @returns {Object}
   */
  Organization.stats = function (id, organizationRoleIds, cb) {
    var filter = {
          where: {
            organizationId: id
          },
          include: [
            'user',
            {
              user: 'image'
            }
          ]
        };

        if (organizationRoleIds) {
          filter.where.organizationRoleId = {
            inq: organizationRoleIds.split(',').map(Number).filter(Boolean)
          };
        }

        Organization.app.models.UserHasOrganization.find(filter, function (err, instances) {
          if (err) {
            console.error(err);
            return cb({message: err.detail});
          }

          var payload = [];
          instances.forEach(function(instance) {
            var temp = instance.toJSON();

            var user = temp.user;
            user.organizationRoleId = temp.organizationRoleId;

            payload.push(user.id);
          });

          Organization.getStats(payload, true, function (err, statsData) {
            cb(null, statsData);
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
  Organization.getStats = function (userIds, nonAnonymousOnly, callback) {
    var ds = Organization.app.dataSources.trashout;

    var sqlIds = '(';
    userIds.forEach(function(id) {
      sqlIds += id + ', ';
    });
    sqlIds = sqlIds.substring(0, sqlIds.length - 2);
    sqlIds += ')';

    var sql = '';
    sql += 'SELECT \n';

    // Select all the reported trashes
    sql += '  (SELECT count(*) FROM public.trash_point_activity tpa WHERE tpa.user_id in ' + sqlIds + ' AND tpa.status IN(\'stillHere\', \'more\', \'less\') ' + (nonAnonymousOnly ? ' AND tpa.anonymous IS FALSE': '') + ' AND tpa.is_first IS TRUE) AS reported, \n';

    // Select all the updated trashes without first reported ones
    sql += '  (SELECT count(*) FROM public.trash_point_activity tpa WHERE tpa.user_id in ' + sqlIds + ' AND tpa.status IN(\'stillHere\', \'more\', \'less\') ' + (nonAnonymousOnly ? ' AND tpa.anonymous IS FALSE': '') + ' AND tpa.is_first IS NOT TRUE) AS updated, \n';

    // Select all the cleaned trashes
    sql += '  (SELECT count(*) FROM public.trash_point_activity tpa WHERE tpa.user_id in ' + sqlIds + ' AND tpa.cleaned_by_me = TRUE AND tpa.status = \'cleaned\'' + (nonAnonymousOnly ? ' AND tpa.anonymous IS FALSE': '') + ') AS cleaned \n';


    ds.connector.execute(sql, Organization.app.models.BaseModel.sqlParameters, function (err, dataset) {
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
   * Check if logged user can manage the organization
   *
   * @param {Number} organizationId
   * @return {boolean}
   */
  Organization.canManageOrganization = function (organizationId) {
    if (Organization.app.models.BaseModel.user.userRole.code === Constants.USER_ROLE_SUPER_ADMIN) {
      return true;
    } else {
      // if user is not superAdmin, check whether is manager of this organization
      var isManager = false;
      Organization.app.models.BaseModel.user.userHasOrganization.forEach(function (orgRelation) {
        if (orgRelation.organizationId == organizationId && orgRelation.organizationRoleId == Constants.USER_ORGANIZATION_ROLE_MANAGER) {
          isManager = true;
        }
      });
      return isManager;
    }
  };

  /**
   * Associates area to organization
   *
   * @param {Number} id
   * @param {Number} areaId
   * @param {Number} notificationFrequency
   * @param {Function} cb
   */
  Organization.addArea = function (id, areaId, notificationFrequency, cb) {
    if (!Organization.canManageOrganization(id)) {
      return cb({message: "Only superAdmin or manager can set notifications for this organization.", status: 403});
    }

    // Check whether this relation already exists
    Organization.app.models.OrganizationHasArea.count({organizationId: id, areaId: areaId}, function (err, existing) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      if (existing > 0) {
        return cb({message: 'This relation already exists.', status: 400});
      }

      var relation = {
        organizationId: id,
        areaId: areaId,
        notificationFrequency: notificationFrequency
      };

      // Create new relation
      Organization.app.models.OrganizationHasArea.create(relation, function (err, instance) {
        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        cb(null, instance);
      });

    });

  };

  /**
   * Remove area to organization association
   *
   * @param {Number} organizationId
   * @param {Number} areaId
   * @param {Function} cb
   */
  Organization.removeArea = function (organizationId, areaId, cb) {
    if (!Organization.canManageOrganization(organizationId)) {
      return cb({message: "Only superAdmin or manager can remove notifications for this organization.", status: 403});
    }

    // Remove relation
    Organization.app.models.OrganizationHasArea.deleteAll({organizationId: organizationId, areaId: areaId}, function (err) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      cb(null, {success: true});
    });

  };

  /**
   * Update area to organization association
   *
   * @param {Number} organizationId
   * @param {Number} areaId
   * @param {Number} notificationFrequency
   * @param {Function} cb
   */
  Organization.updateArea = function (organizationId, areaId, notificationFrequency, cb) {
    if (!Organization.canManageOrganization(organizationId)) {
      return cb({message: "Only superAdmin or manager can update notifications for this organization.", status: 403});
    }

    // Update relation
    Organization.app.models.OrganizationHasArea.updateAll({organizationId: organizationId, areaId: areaId}, { notificationFrequency: notificationFrequency }, function (err, instance) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      cb(null, instance);
    });

  };



  Organization.disableRemoteMethod('create', true); // Removes (POST) /organization
  Organization.disableRemoteMethod('find', true); // Removes (GET) /organization
  Organization.disableRemoteMethod('findById', true); // Removes (GET) /organization
  Organization.disableRemoteMethod('count', true); // Removes (GET) /organization/count
  Organization.disableRemoteMethod('upsert', true); // Removes (POST) /organization
  Organization.disableRemoteMethod('deleteById', true); // Removes (DELETE) /organization/:id

  Organization.remoteMethod(
    'detail',
    {
      http: {path: '/:id', verb: 'get'},
      accepts: [
        {arg: 'id', type: 'number'}
      ],
      returns: {type: 'object', root: true}
    }
  );

  Organization.remoteMethod(
    'list',
    {
      http: {path: '/', verb: 'get'},
      accepts: [
        {arg: 'name', type: 'string'},
        {arg: 'description', type: 'string'},
        {arg: 'mailSubject', type: 'string'},
        {arg: 'mailBody', type: 'string'},
        {arg: 'mailBodyMarkdown', type: 'string'},
        {arg: 'contactEmail', type: 'string'},
        {arg: 'contactPhone', type: 'string'},
        {arg: 'contactTwitter', type: 'string'},
        {arg: 'contactFacebook', type: 'string'},
        {arg: 'contactGooglePlus', type: 'string'},
        {arg: 'contactUrl', type: 'string'},
        {arg: 'areaId', type: 'integer'},
        {arg: 'type', type: 'string'},
        {arg: 'parentId', type: 'integer'},
        {arg: 'orderBy', type: 'string'},
        {arg: 'page', type: 'integer'},
        {arg: 'limit', type: 'integer'}
      ],
      returns: {type: 'object', root: true}
    }
  );

  Organization.remoteMethod(
    'listCount',
    {
      http: {path: '/count', verb: 'get'},
      accepts: [
        {arg: 'name', type: 'string'},
        {arg: 'description', type: 'string'},
        {arg: 'mailSubject', type: 'string'},
        {arg: 'mailBody', type: 'string'},
        {arg: 'mailBodyMarkdown', type: 'string'},
        {arg: 'contactEmail', type: 'string'},
        {arg: 'contactPhone', type: 'string'},
        {arg: 'contactTwitter', type: 'string'},
        {arg: 'contactFacebook', type: 'string'},
        {arg: 'contactGooglePlus', type: 'string'},
        {arg: 'contactUrl', type: 'string'},
        {arg: 'areaId', type: 'integer'},
        {arg: 'type', type: 'string'},
        {arg: 'parentId', type: 'integer'}
      ],
      returns: {arg: 'count', type: 'number'}
    }
  );

  Organization.remoteMethod(
    'ins',
    {
      http: {path: '/', verb: 'post'},
      accepts: [
        {arg: 'name', type: 'string'},
        {arg: 'description', type: 'string'},
        {arg: 'mailSubject', type: 'string'},
        {arg: 'mailBody', type: 'string'},
        {arg: 'mailBodyMarkdown', type: 'string'},
        {arg: 'contactEmail', type: 'string'},
        {arg: 'contactPhone', type: 'string'},
        {arg: 'contactTwitter', type: 'string'},
        {arg: 'contactFacebook', type: 'string'},
        {arg: 'contactGooglePlus', type: 'string'},
        {arg: 'contactUrl', type: 'string'},
        {arg: 'areaId', type: 'number'},
        {arg: 'type', type: 'string'},
        {arg: 'image', type: 'object'},
        {arg: 'parentId', type: 'integer'},
        {arg: 'language', type: 'string' }
      ],
      returns: {type: 'object', root: true}
    }
  );

  Organization.remoteMethod(
    'upd',
    {
      http: {path: '/:id/', verb: 'put'},
      accepts: [
        {arg: 'id', type: 'number'},
        {arg: 'name', type: 'string'},
        {arg: 'description', type: 'string'},
        {arg: 'mailSubject', type: 'string'},
        {arg: 'mailBody', type: 'string'},
        {arg: 'mailBodyMarkdown', type: 'string'},
        {arg: 'contactEmail', type: 'string'},
        {arg: 'contactPhone', type: 'string'},
        {arg: 'contactTwitter', type: 'string'},
        {arg: 'contactFacebook', type: 'string'},
        {arg: 'contactGooglePlus', type: 'string'},
        {arg: 'contactUrl', type: 'string'},
        {arg: 'areaId', type: 'number'},
        {arg: 'type', type: 'string'},
        {arg: 'image', type: 'object'},
        {arg: 'parentId', type: 'integer'},
        {arg: 'language', type: 'string' }
      ],
      returns: {type: 'object', root: true}
    }
  );

  Organization.remoteMethod(
    'del',
    {
      http: {path: '/:id', verb: 'delete'},
      accepts: [
        {arg: 'id', type: 'number', required: true},
      ],
      returns: {type: 'object', root: true}
    }
  );

  Organization.remoteMethod(
    'sendInvitations',
    {
      http: {path: '/:id/sendInvitations', verb: 'post'},
      accepts: [
        {arg: 'id', type: 'number', required: true},
        {arg: 'emails', type: 'object', required: true},
        {arg: 'headers', type: 'object'},
        {arg: 'body', type: 'string'}
      ],
      returns: {type: 'object', root: true}
    }
  );

  Organization.remoteMethod(
    'addUser',
    {
      http: {path: '/:id/user/:userId', verb: 'post'},
      accepts: [
        {arg: 'id', type: 'number', required: true},
        {arg: 'userId', type: 'number', required: true},
        {arg: 'organizationRoleId', type: 'number', requried: true}
      ],
      returns: {type: 'object', root: true}
    }
  );

  Organization.remoteMethod(
    'removeUser',
    {
      http: {path: '/:id/user/:userId', verb: 'delete'},
      accepts: [
        {arg: 'id', type: 'number', required: true},
        {arg: 'userId', type: 'number', required: true}
      ],
      returns: {type: 'object', root: true}
    }
  );

  Organization.remoteMethod(
    'listUsers',
    {
      http: {path: '/:id/users', verb: 'get'},
      accepts: [
        {arg: 'id', type: 'number', required: true},
        {arg: 'organizationRoleIds', type: 'string'},
        {arg: 'limit', type: 'number'},
        {arg: 'page', type: 'number'}
      ],
      returns: {type: 'object', root: true}
    }
  );

  Organization.remoteMethod(
    'listUserIds',
    {
      http: {path: '/:id/users/ids', verb: 'get'},
      accepts: [
        {arg: 'id', type: 'number', required: true}
      ],
      returns: {type: 'object', root: true}
    }
  );

  Organization.remoteMethod(
    'listUsersCount',
    {
      http: {path: '/:id/users/count', verb: 'get'},
      accepts: [
        {arg: 'id', type: 'number', required: true},
        {arg: 'organizationRoleIds', type: 'string'}
      ],
      returns: {arg: 'count', type: 'number'}
    }
  );

  Organization.remoteMethod(
    'activities',
    {
      http: {path: '/:id/activity', verb: 'get'},
      accepts: [
        {arg: 'id', type: 'number', required: true},
        {arg: 'type', type: 'string'},
        {arg: 'page', type: 'number'},
        {arg: 'limit', type: 'number'}
      ],
      returns: {type: 'object', root: true}
    }
  );

  Organization.remoteMethod(
    'stats',
    {
      http: {path: '/:id/stats', verb: 'get'},
      accepts: [
        {arg: 'id', type: 'number', required: true},
        {arg: 'organizationRoleIds', type: 'string'}
      ],
      returns: {arg: 'stats', type: 'number'}
    }
  );

  Organization.remoteMethod(
    'addArea',
    {
      http: { path: '/:id/area', verb: 'post' },
      accepts: [
        { arg: 'id', type: 'number', required: true },
        { arg: 'areaId', type: 'number', required: true },
        { arg: 'notificationFrequency', type: 'number' }
      ],
      returns: { type: 'object', root: true }
    }
  );

  Organization.remoteMethod(
    'updateArea',
    {
      http: { path: '/:id/area/:areaId', verb: 'put' },
      accepts: [
        { arg: 'id', type: 'number', required: true },
        { arg: 'areaId', type: 'number', required: true },
        { arg: 'notificationFrequency', type: 'string' }
      ],
      returns: { type: 'object', root: true }
    }
  );

  Organization.remoteMethod(
    'removeArea',
    {
      http: { path: '/:organizationId/area/:areaId', verb: 'delete' },
      accepts: [
        { arg: 'organizationId', type: 'number', required: true },
        { arg: 'areaId', type: 'number', required: true }
      ],
      returns: { type: 'object', root: true }
    }
  );

};
