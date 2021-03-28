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

var Sentry;

module.exports = {
  init: function () {
    // Setup Sentry error tracking
    var sentryConfig = require(__dirname + '/../../server/sentry.json');
    if (sentryConfig && sentryConfig.dsn) {
      Sentry = require('@sentry/node');
      var os = require("os");

      // Capture console.error with Sentry
      Sentry.init({
        environment: process.env.NODE_ENV || '_other',
        dsn: sentryConfig.dsn,
        release: sentryConfig.release,
        serverName: os.hostname()
      });

      // inject Sentry capture to error.log (not used CaptureConsole integration, because it not showing issue in code preview)
      console.errorOriginal = console.error;
      console.error = function (message, optionalParams) {
        Sentry.captureException(message);
        console.errorOriginal(message, optionalParams);
      };
    }
  },
  getInstance: function () {
    return Sentry;
  }
};
