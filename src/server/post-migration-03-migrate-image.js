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
require('events').EventEmitter.prototype._maxListeners = 100;

/*eslint no-unused-vars: "off"*/

var server = require('./server');
var Promise = require('bluebird');
var fs = require("fs");
var googlecloud = require('google-cloud');
var datastore = googlecloud.datastore;
var dataset = datastore({
  projectId: 'trashoutngo',
  keyFilename: './server/trashoutngo-39262b85ec7b.json'
});
var gcloud = require('gcloud');
var storage = gcloud.storage({
  projectId: 'trashoutngo-dev',
  keyFilename: './server/trashoutngo-dev-14168fec1047.json'
});
var bucketName = 'trashoutngo-dev.appspot.com';
var bucket = storage.bucket(bucketName);
function getImages() {
  return new Promise(function (resolve, reject) {
    server.models.Image.find({where: {_oldImageKey: {neq: null}, fullStorageLocation: null, fullDownloadUrl: null}, limit: 10000}, function (err, instances) {
      if (err) {
        return console.error(err);
      }

      var imageKeys = [];
      instances.forEach(function (instance) {
        imageKeys.push(instance._oldImageKey);
      });
      imageKeys.forEach(function (key) {
        dataset.get(dataset.key(['Image', Number(key)]), function (err, entity) {
          if (err) {
            return console.error(err);
          } else if(typeof entity === "undefined"){
            return console.log('entity is undefined');
          } else if(typeof entity.base64 === "undefined"){
            return console.log(entity);
          } else {

            var name = key + '.jpg';
            fs.writeFile(name, entity.base64, 'base64', function (err, data) {
              if (err) {
                return console.error(err);

              } else {
                console.log(name);
                var options = {
                  destination: 'images/' + name,
                  resumable: true,
                  predefinedAcl: 'publicread'
                };
                bucket.upload(name, options, function (err, newFile) {
                  if (err) {
                    return console.error(err);

                  } else {
                    fs.unlink(name, function (err) {
                      if (err) {
                        console.error(err);
                      }
                      var location = 'gs://' + bucketName + '/images/' + name;
                      var publicUrl = 'https://storage.googleapis.com/' + bucketName + '/images/' + name;
                      server.models.Image.updateAll({_oldImageKey: key}, {fullStorageLocation: location, fullDownloadUrl: publicUrl}, function (err) {
                        if (err) {
                          console.error(err);
                        } else {
                          console.log(location);
                          console.log(publicUrl);
                        }
                      });
                    });
                  }
                });
              }
            });
          }
        });
      });
    });
  });
}

getImages();
