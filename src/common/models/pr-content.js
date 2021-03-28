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

module.exports = function (PRContent) {

  /**
   * Stores parameters for parametrized queries and returns parameter number
   * 
   * @param {type} parameter
   * @returns {String}
   */
  function sanitize(parameter) {
    return PRContent.app.models.BaseModel.sanitize(parameter);
  }

  /**
   * 
   * @param {String} language
   * @param {String} geoAreaZip
   * @param {String} geoAreaStreet
   * @param {String} geoAreaSubLocality
   * @param {String} geoAreaLocality
   * @param {String} geoAreaAa3
   * @param {String} geoAreaAa2
   * @param {String} geoAreaAa1
   * @param {String} geoAreaCountry
   * @param {String} geoAreaContinent
   * @param {String} searchKeyWord
   * @returns {String}
   */
  function getPRContentListFilterWhereClause(language, geoAreaZip, geoAreaStreet, geoAreaSubLocality, geoAreaLocality, geoAreaAa3, geoAreaAa2, geoAreaAa1, geoAreaCountry, geoAreaContinent, searchKeyWord) {
    var sql = 'WHERE 1 = 1 \n';

    if (language) {
      sql += '  AND  pc.language = ' + sanitize(language) + ' \n';
    }

    if (geoAreaZip) {
      sql += ' AND pc.area_id IN (SELECT a.id FROM public.area a WHERE a.zip = ' + sanitize(geoAreaZip) + ') \n';
    }

    if (geoAreaStreet) {
      sql += ' AND pc.area_id IN (SELECT a.id FROM public.area a WHERE a.street = ' + sanitize(geoAreaStreet) + ') \n';
    }

    if (geoAreaSubLocality) {
      sql += ' AND pc.area_id IN (SELECT a.id FROM public.area a WHERE a.sub_locality = ' + sanitize(geoAreaSubLocality) + ') \n';
    }

    if (geoAreaLocality) {
      sql += ' AND pc.area_id IN (SELECT a.id FROM public.area a WHERE a.locality = ' + sanitize(geoAreaLocality) + ') \n';
    }

    if (geoAreaAa3) {
      sql += ' AND pc.area_id IN (SELECT a.id FROM public.area a WHERE a.aa3 = ' + sanitize(geoAreaAa3) + ') \n';
    }

    if (geoAreaAa2) {
      sql += ' AND pc.area_id IN (SELECT a.id FROM public.area a WHERE a.aa2 = ' + sanitize(geoAreaAa2) + ') \n';
    }

    if (geoAreaAa1) {
      sql += ' AND pc.area_id IN (SELECT a.id FROM public.area a WHERE a.aa1 = ' + sanitize(geoAreaAa1) + ') \n';
    }

    if (geoAreaCountry) {
      sql += ' AND pc.area_id IN (SELECT a.id FROM public.area a WHERE a.country = ' + sanitize(geoAreaCountry) + ') \n';
    }

    if (geoAreaContinent) {
      sql += ' AND pc.area_id IN (SELECT a.id FROM public.area a WHERE a.continent = ' + sanitize(geoAreaContinent) + ') \n';
    }

    if (searchKeyWord) {
      sql += ' AND (pc.body ILIKE ' + sanitize('%' + searchKeyWord + '%') + ' OR pc.tags ILIKE ' + sanitize('%' + searchKeyWord + '%') + ') \n';
    }

    return sql;
  }

  /**
   * 
   * @param {String} language
   * @param {String} geoAreaZip
   * @param {String} geoAreaStreet
   * @param {String} geoAreaSubLocality
   * @param {String} geoAreaLocality
   * @param {String} geoAreaAa3
   * @param {String} geoAreaAa2
   * @param {String} geoAreaAa1
   * @param {String} geoAreaCountry
   * @param {String} geoAreaContinent
   * @param {String} searchKeyWord
   * @param {Number} page
   * @param {Number} limit
   * @param {String} orderBy
   * @returns {String}
   */
  function getPRContentListSQL(language, geoAreaZip, geoAreaStreet, geoAreaSubLocality, geoAreaLocality, geoAreaAa3, geoAreaAa2, geoAreaAa1, geoAreaCountry, geoAreaContinent, searchKeyWord, page, limit, orderBy) {
    var sql = '';
    sql += 'SELECT pc.*, \n';

    sql += '  CASE WHEN pc.area_id IS NOT NULL THEN \n';
    sql += '    (SELECT array_to_json(array_agg(a)) FROM (SELECT a.center_lat AS "centerLat", a.center_long AS "centerLong", a.type, a.continent, a.country, a.aa1, a.aa2, a.aa3, a.locality, a.sub_locality AS "subLocality", a.street, a.zip, a.id FROM area a WHERE a.id = pc.area_id) AS a) \n';
    sql += '  ELSE \n';
    sql += '    NULL \n';
    sql += '  END AS area, \n';

    sql += '  (SELECT array_to_json(array_agg(i)) \n';
    sql += '    FROM ( \n';
    sql += '      SELECT i.full_storage_location AS "fullStorageLocation", \n';
    sql += '      i.full_download_url AS "fullDownloadUrl", \n';
    sql += '      i.thumb_download_url AS "thumbDownloadUrl", \n';
    sql += '      i.thumb_retina_storage_location AS "thumbRetinaStorageLocation", \n';
    sql += '      i.thumb_retina_download_url AS "thumbRetinaDownloadUrl", \n';
    sql += '      i.created, \n';
    sql += '      i.id, \n';
    sql += '      pchi.is_main AS "isMain" \n';    
    sql += '      FROM public.image i \n';
    sql += '      JOIN public.pr_content_has_image pchi ON (pchi.image_id = i.id AND pc.id = pchi.pr_content_id) \n';
    sql += '    ) AS i \n';
    sql += '  ) AS images, \n';

    sql += '  (SELECT array_to_json(array_agg(v)) \n';
    sql += '    FROM ( \n';
    sql += '      SELECT pcv.url, \n';
    sql += '      pcv.created, \n';
    sql += '      pcv.id \n';
    sql += '      FROM public.pr_content_video pcv \n';
    sql += '      WHERE pcv.pr_content_id = pc.id \n';
    sql += '    ) AS v \n';
    sql += '  ) AS videos, \n';

    sql += '  u.id AS user_info_id, \n';
    sql += '  u.first_name AS user_info_first_name, \n';
    sql += '  u.last_name AS user_info_last_name \n';

    sql += 'FROM public.pr_content pc \n';

    sql += 'JOIN public.user u ON u.id = pc.user_id \n';

    sql += getPRContentListFilterWhereClause(language, geoAreaZip, geoAreaStreet, geoAreaSubLocality, geoAreaLocality, geoAreaAa3, geoAreaAa2, geoAreaAa1, geoAreaCountry, geoAreaContinent, searchKeyWord);

    if (orderBy) {
      var order = [];
      orderBy.split(',').forEach(function (str) {
        var column = str.substr(0, 1) === '-' ? str.substr(1) : str;
        var trend = str.substr(0, 1) === '-' ? ' DESC' : ' ASC';

        switch (column) {
        case Constants.PR_CONTENT_ORDER_BY_ID:
        case Constants.PR_CONTENT_ORDER_BY_LANGUAGE:
        case Constants.PR_CONTENT_ORDER_BY_TITLE:
        case Constants.PR_CONTENT_ORDER_BY_BODY:
        case Constants.PR_CONTENT_ORDER_BY_CREATED:
          order.push('pc.' + column + trend);
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
   * 
   * @param {String} language
   * @param {String} geoAreaZip
   * @param {String} geoAreaStreet
   * @param {String} geoAreaSubLocality
   * @param {String} geoAreaLocality
   * @param {String} geoAreaAa3
   * @param {String} geoAreaAa2
   * @param {String} geoAreaAa1
   * @param {String} geoAreaCountry
   * @param {String} geoAreaContinent
   * @param {String} searchKeyWord
   * @returns {String}
   */
  function getPRContentListCountSQL(language, geoAreaZip, geoAreaStreet, geoAreaSubLocality, geoAreaLocality, geoAreaAa3, geoAreaAa2, geoAreaAa1, geoAreaCountry, geoAreaContinent, searchKeyWord) {
    var sql = 'SELECT COUNT(pc.id) AS count FROM public.pr_content pc \n';

    sql += getPRContentListFilterWhereClause(language, geoAreaZip, geoAreaStreet, geoAreaSubLocality, geoAreaLocality, geoAreaAa3, geoAreaAa2, geoAreaAa1, geoAreaCountry, geoAreaContinent, searchKeyWord);

    return sql;
  }

  /**
   * Returns articles list
   * 
   * @param {String} language
   * @param {String} geocells
   * @param {String} geoAreaZip
   * @param {String} geoAreaStreet
   * @param {String} geoAreaSubLocality
   * @param {String} geoAreaLocality
   * @param {String} geoAreaAa3
   * @param {String} geoAreaAa2
   * @param {String} geoAreaAa1
   * @param {String} geoAreaCountry
   * @param {String} geoAreaContinent
   * @param {String} SearchKeyWord
   * @param {Number} page
   * @param {Number} limit
   * @param {String} order
   * @param {Function} cb
   * @returns {Array}
   */
  PRContent.list = function (language, geoAreaZip, geoAreaStreet, geoAreaSubLocality, geoAreaLocality, geoAreaAa3, geoAreaAa2, geoAreaAa1, geoAreaCountry, geoAreaContinent, searchKeyWord, page, limit, orderBy, cb) {
    var ds = PRContent.app.dataSources.trashout;

    var sql = getPRContentListSQL(language, geoAreaZip, geoAreaStreet, geoAreaSubLocality, geoAreaLocality, geoAreaAa3, geoAreaAa2, geoAreaAa1, geoAreaCountry, geoAreaContinent, searchKeyWord, page, limit, orderBy);

    ds.connector.execute(sql, PRContent.app.models.BaseModel.sqlParameters, function (err, instances) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      var result = [];
      instances.forEach(function (instance) {
        result.push({
          title: instance.title,
          body: instance.body,
          bodyMarkdown: instance.body_markdown,
          url: 'https://admin.trashout.ngo/articles/detail/' + instance.id,
          language: instance.language,
          tags: instance.tags,
          tagsArray: instance.tags.split(',').map(function (str) {
            return str.trim();
          }),
          userInfo: {
            id: instance.user_info_id,
            firstName: instance.user_info_first_name,
            lastName: instance.user_info_last_name
          },
          appIosUrl: instance.app_ios_url,
          appAndroidUrl: instance.app_android_url,
          appWindowsUrl: instance.app_windows_url,
          created: instance.created,
          id: instance.id,
          area: instance.area,
          images: instance.images,
          prContentVideo: instance.videos || []
        });

      });

      cb(null, result);
    });
  };

  /**
   * Returns articles list
   * 
   * @param {String} language
   * @param {String} geocells
   * @param {String} geoAreaZip
   * @param {String} geoAreaStreet
   * @param {String} geoAreaSubLocality
   * @param {String} geoAreaLocality
   * @param {String} geoAreaAa3
   * @param {String} geoAreaAa2
   * @param {String} geoAreaAa1
   * @param {String} geoAreaCountry
   * @param {String} geoAreaContinent
   * @param {String} SearchKeyWord
   * @param {Number} page
   * @param {Number} limit
   * @param {String} order
   * @param {Function} cb
   * @returns {Array}
   */
  PRContent.listCount = function (language, geoAreaZip, geoAreaStreet, geoAreaSubLocality, geoAreaLocality, geoAreaAa3, geoAreaAa2, geoAreaAa1, geoAreaCountry, geoAreaContinent, searchKeyWord, cb) {
    var ds = PRContent.app.dataSources.trashout;

    var sql = getPRContentListCountSQL(language, geoAreaZip, geoAreaStreet, geoAreaSubLocality, geoAreaLocality, geoAreaAa3, geoAreaAa2, geoAreaAa1, geoAreaCountry, geoAreaContinent, searchKeyWord);

    ds.connector.execute(sql, PRContent.app.models.BaseModel.sqlParameters, function (err, instance) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      cb(null, Number(instance[0].count));
    });
  };

  /**
   * Insert an article
   *
   * @param {String} title
   * @param {String} body
   * @param {String} bodyMarkdown
   * @param {String} language
   * @param {String} tags
   * @param {String} appIosUrl
   * @param {String} appAndroidUrl
   * @param {String} appWindowsUrl
   * @param {Number} areaId
   * @param {Function} cb
   */
  PRContent.ins = function (title, body, bodyMarkdown, language, tags, appIosUrl, appAndroidUrl, appWindowsUrl, areaId, cb) {
    if (PRContent.app.models.BaseModel.user.userRole.code === Constants.USER_ROLE_AUTHENTICATED) {
      return cb({message: 'Only admin or manager can create articles.', status: 403});
    }

    var data = {
      title: title,
      body: body,
      bodyMarkdown: bodyMarkdown,
      language: language,
      tags: tags,
      userId: PRContent.app.models.BaseModel.user.id,
      appIosUrl: appIosUrl,
      appAndroidUrl: appAndroidUrl,
      appWindowsUrl: appWindowsUrl,
      areaId: areaId
    };

    PRContent.create(data, function (err, instance) {
      if (err) {
        console.error(err);
        return cb({message: err.detail, status: 400});
      }

      cb(null, instance);
    });
  };

  /**
   * Update an article
   *
   * @param {Number} id
   * @param {String} title
   * @param {String} body
   * @param {String} bodyMarkdown
   * @param {String} language
   * @param {String} tags
   * @param {String} appIosUrl
   * @param {String} appAndroidUrl
   * @param {String} appWindowsUrl
   * @param {Number} areaId
   * @param {Function} cb
   */
  PRContent.upd = function (id, title, body, bodyMarkdown, language, tags, appIosUrl, appAndroidUrl, appWindowsUrl, areaId, cb) {
    PRContent.findById(id, function (err, instance) {
      if (err) {
        console.error(err);
        return cb({message: err.details, status: 400});
      }

      if (!instance) {
        return cb({message: 'Article not found.', status: 404});
      }

      if (PRContent.app.models.BaseModel.user.userRole.code === Constants.USER_ROLE_AUTHENTICATED) {
        return cb({message: 'Only admin or manager can edit articles.', status: 403});
      }

      if (PRContent.app.models.BaseModel.user.userRole.code === Constants.USER_ROLE_MANAGER && PRContent.app.models.BaseModel.user.id !== instance.userId) {
        return cb({message: 'In manager role, only owner can edit his article.', status: 403});
      }

      var data = {
        title: title,
        body: body,
        bodyMarkdown: bodyMarkdown,
        language: language,
        tags: tags,
        appIosUrl: appIosUrl,
        appAndroidUrl: appAndroidUrl,
        appWindowsUrl: appWindowsUrl,
        areaId: areaId
      };

      PRContent.updateAll({id: id}, data, function (err, result) {
        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        cb(null, result);
      });
    });
  };

  /**
   * 
   * @param {Number} id
   * @param {Array} images
   * @param {Function} cb
   * @returns {Void}
   */
  PRContent.addImages = function (id, images, cb) {
    if (PRContent.app.models.BaseModel.user.userRole.code === Constants.USER_ROLE_AUTHENTICATED) {
      return cb({message: 'Only admin or manager can upload images.', status: 403});
    }

    PRContent.beginTransaction({isolationLevel: PRContent.Transaction.READ_COMMITTED}, function (err, tx) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      PRContent.findById(id, function (err, instance) {
        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        if (!instance) {
          return cb({status: 404, message: 'Article not found'});
        }

        var p1, p2;
        if (images) {
          var newMainImage = false;
          images.forEach(function (image) {
            if (image.isMain) {
              newMainImage = true;
              return;
            }
          });

          var mainImageReset;
          if (newMainImage) {
            mainImageReset = PRContent.app.models.PrContentHasImage.updateAll({prContentId: id}, {isMain: false}, {transaction: tx}, function (err) {
              if (err) {
                console.error(err);
                return cb(err);
              }
            });
          } else {
            mainImageReset = Promise.resolve();
          }

          p1 = Promise.defer();
          p2 = Promise.defer();
          Promise.all([mainImageReset]).then(function () {

            p1 = PRContent.app.models.Image.create(images, {transaction: tx}, function (err, responseImage) {
              if (err) {
                console.error(err);
                return cb({message: err.detail});
              }

              // @todo check isMain properly
              var prContentImages = [];
              responseImage.forEach(function (image) {
                prContentImages.push({imageId: image.id, prContentId: id, isMain: image.isMain});
              });

              p2 = PRContent.app.models.PrContentHasImage.create(prContentImages, {transaction: tx}, function (err) {
                if (err) {
                  console.error(err);
                  return cb({message: err.detail});
                }
              });
            });
          }).catch(function (error) {
            console.error(error);
            return cb(error);
          });

        } else {
          p1 = Promise.resolve();
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

        }).catch(function (error) {
          console.error(error);
          return cb(error);
        });
      });
    });
  };

  /**
   * 
   * @param {Number} id
   * @param {Number} imageId
   * @param {Boolean} isMain
   * @param {Function} cb
   * @returns Void
   */
  PRContent.updateImage = function (id, imageId, isMain, cb) {
    PRContent.app.models.PrContentHasImage.findOne({where: {prContentId: id, imageId: imageId}}, function (err, instance) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      if (!instance) {
        return cb({status: 404, message: 'Image not found'});
      }

      if (typeof(isMain) !== 'boolean') {
        return cb({message: 'Property "isMain" must be boolean', status: 403});
      }

      PRContent.app.models.PrContentHasImage.updateAll({prContentId: id, imageId: imageId}, {isMain: isMain}, function (err) {
        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        cb(null);
      });
    });

  };

  /**
   * 
   * @param {Number} id
   * @param {Number} imageId
   * @param {Function} cb
   * @returns {Void}
   */
  PRContent.deleteImage = function (id, imageId, cb) {
    if (PRContent.app.models.BaseModel.user.userRole.code === Constants.USER_ROLE_AUTHENTICATED) {
      return cb({message: 'Only admin or manager can delete images.', status: 403});
    }

    PRContent.beginTransaction({isolationLevel: PRContent.Transaction.READ_COMMITTED}, function (err, tx) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      PRContent.app.models.PrContentHasImage.findOne({where: {imageId: imageId, prContentId: id}}, {transaction: tx}, function (err, instance) {
        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        if (!instance) {
          return cb({status: 404, message: 'Image not found'});
        }

        PRContent.app.models.PrContentHasImage.deleteAll({imageId: imageId, prContentId: id}, {transaction: tx}, function (err) {
          if (err) {
            console.error(err);
            return cb({message: err.detail});
          }

          PRContent.app.models.Image.deleteById(imageId, {transaction: tx}, function (err) {
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
   * 
   * @param {Number} id
   * @param {Array} videos
   * @param {Function} cb
   * @returns {Void}
   */
  PRContent.addVideos = function (id, videos, cb) {
    if (PRContent.app.models.BaseModel.user.userRole.code === Constants.USER_ROLE_AUTHENTICATED) {
      return cb({message: 'Only admin or manager can upload videos.', status: 403});
    }

    PRContent.beginTransaction({isolationLevel: PRContent.Transaction.READ_COMMITTED}, function (err, tx) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      PRContent.findById(id, function (err, instance) {
        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        if (!instance) {
          return cb({status: 404, message: 'Article not found'});
        }

        var p1;
        if (videos) {
          var data = [];
          videos.forEach(function (video) {
            data.push({
              url: video.url,
              prContentId: id
            });
          });

          p1 = PRContent.app.models.PrContentVideo.create(data, {transaction: tx}, function (err) {
            if (err) {
              console.error(err);
              return cb({message: err.detail});
            }
          });
        } else {
          p1 = Promise.resolve();
        }

        Promise.all([p1]).then(function () {

          tx.commit(function (err) {
            if (err) {
              console.error(err);
              return cb({message: err.detail});
            }

            cb(null);
          });

        }).catch(function (error) {
          console.error(error);
          return cb(error);
        });
      });
    });
  };

  /**
   * 
   * @param {Number} id
   * @param {Number} videoId
   * @param {Function} cb
   * @returns {Void}
   */
  PRContent.deleteVideo = function (id, videoId, cb) {
    if (PRContent.app.models.BaseModel.user.userRole.code === Constants.USER_ROLE_AUTHENTICATED) {
      return cb({message: 'Only admin or manager can delete videos.', status: 403});
    }

    PRContent.beginTransaction({isolationLevel: PRContent.Transaction.READ_COMMITTED}, function (err, tx) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      PRContent.app.models.PrContentVideo.findOne({where: {id: videoId, prContentId: id}}, {transaction: tx}, function (err, instance) {
        if (err) {
          console.error(err);
          return cb({message: err.detail});
        }

        if (!instance) {
          return cb({status: 404, message: 'Video not found'});
        }

        PRContent.app.models.PrContentVideo.deleteById(videoId, {transaction: tx}, function (err) {
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
  };

  /**
   * Returns article detail
   * 
   * @param {Number} id
   * @param {Function} cb
   * @returns {Object}
   */
  PRContent.detail = function (id, cb) {
    var filter = {
      where: {
        id: id
      },
      include: [
        {prContentHasImage: 'image'},
        'prContentVideo',
        'user',
        'area'
      ]
    };

    PRContent.findById(id, filter, function (err, instance) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      if (!instance) {
        return cb({status: 404, message: 'Article not found'});
      }

      var result = instance.toJSON();

      var images = [];
      result.prContentHasImage.forEach(function(data) {
        if (data.image) {          
          data.image.isMain = data.isMain;
          images.push(data.image);
        }
      });

      delete result.prContentHasImage;

      result.images = images;
      result.url = 'https://admin.trashout.ngo/articles/detail/' + result.id;

      result.tagsArray = result.tags.split(',').map(function (str) {
        return str.trim();
      });

      cb(null, result);
    });
  };

  /**
   * Deletes an article
   *
   * @param {Number} id
   * @param {Function} cb
   * @returns {Object}
   */
  PRContent.deleteById = function (id, cb) {
    PRContent.beginTransaction({isolationLevel: PRContent.Transaction.READ_COMMITTED}, function (err, tx) {
      if (err) {
        console.error(err);
        return cb({message: err.detail});
      }

      PRContent.findById(id, {transaction: tx}, function (err, instance) {
        if (err) {
          console.error(err);
          return cb({message: err.details, status: 400});
        }

        if (!instance) {
          return cb({message: 'Article not found.', status: 404});
        }

        if (PRContent.app.models.BaseModel.user.userRole.code === Constants.USER_ROLE_AUTHENTICATED) {
          return cb({message: 'Only admin or manager can delete articles.', status: 403});
        }

        if (PRContent.app.models.BaseModel.user.userRole.code === Constants.USER_ROLE_MANAGER && PRContent.app.models.BaseModel.user.id !== instance.userId) {
          return cb({message: 'In manager role, only owner can delete his article.', status: 403});
        }

        PRContent.deleteAll({id: id}, {transaction: tx}, function (err) {
          if (err) {
            console.error(err);
            return cb({message: err.detail});
          }

          tx.commit(function (err) {
            if (err) {
              console.error(err);
              return cb({message: err.detail});
            }

            cb(null, {status: 204});
          });
        });
      });
    });
  };

  PRContent.disableRemoteMethod('count', true); // Removes (GET) /prContent/count
  PRContent.disableRemoteMethod('find', true); // Removes (GET) /prContent
  PRContent.disableRemoteMethod('create', true); // Removes (POST) /prContent
  PRContent.disableRemoteMethod('upsert', true); // Removes (PUT) /prContent

  PRContent.remoteMethod(
    'list',
    {
      http: {path: '/', verb: 'get'},
      accepts: [
        {arg: 'language', type: 'string'},
        {arg: 'geoAreaZip', type: 'string', description: 'Zip'},
        {arg: 'geoAreaStreet', type: 'string', description: 'Street'},
        {arg: 'geoAreaSubLocality', type: 'string', description: 'Sub locality'},
        {arg: 'geoAreaLocality', type: 'string', description: 'Locality'},      
        {arg: 'geoAreaAa3', type: 'string', description: 'Administrative Area 3'},
        {arg: 'geoAreaAa2', type: 'string', description: 'Administrative Area 2'},
        {arg: 'geoAreaAa1', type: 'string', description: 'Administrative Area 1'},
        {arg: 'geoAreaCountry', type: 'string', description: 'Country'},
        {arg: 'geoAreaContinent', type: 'string', description: 'Continent'},
        {arg: 'searchKeyWord', type: 'string', description: 'Key word'},
        {arg: 'page', type: 'number'},
        {arg: 'limit', type: 'number'},
        {arg: 'orderBy', type: 'string'}
      ],
      returns: {type: 'object', root: true}
    }
  );

  PRContent.remoteMethod(
    'listCount',
    {
      http: {path: '/count/', verb: 'get'},
      accepts: [
        {arg: 'language', type: 'string'},
        {arg: 'geoAreaZip', type: 'string', description: 'Zip'},
        {arg: 'geoAreaStreet', type: 'string', description: 'Street'},
        {arg: 'geoAreaSubLocality', type: 'string', description: 'Sub locality'},
        {arg: 'geoAreaLocality', type: 'string', description: 'Locality'},      
        {arg: 'geoAreaAa3', type: 'string', description: 'Administrative Area 3'},
        {arg: 'geoAreaAa2', type: 'string', description: 'Administrative Area 2'},
        {arg: 'geoAreaAa1', type: 'string', description: 'Administrative Area 1'},
        {arg: 'geoAreaCountry', type: 'string', description: 'Country'},
        {arg: 'geoAreaContinent', type: 'string', description: 'Continent'},
        {arg: 'searchKeyWord', type: 'string', description: 'Key word'}
      ],
      returns: {arg: 'count', type: 'number'}
    }
  );

  PRContent.remoteMethod(
    'ins',
    {
      http: {path: '/', verb: 'post'},
      accepts: [
        {arg: 'title', type: 'string'},
        {arg: 'body', type: 'string'},
        {arg: 'bodyMarkdown', type: 'string'},
        {arg: 'language', type: 'string'},
        {arg: 'tags', type: 'string'},
        {arg: 'appIosUrl', type: 'string'},
        {arg: 'appAndroidUrl', type: 'string'},
        {arg: 'appWindowsUrl', type: 'string'},
        {arg: 'areaId', type: 'number'}
      ],
      returns: {type: 'object', root: true}
    }
  );

  PRContent.remoteMethod(
    'upd',
    {
      http: {path: '/:id', verb: 'put'},
      accepts: [
        {arg: 'id', type: 'number', required: true},
        {arg: 'title', type: 'string'},
        {arg: 'body', type: 'string'},
        {arg: 'bodyMarkdown', type: 'string'},
        {arg: 'language', type: 'string'},
        {arg: 'tags', type: 'string'},
        {arg: 'appIosUrl', type: 'string'},
        {arg: 'appAndroidUrl', type: 'string'},
        {arg: 'appWindowsUrl', type: 'string'},
        {arg: 'areaId', type: 'number'}
      ],
      returns: {type: 'object', root: true}
    }
  );

  PRContent.remoteMethod(
    'addImages',
    {
      http: {path: '/:id/images', verb: 'post'},
      accepts: [
        {arg: 'id', type: 'number'},
        {arg: 'images', type: 'array', description: 'Array of images'}
      ]
    }
  );

  PRContent.remoteMethod(
    'updateImage',
    {
      http: {path: '/:id/images/:imageId', verb: 'put'},
      accepts: [
        {arg: 'id', type: 'number', required: true},
        {arg: 'imageId', type: 'number', required: true},
        {arg: 'isMain', type: 'boolean', required: true}        
      ]
    }
  );

  PRContent.remoteMethod(
    'deleteImage',
    {
      http: {path: '/:id/images/:imageId', verb: 'delete'},
      accepts: [
        {arg: 'id', type: 'number', required: true},
        {arg: 'imageId', type: 'number', required: true}
      ]
    }
  );

  PRContent.remoteMethod(
    'addVideos',
    {
      http: {path: '/:id/videos', verb: 'post'},
      accepts: [
        {arg: 'id', type: 'number', required: true},
        {arg: 'videos', type: 'array', description: 'Array of videos'}
      ]
    }
  );

  PRContent.remoteMethod(
    'deleteVideo',
    {
      http: {path: '/:id/videos/:videoId', verb: 'delete'},
      accepts: [
        {arg: 'id', type: 'number', required: true},
        {arg: 'videoId', type: 'number', required: true}
      ]
    }
  );

  PRContent.remoteMethod(
    'detail',
    {
      http: {path: '/:id/', verb: 'get'},
      accepts: [
        {arg: 'id', type: 'number', required: true}
      ],
      returns: {type: 'object', root: true}
    }
  );

  PRContent.remoteMethod(
    'deleteById',
    {
      http: {path: '/:id/', verb: 'delete'},
      accepts: [
        {arg: 'id', type: 'number', required: true}
      ],
      returns: {type: 'object', root: true}
    }
  );
};
