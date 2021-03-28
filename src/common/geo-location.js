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
var Geomodel = require('geomodel').create_geomodel();
var NodeGeocoder = require('node-geocoder');
var async = require('async');

var googleApiCredentials = {};

switch (process.env.NODE_ENV) {
  case 'production':
  case 'stage':
    googleApiCredentials = require(__dirname + '/../server/google-api-credentials.' + process.env.NODE_ENV + '.json');
    break;
  default:
    googleApiCredentials = require(__dirname + '/../server/google-api-credentials.json');
}

var geocoder = NodeGeocoder({
  provider: 'google',
  httpAdapter: 'https',
  apiKey: googleApiCredentials.apiKey,
  formatter: null
});

/**
 * Returns TrashPoint identifiers that are in given GPS radius
 * 
 * @param {Number} lat
 * @param {Number} long
 * @param {Number} radius Meters
 * @returns {Array}
 */
module.exports.getNearestTrashPoints = function (lat, long, radius) {
  var ds = server.dataSources.trashout;

  var sql = '';
  sql += 'SELECT ARRAY( \n';
  sql += '  SELECT DISTINCT(tpa.trash_point_id) \n';
  sql += '  FROM public.trash_point_activity tpa \n';
  sql += '  JOIN public.gps ON gps.id = tpa.gps_id \n';
  sql += '  WHERE ST_DWithin(Geography(ST_MakePoint(gps.long, gps.lat)), Geography(ST_MakePoint(' + long + ', ' + lat + ')), ' + (radius || Constants.TRASH_MIN_DISTANCE) + ') \n';
  sql += ')';

  return new Promise(function (resolve, reject) {
    ds.connector.execute(sql, function (err, result) {
      if (err) {
        return reject(err);
      }

      return resolve(result[0].array.map(Number).filter(Boolean));
    });
  });
};

/**
 * Returns GPS identifier for given GPS coordinates
 * 
 * @param {Number} lat
 * @param {Number} long
 * @param {Number} accuracy
 * @param {Number} gpsSourceId
 * @returns {Number}
 */
module.exports.upsertGps = function (lat, long, accuracy, gpsSourceId) {
  return new Promise(function (resolve, reject) {
    var filter = {
      where: {
        lat: lat,
        long: long
      }
    };

    server.models.GPS.findOne(filter, function (err, instance) {
      if (err) {
        return reject(err);
      }

      if (instance) {

        resolve(instance.id);

      } else {
        var geocell = '';
        try {
          geocell = Geomodel.compute(Geomodel.create_point(lat, long));
        } catch (e) {
          return reject(e);
        }

        var data = {
          lat: lat,
          long: long,
          accuracy: accuracy,
          geocell: geocell,
          gpsSourceId: gpsSourceId
        };

        server.models.GPS.create(data, function (err, instance) {
          if (err) {
            return reject(err);
          }

          // fill areas async
          fillAreas(instance.id, lat, long).catch(function (error) {
            console.error(error);
          });

          resolve(instance.id);
        });
      }

    });

  });
};

/**
 * 
 * @param {Number} id
 * @returns {void}
 */
module.exports.fillAreasInGpsTable = function (id) {
  if (typeof id === 'undefined') {
    var where = {
      countryId: null,
      aa1Id: null,
      aa2Id: null,
      aa3Id: null,
      localityId: null,
      subLocalityId: null,
      streetId: null,
      zipId: null
    };
  } else {
    var where = {
      id: id
    };
  }

  return new Promise(function (resolve, reject) {
    server.models.GPS.find({where: where}, function (err, instances) {
      if (err) {
        return reject(err);
      }

      async.eachSeries(instances, function (instance, callback) {
        fillAreas(instance.id, instance.lat, instance.long).then(function () {
          async.setImmediate(callback);
        });
      }, function (err) {
        if (err) {
          return reject();
        }

        resolve();
      });

    });
  });
};

/**
 * Stores parameters for parametrized queries and returns parameter number
 * 
 * @param {type} parameter
 * @returns {String}
 */
function sanitize(parameter) {
  return server.models.BaseModel.sanitize(parameter);
}

/**
 * Returns continent name by country code
 * 
 * @param {String} countryCode
 * @returns {String} Continent name
 */
