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
var nodemailer = require('nodemailer');
var EmailTemplate = require('email-templates').EmailTemplate;
var path = require('path');
var Promise = require('bluebird');

var smtpCredentials = {};

switch (process.env.NODE_ENV) {
  case 'production':
  case 'stage':
    smtpCredentials = require(__dirname + '/../../server/smtp-credentials.' + process.env.NODE_ENV + '.json');
    break;
  default:
    smtpCredentials = require(__dirname + '/../../server/smtp-credentials.json');
}

var transporter = nodemailer.createTransport({
  host: smtpCredentials.host,
  port: smtpCredentials.port,
  secure: smtpCredentials.secure,
  auth: {
    user: smtpCredentials.user,
    pass: smtpCredentials.pass
  }
});

var emailTranslations = {
  'cs_CZ': require(__dirname + '/../../data/localization/cs.json'),
  'de_DE': require(__dirname + '/../../data/localization/de.json'),
  'en_US': require(__dirname + '/../../data/localization/en.json'),
  'es_ES': require(__dirname + '/../../data/localization/es.json'),
  'ru_RU': require(__dirname + '/../../data/localization/ru.json'),
  'sk_SK': require(__dirname + '/../../data/localization/sk.json')
};

module.exports = function (BaseModel) {

  BaseModel.user = {
    id: null,
    userRole: {}
  };

  BaseModel.setup = function () {
    BaseModel.base.setup.apply(this, arguments);

    this.beforeRemote('**', function (ctx, result, next) {

      /**
       * Parameters for parametrized SQL queries
       * 
       * @type Array
       */
      BaseModel.sqlParameters = [];

      /**
       * Order number of SQL parameter - PostgreSQL style of parametrized queries goes like this
       * "INSERT INTO my_table(field1, field2) VALUES ($1, $2)"
       * 
       * @type Number
       */
      BaseModel.parameterOrderNumber = 1;

      next();

    });
  };


  /**
   * Stores parameters for parametrized queries and returns parameter number
   * 
   * @param {Mixed} parameter
   * @returns {String}
   */
  BaseModel.sanitize = function (parameter) {
    var result = '';

    if (parameter.constructor === Array) {
      var isFirst = true;
      parameter.forEach(function (p) {
        BaseModel.sqlParameters.push(p);

        result += (isFirst ? '' : ', ') + '$' + BaseModel.parameterOrderNumber++;
        isFirst = false;
      });
    } else {
      BaseModel.sqlParameters.push(parameter);
      result += '$' + BaseModel.parameterOrderNumber++;
    }

    return result;
  };

  /**
   * Initialize SQL parameters for PostgreSQL
   * 
   * @returns void
   */
  BaseModel.initSqlParameters = function () {
    BaseModel.sqlParameters = [];
    BaseModel.parameterOrderNumber = 1;
  };

  /**
   * Sends email
   * 
   * @param {String} type
   * @param {Object} headers - must contain "to"
   * @param {Object} params
   * @param {String} lang
   * @returns {Promise}
   */
  BaseModel.sendEmail = function (type, headers, params, lang) {
    var templateDir = path.join(__dirname, '../templates/emails', type);
    var template = new EmailTemplate(templateDir);
    var languages = ['cs_CZ', 'de_DE', 'en_US', 'es_ES', 'ru_RU', 'sk_SK'];

    if (!lang || languages.indexOf(lang) === -1) {
      lang = 'en_US';
    }

    params.baseUrl = Constants.ADMIN_WEB_BASE_URL;
    params.lang = lang;
    params.translations = emailTranslations[lang];

    return new Promise(function (resolve, reject) {

      template.render(params, function (err, result) {
        if (err) {
          return reject(err);
        }

        var message = {
          from: headers.from || 'no-reply@trashout.ngo',
          to: headers.to || BaseModel.user.email,
          subject: headers.subject || 'TrashOut',
          html: result.html
        };

        transporter.sendMail(message, function (err, info) {
          if (err) {
            return reject(err);
          }
          console.log('email sent to: ' + message.to + ' - ' + type);
          resolve(info);
        });
      });

    });
  };

  /**
   * 
   * @param {String} html
   * @param {Object} headers
   * @returns {Promise}
   */
  BaseModel.sendHtmlEmail = function (html, headers) {
    return new Promise(function (resolve, reject) {

      var message = {
        from: headers.from || 'no-reply@trashout.ngo',
        to: headers.to || BaseModel.user.email,
        subject: headers.subject || 'TrashOut',
        html: html
      };

      transporter.sendMail(message, function (err, info) {
        if (err) {
          return reject(err);
        }

        resolve(info);
      });
    });
  };

  BaseModel.setup();
};
