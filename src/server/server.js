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

/**
 * Replace all the occurences
 *
 * @param {String} search
 * @param {String} replacement
 * @returns {String}
 */
String.prototype.replaceAll = function (search, replacement) {
  var target = this;
  return target.split(search).join(replacement);
};

/**
 * Make a string's first character uppercase
 *
 * @returns {String}
 */
String.prototype.upperCaseFirst = function () {
  return this.charAt(0).toUpperCase() + this.slice(1);
};

/**
 * Computes the intersection of arrays
 *
 * @param {Array} arr2
 * @returns {Array}
 */
Array.prototype.intersect = function (arr2) {
  var ret = [];
  for (var i in this) {
    if (arr2.indexOf(this[i]) > -1) {
      ret.push(this[i]);
    }
  }
  return ret;
};

/**
 * Computes the difference of arrays
 *
 * @param {Array} a
 * @returns {Array}
 */
Array.prototype.diff = function (a) {
  return this.filter(function (i) {
    return a.indexOf(i) < 0;
  });
};

/**
 * Compares two arrays
 *
 * @param {Array} testArr
 * @returns {Boolean}
 */
Array.prototype.compare = function (testArr) {
  if (this.length !== testArr.length)
    return false;
  for (var i = 0; i < testArr.length; i++) {
    if (this[i].compare) { //To test values in nested arrays
      if (!this[i].compare(testArr[i]))
        return false;
    } else if (this[i] !== testArr[i])
      return false;
  }
  return true;
};

/*eslint-disable */
/**
 * Returns date in "2014-07-06T16:00:00+02:00" Format
 *
 * @returns {String}
 */
/*eslint-enable */
Date.prototype.toIsoString = function () {
  var tzo = -this.getTimezoneOffset(),
    dif = tzo >= 0 ? '+' : '-',
    pad = function (num) {
      var norm = Math.abs(Math.floor(num));
      return (norm < 10 ? '0' : '') + norm;
    };

  return this.getFullYear() +
          '-' + pad(this.getMonth() + 1) +
          '-' + pad(this.getDate()) +
          'T' + pad(this.getHours()) +
          ':' + pad(this.getMinutes()) +
          ':' + pad(this.getSeconds()) +
          dif + pad(tzo / 60) +
          ':' + pad(tzo % 60);
};

// Sentry initialization
var Sentry = require('../common/helpers/sentry');
Sentry.init();

var loopback = require('loopback');
var boot = require('loopback-boot');

var app = module.exports = loopback();

var types = require('pg').types;
types.setTypeParser(1700, 'text', parseFloat);

app.start = function() {
  // start the web server
  return app.listen(function() {
    app.emit('started');
    var baseUrl = app.get('url').replace(/\/$/, '');
    console.log('Web server listening at: %s', baseUrl);
    if (app.get('loopback-component-explorer')) {
      var explorerPath = app.get('loopback-component-explorer').mountPath;
      console.log('Browse your REST API at %s%s', baseUrl, explorerPath);
    }
  });
};

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname, function(err) {
  if (err) throw err;

  // start the server if `$ node server.js`
  if (require.main === module)
    app.start();
});