function getContinentByCountryCode(countryCode) {
  var continents = {
    AD: 'Europe',
    AE: 'Asia',
    AF: 'Asia',
    AG: 'North America',
    AI: 'North America',
    AL: 'Europe',
    AM: 'Asia',
    AN: 'North America',
    AO: 'Africa',
    AQ: 'Antarctica',
    AR: 'South America',
    AS: 'Australia',
    AT: 'Europe',
    AU: 'Australia',
    AW: 'North America',
    AZ: 'Asia',
    BA: 'Europe',
    BB: 'North America',
    BD: 'Asia',
    BE: 'Europe',
    BF: 'Africa',
    BG: 'Europe',
    BH: 'Asia',
    BI: 'Africa',
    BJ: 'Africa',
    BM: 'North America',
    BN: 'Asia',
    BO: 'South America',
    BR: 'South America',
    BS: 'North America',
    BT: 'Asia',
    BW: 'Africa',
    BY: 'Europe',
    BZ: 'North America',
    CA: 'North America',
    CC: 'Asia',
    CD: 'Africa',
    CF: 'Africa',
    CG: 'Africa',
    CH: 'Europe',
    CI: 'Africa',
    CK: 'Australia',
    CL: 'South America',
    CM: 'Africa',
    CN: 'Asia',
    CO: 'South America',
    CR: 'North America',
    CU: 'North America',
    CV: 'Africa',
    CX: 'Asia',
    CY: 'Asia',
    CZ: 'Europe',
    DE: 'Europe',
    DJ: 'Africa',
    DK: 'Europe',
    DM: 'North America',
    DO: 'North America',
    DZ: 'Africa',
    EC: 'South America',
    EE: 'Europe',
    EG: 'Africa',
    EH: 'Africa',
    ER: 'Africa',
    ES: 'Europe',
    ET: 'Africa',
    FI: 'Europe',
    FJ: 'Australia',
    FK: 'South America',
    FM: 'Australia',
    FO: 'Europe',
    FR: 'Europe',
    GA: 'Africa',
    GB: 'Europe',
    GD: 'North America',
    GE: 'Asia',
    GF: 'South America',
    GG: 'Europe',
    GH: 'Africa',
    GI: 'Europe',
    GL: 'North America',
    GM: 'Africa',
    GN: 'Africa',
    GP: 'North America',
    GQ: 'Africa',
    GR: 'Europe',
    GS: 'Antarctica',
    GT: 'North America',
    GU: 'Australia',
    GW: 'Africa',
    GY: 'South America',
    HK: 'Asia',
    HN: 'North America',
    HR: 'Europe',
    HT: 'North America',
    HU: 'Europe',
    ID: 'Asia',
    IE: 'Europe',
    IL: 'Asia',
    IM: 'Europe',
    IN: 'Asia',
    IO: 'Asia',
    IQ: 'Asia',
    IR: 'Asia',
    IS: 'Europe',
    IT: 'Europe',
    JE: 'Europe',
    JM: 'North America',
    JO: 'Asia',
    JP: 'Asia',
    KE: 'Africa',
    KG: 'Asia',
    KH: 'Asia',
    KI: 'Australia',
    KM: 'Africa',
    KN: 'North America',
    KP: 'Asia',
    KR: 'Asia',
    KW: 'Asia',
    KY: 'North America',
    KZ: 'Asia',
    LA: 'Asia',
    LB: 'Asia',
    LC: 'North America',
    LI: 'Europe',
    LK: 'Asia',
    LR: 'Africa',
    LS: 'Africa',
    LT: 'Europe',
    LU: 'Europe',
    LV: 'Europe',
    LY: 'Africa',
    MA: 'Africa',
    MC: 'Europe',
    MD: 'Europe',
    ME: 'Europe',
    MG: 'Africa',
    MH: 'Australia',
    MK: 'Europe',
    ML: 'Africa',
    MM: 'Asia',
    MN: 'Asia',
    MO: 'Asia',
    MP: 'Australia',
    MQ: 'North America',
    MR: 'Africa',
    MS: 'North America',
    MT: 'Europe',
    MU: 'Africa',
    MV: 'Asia',
    MW: 'Africa',
    MX: 'North America',
    MY: 'Asia',
    MZ: 'Africa',
    NA: 'Africa',
    NC: 'Australia',
    NE: 'Africa',
    NF: 'Australia',
    NG: 'Africa',
    NI: 'North America',
    NL: 'Europe',
    NO: 'Europe',
    NP: 'Asia',
    NR: 'Australia',
    NU: 'Australia',
    NZ: 'Australia',
    OM: 'Asia',
    PA: 'North America',
    PE: 'South America',
    PF: 'Australia',
    PG: 'Australia',
    PH: 'Asia',
    PK: 'Asia',
    PL: 'Europe',
    PM: 'North America',
    PN: 'Australia',
    PR: 'North America',
    PS: 'Asia',
    PT: 'Europe',
    PW: 'Australia',
    PY: 'South America',
    QA: 'Asia',
    RE: 'Africa',
    RO: 'Europe',
    RS: 'Europe',
    RU: 'Europe',
    RW: 'Africa',
    SA: 'Asia',
    SB: 'Australia',
    SC: 'Africa',
    SD: 'Africa',
    SE: 'Europe',
    SG: 'Asia',
    SH: 'Africa',
    SI: 'Europe',
    SJ: 'Europe',
    SK: 'Europe',
    SL: 'Africa',
    SM: 'Europe',
    SN: 'Africa',
    SO: 'Africa',
    SR: 'South America',
    ST: 'Africa',
    SV: 'North America',
    SY: 'Asia',
    SZ: 'Africa',
    TC: 'North America',
    TD: 'Africa',
    TF: 'Antarctica',
    TG: 'Africa',
    TH: 'Asia',
    TJ: 'Asia',
    TK: 'Australia',
    TM: 'Asia',
    TN: 'Africa',
    TO: 'Australia',
    TR: 'Asia',
    TT: 'North America',
    TV: 'Australia',
    TW: 'Asia',
    TZ: 'Africa',
    UA: 'Europe',
    UG: 'Africa',
    US: 'North America',
    UY: 'South America',
    UZ: 'Asia',
    VC: 'North America',
    VE: 'South America',
    VG: 'North America',
    VI: 'North America',
    VN: 'Asia',
    VU: 'Australia',
    WF: 'Australia',
    WS: 'Australia',
    YE: 'Asia',
    YT: 'Africa',
    ZA: 'Africa',
    ZM: 'Africa',
    ZW: 'Africa'
  };

  return continents[countryCode] || null;
}

/**
 * 
 * @param {String} continent
 * @param {String} country
 * @param {String} aa1
 * @param {String} aa2
 * @param {String} aa3
 * @param {String} locality
 * @param {String} subLocality
 * @param {String} street
 * @param {String} zip
 * @returns {Array}
 */
function getAliases(continent, country, aa1, aa2, aa3, locality, subLocality, street, zip) {
  var sql = '';
  sql += 'SELECT DISTINCT a.* \n';
  sql += 'FROM public.area a \n';
  sql += 'LEFT JOIN public.area continent ON a.id = continent.alias_id \n';
  sql += 'LEFT JOIN public.area country ON a.id = country.alias_id \n';
  sql += 'LEFT JOIN public.area aa1 ON a.id = aa1.alias_id \n';
  sql += 'LEFT JOIN public.area aa2 ON a.id = aa2.alias_id \n';
  sql += 'LEFT JOIN public.area aa3 ON a.id = aa3.alias_id \n';
  sql += 'LEFT JOIN public.area locality ON a.id = locality.alias_id \n';
  sql += 'LEFT JOIN public.area sublocality ON a.id = sublocality.alias_id \n';
  sql += 'LEFT JOIN public.area street ON a.id = street.alias_id \n';
  sql += 'LEFT JOIN public.area zip ON a.id = zip.alias_id \n';

  sql += 'WHERE  \n';
  sql += '  (continent.continent = $1 AND continent.type = \'continent\') \n';
  sql += '  OR (country.country = $2 AND country.type = \'country\') \n';
  sql += '  OR (aa1.aa1 = $3 AND aa1.type = \'aa1\') \n';
  sql += '  OR (aa2.aa2 = $4 AND aa2.type = \'aa2\') \n';
  sql += '  OR (aa3.aa3 = $5 AND aa3.type = \'aa3\') \n';
  sql += '  OR (locality.locality = $6 AND locality.type = \'locality\') \n';
  sql += '  OR (sublocality.sub_locality = $7 AND sublocality.type = \'subLocality\') \n';
  sql += '  OR (street.street = $8 AND street.type = \'street\') \n';
  sql += '  OR (zip.zip = $9 AND zip.type = \'zip\') \n';

  var sqlParameters = [continent, country, aa1, aa2, aa3, locality, subLocality, street, zip];
  var ds = server.dataSources.trashout;
  return new Promise(function (resolve, reject) {
    ds.connector.execute(sql, sqlParameters, function (err, areas) {
      if (err) {
        return reject(err);
      }

      var aliases = {
        continent: continent,
        country: country,
        aa1: aa1,
        aa2: aa2,
        aa3: aa3,
        locality: locality,
        subLocality: subLocality,
        street: street,
        zip: zip
      };

      areas.forEach(function (area) {
        aliases[area.type] = area[area.type === 'subLocality' ? 'sub_locality' : area.type];
      });

      resolve([aliases.continent, aliases.country, aliases.aa1, aliases.aa2, aliases.aa3, aliases.locality, aliases.subLocality, aliases.street, aliases.zip]);
    });

  });
}

/**
 * Finds or creates Area identifiers for given area types and connects it to GPS table
 *  
 * @param {Number} gpsId
 * @param {String} continent
 * @param {String} country
 * @param {String} aa1
 * @param {String} aa2
 * @param {String} aa3
 * @param {String} locality
 * @param {String} subLocality
 * @param {String} street
 * @param {Number} zip
 * @param {Number} zoomLevel
 * @returns {undefined}
 */
function processData(gpsId, continent, country, aa1, aa2, aa3, locality, subLocality, street, zip, zoomLevel) {
  return new Promise(function (resolve, reject) {

    getAliases(continent, country, aa1, aa2, aa3, locality, subLocality, street, zip).then(function (args) {
      var areaTypes = ['continent', 'country', 'aa1', 'aa2', 'aa3', 'locality', 'subLocality', 'street', 'zip'];

      var i;
      var j;

      var data;
      var result = [];
      for (i = 0; i < args.length; i++) {
        if (!areaTypes[i] || !args[i]) {
          continue;
        }

        data = {
          type: areaTypes[i],
          zoomLevel: zoomLevel
        };

        for (j = 0; j <= i; j++) {
          if (args[j]) {
            data[areaTypes[j]] = args[j];
          }
        }

        result.push(data);
      }

      var relations = {};

      async.eachSeries(result, function (data, callback) {
        var filter = {
          where: data
        };

        delete filter.where.zoomLevel;

        server.models.Area.findOrCreate(filter, data, function (err, instance) {
          if (err) {
            return reject(err);
          }

          relations[instance.type + 'Id'] = instance.id;

          async.setImmediate(callback);
        });
      }, function (err) {
        if (err) {
          return reject(err);
        }

        console.log('=============== GPS UPDATE ===============');
        console.log(args);
        console.log(relations);
        server.models.GPS.updateAll({id: gpsId}, relations, function (err) {
          if (err) {
            return reject(err);
          }

          console.log('=============== GPS UPDATE DONE ===============');

          resolve();
        });
      });
    }).catch(function (error) {
      return reject(error);
    });

  });
}

/**
 * Finds area info by given GPS coordinates and calls method processData to save it properly
 * 
 * @param {Number} gpsId
 * @param {Number} lat
 * @param {Number} long
 */
function fillAreas(gpsId, lat, long) {
  var resultTypes = [
    'country',
    'administrative_area_level_1',
    'administrative_area_level_2',
    'administrative_area_level_3',
    'locality',
    'sublocality',
    'neighborhood',
    'street_address',
    'postal_code'
  ];

  return new Promise(function (resolve, reject) {
    geocoder.reverse({lat: lat, lon: long, result_type: resultTypes.join('|')}, function (err, res) {
      if (err) {
        return reject(err);
      }

      processData(
              gpsId,
              getContinentByCountryCode(res[0].countryCode),
              res[0].country,
              res[0].administrativeLevels.level1long,
              res[0].administrativeLevels.level2long,
              res[0].administrativeLevels.level3long,
              res[0].city,
              res[0].extra.neighborhood,
              res[0].streetName,
              res[0].zipcode,
              null
              ).then(function () {

        resolve();

      }).catch(function (err) {
        return reject(err);
      });

    });
  });
}
