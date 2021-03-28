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

var server = require('./server');
var ds = server.dataSources.trashout;
var Promise = require('bluebird');
var Geomodel = require('geomodel').create_geomodel();
var fs = require('fs');

function readFile(path, encoding) {
  return new Promise(function (resolve, reject) {
    fs.readFile(path, encoding, function (err, data) {

      if (err) {
        reject(err);
      }

      resolve(data);
    });
  });
}

var dropForeignKeysSql = readFile(__dirname + '/../sql/dropForeignKeys.sql', 'utf8');

var foreignKeysDropped = dropForeignKeysSql.then(function (sql) {
  return new Promise(function (resolve, reject) {
    ds.connector.execute(sql, function (err, response) {

      if (err) {
        reject(err);
      }

      var resultQuery = '';

      response.forEach(function (r) {

        resultQuery += r.query;
      });

      ds.connector.execute(resultQuery, function (err, response) {

        if (err) {
          reject(err);
        }

        resolve(response);
      });

    });
  });

}).catch(function (error) {
  console.error(error);
});

foreignKeysDropped.then(function () {
  console.log('Foreign keys dropped.');
  console.log('==============================');

  var lbTables = ['Spam', 'CollectionPointSizeHasCollectionPointType'];
  ds.automigrate(lbTables, function (err) {
    if (err) {
      throw err;
    }

    console.log('Loopback tables [' + lbTables + '] created in ', ds.adapter.name);
  });


  ds.automigrate('TrashPointSize', function (err) {
    if (err) {
      throw err;
    }

    var trashSizes = [
      {name: 'car'},
      {name: 'bag'},
      {name: 'wheelbarrow'}
    ];

    server.models.TrashPointSize.create(trashSizes, function (err, model) {
      if (err) {
        throw err;
      }

      console.log('Created:', model);
    });
  });

  ds.automigrate('UserRole', function (err) {
    if (err) {
      throw err;
    }

    var userRoles = [
      {
        code: 'administrator',
        description: 'Basic administrator role'
      },
      {
        code: 'manager',
        description: 'Trash manager role'
      },
      {
        code: 'authenticated',
        description: 'Basic authenticated user'
      },
      {
        code: 'superAdmin',
        description: 'superAdmin'
      }
    ];

    server.models.UserRole.create(userRoles, function (err, model) {
      if (err) {
        console.error(err);
        throw err;
      }

      console.log('Created:', model);
    });

  });

  ds.automigrate('UserAreaRole', function (err) {
    if (err) {
      throw err;
    }

    var userAreaRoles = [
      {
        name: 'admin'
      },
      {
        name: 'manager'
      },
      {
        name: 'member'
      }
    ];

    server.models.UserAreaRole.create(userAreaRoles, function (err, model) {
      if (err) {
        console.error(err);
        throw err;
      }

      console.log('Created:', model);
    });

  });

  ds.automigrate('OrganizationRole', function (err) {
    if (err) {
      throw err;
    }

    var organizationRoles = [
      {
        name: 'Manager'
      },
      {
        name: 'Member'
      }
    ];

    server.models.OrganizationRole.create(organizationRoles, function (err, model) {
      if (err) {
        throw err;
      }

      console.log('Created:', model);
    });

  });

  ds.automigrate('User', function (err) {
    if (err) {
      throw err;
    }

    var users = [
      {
        firstName: 'Jim',
        lastName: 'Raynor',
        email: 'jim.raynor@sonsofkorhal.com',
        info: "Jim Raynor's description goes here.",
        birthdate: "2012-04-21",
        active: true,
        newsletter: true,
        imageKey: "images.key2345",
        uid: "JNgNzUH3XdNnmi0IlMbNzR3SMm93",
        tokenFCM: "asdfxcvb9876",
        userRoleId: 1,
        facebookUrl: '',
        twitterUrl: '',
        googlePlusUrl: '',
        phoneNumber: '+420123456789',
        points: 9000,
        eventOrganizer: true
      },
      {
        firstName: 'Admin',
        lastName: 'Doe',
        email: 'john.doe@trashout.com',
        info: "Ouh.",
        birthdate: "1988-10-10",
        active: true,
        newsletter: false,
        imageKey: "images.key111",
        uid: "wRGs7flGaoeSu2J8XM3sMjzaDoo1",
        tokenFCM: "xsdfxcvb9876",
        userRoleId: 2,
        facebookUrl: '',
        twitterUrl: '',
        googlePlusUrl: '',
        phoneNumber: '+420123456789',
        points: 8999,
        reviewed: '2016-03-03 22:11:00',
        eventOrganizer: true
      },
      {
        firstName: 'Zakk',
        lastName: 'Reviewer',
        email: 'zakk.wylde@trashout.com',
        info: "Ejou.",
        birthdate: "1976-01-06",
        active: true,
        newsletter: false,
        imageKey: "images.key211",
        uid: "7B9QspizfMRbrZAmunS1RNwPJqA3",
        tokenFCM: "xsdfxaab9876",
        userRoleId: 2,
        facebookUrl: '',
        twitterUrl: '',
        googlePlusUrl: '',
        phoneNumber: '+420123455789',
        points: 8997,
        reviewed: '2016-03-03 22:11:00',
        eventOrganizer: true
      },
      {
        firstName: 'Donald',
        lastName: 'Trump',
        email: 'donald.duck@disney.com',
        info: "Grab her by the pussy",
        birthdate: "1979-01-06",
        active: true,
        newsletter: false,
        imageKey: "images.key311",
        uid: "nonenonenonenonenonenonenonenone",
        tokenFCM: "xsdfxaab9870",
        userRoleId: 2,
        facebookUrl: '',
        twitterUrl: '',
        googlePlusUrl: '',
        phoneNumber: '+420823455789',
        points: 8998,
        reviewed: '2016-03-03 22:11:00',
        eventOrganizer: true
      },
      {
        firstName: 'Mahatma',
        lastName: 'Gandhi',
        email: 'gandhi.the.destroyer@takkesh.com',
        info: "Call me daddy",
        birthdate: "1952-08-01",
        active: true,
        newsletter: false,
        imageKey: "images.key411",
        uid: "nonenonenonenonenonenonenonenone",
        tokenFCM: "xsdftttb9870",
        userRoleId: 2,
        facebookUrl: '',
        twitterUrl: '',
        googlePlusUrl: '',
        phoneNumber: '+420823455789',
        points: 8996,
        reviewed: '2016-03-03 22:11:00',
        eventOrganizer: true
      },
      {
        firstName: 'Billy',
        lastName: 'Potato',
        email: 'banana@yahoo.com',
        info: "",
        birthdate: "1993-08-01",
        active: true,
        newsletter: true,
        imageKey: "images.key511",
        uid: "nonenonenonenonenonenonenonenone",
        tokenFCM: "axrftttb9870",
        userRoleId: 2,
        facebookUrl: '',
        twitterUrl: '',
        googlePlusUrl: '',
        phoneNumber: '+420888855789',
        points: 8995,
        reviewed: '2016-03-03 22:11:00',
        eventOrganizer: true
      },
      {
        firstName: 'Johny',
        lastName: 'Bravo',
        email: 'handsome@i.am',
        birthdate: "1988-07-05",
        active: true,
        newsletter: true,
        imageKey: "images.key611",
        uid: "nonenonenonenonenonenonenonenone",
        tokenFCM: "axrftttb9878",
        userRoleId: 2,
        facebookUrl: '',
        twitterUrl: '',
        googlePlusUrl: '',
        phoneNumber: '+420888855789',
        points: 8993,
        eventOrganizer: true
      },
      {
        firstName: 'Marty',
        lastName: 'McFly',
        email: 'future@is.now',
        birthdate: "1982-03-01",
        active: true,
        newsletter: true,
        imageKey: "images.key711",
        uid: "nonenonenonenonenonenonenonenone",
        tokenFCM: "axrfxttb987x",
        userRoleId: 2,
        facebookUrl: '',
        twitterUrl: '',
        googlePlusUrl: '',
        phoneNumber: '+420898855789',
        points: 8993,
        eventOrganizer: true
      },
      {
        firstName: 'Sasha',
        lastName: 'Grey',
        email: 'ee@gg.rr',
        birthdate: "1982-03-01",
        active: false,
        newsletter: false,
        imageKey: "images.key811",
        uid: "nonenonenonenonenonenonenonenone",
        tokenFCM: "axrfxttb987x",
        userRoleId: 2,
        facebookUrl: '',
        twitterUrl: '',
        googlePlusUrl: '',
        phoneNumber: '+420898855789',
        points: 8992,
        reviewed: '2016-03-03 22:11:00',
        eventOrganizer: true
      },
      {
        firstName: 'Don',
        lastName: 'Papa',
        email: 'don@papa.com',
        birthdate: "1908-03-01",
        active: true,
        newsletter: true,
        info: 'Aged in oak',
        imageKey: "images.key911",
        uid: "nonenonenonenonenonenonenonenone",
        tokenFCM: "axrfrttt9878",
        userRoleId: 2,
        facebookUrl: '',
        twitterUrl: '',
        googlePlusUrl: '',
        phoneNumber: '+420898855789',
        points: 8992,
        reviewed: '2016-03-03 22:11:00',
        eventOrganizer: false
      }
    ];

    server.models.User.create(users, function (err, model) {
      if (err) {
        throw err;
      }

      console.log('Created: ', model);
    });
  });

  ds.automigrate('Badge', function (err) {
    if (err) {
      throw err;
    }

    var badges = [
      {
        name: "Newbie",
        points: 10
      },
      {
        name: "Adept",
        points: 100
      },
      {
        name: "Skilled",
        points: 500
      },
      {
        name: "Godlike",
        points: 1000
      }
    ];


    server.models.Badge.create(badges, function (err, model) {
      if (err) {
        console.error(err);
        throw err;
      }

      console.log('Created: ', model);
    });
  });

  ds.automigrate('UserHasBadge', function (err) {
    if (err) {
      throw err;
    }

    server.models.UserHasBadge.create({
      userId: 2,
      badgeId: 1
    }, function (err, model) {
      if (err) {
        throw err;
      }

      console.log('Created: ', model);
    });
  });

  ds.automigrate('UserHasArea', function (err) {
    if (err) {
      throw err;
    }

    var items = [
      {
        userId: 1,
        areaId: 8,
        userAreaRoleId: 1
      },
      {
        userId: 2,
        areaId: 12,
        userAreaRoleId: 1
      }
    ];

    items.forEach(function (item) {
      server.models.UserHasArea.create(item, function (err, model) {
        if (err) {
          throw err;
        }

        console.log('Created: ', model);
      });
    });
  });

  ds.automigrate('TrashPointType', function (err) {
    if (err) {
      throw err;
    }

    var trashPointTypes = [
      {name: 'plastic'},
      {name: 'domestic'},
      {name: 'automotive'},
      {name: 'liquid'},
      {name: 'dangerous'},
      {name: 'metal'},
      {name: 'electronic'},
      {name: 'deadAnimals'},
      {name: 'organic'},
      {name: 'construction'},
      {name: 'glass'}
    ];

    server.models.TrashPointType.create(trashPointTypes, function (err, model) {
      if (err) {
        throw err;
      }

      console.log('Created:', model);
    });
  });

  ds.automigrate('AccessibilityType', function (err) {
    if (err) {
      throw err;
    }

    var accessibilityTypes = [
      {name: 'byCar'},
      {name: 'inCave'},
      {name: 'underWater'},
      {name: 'notForGeneralCleanup'}
    ];

    server.models.AccessibilityType.create(accessibilityTypes, function (err, model) {
      if (err) {
        throw err;
      }

      console.log('Created:', model);
    });
  });

  ds.automigrate('GPSSource', function (err) {
    if (err) {
      throw err;
    }

    var GPSSources = [
      {name: 'gps'},
      {name: 'wifi'},
      {name: 'network'},
      {name: 'unknown'}
    ];

    server.models.GPSSource.create(GPSSources, function (err, model) {
      if (err) {
        throw err;
      }

      console.log('Created:', model);
    });

  });

  ds.automigrate('GPS', function (err) {
    if (err) {
      throw err;
    }

    var GPSs = [
      {
        lat: 50.083493,
        long: 14.427720,
        accuracy: 50,
        geocell: Geomodel.compute(Geomodel.create_point(50.083493, 14.427720)),
        gpsSourceId: 2,
        countryId: 1,
        subLocalityId: 8
      },
      {
        lat: 50.081704,
        long: 14.430495,
        accuracy: 22,
        geocell: Geomodel.compute(Geomodel.create_point(50.081704, 14.430495)),
        gpsSourceId: 1,
        countryId: 1,
        aa1Id: 2,
        localityId: 3,
        subLocalityId: 4,
        streetId: 5,
        zipId: 6
      },
      {
        lat: 79.123456,
        long: 57.123456,
        geocell: Geomodel.compute(Geomodel.create_point(79.123456, 57.123456)),
        accuracy: 22,
        gpsSourceId: 1
      },
      {
        lat: -50.123456,
        long: -57.123456,
        geocell: Geomodel.compute(Geomodel.create_point(-50.123456, -57.123456)),
        accuracy: 22,
        gpsSourceId: 1
      },
      {
        lat: 50.083444,
        long: 14.427874,
        geocell: Geomodel.compute(Geomodel.create_point(50.083444, 14.427874)),
        accuracy: 22,
        gpsSourceId: 1,
        countryId: 1,
        aa1Id: 2,
        localityId: 3,
        subLocalityId: 4,
        streetId: 7,
        zipId: 8
      }
    ];

    server.models.GPS.create(GPSs, function (err, model) {
      if (err) {
        throw err;
      }

      console.log('Created:', model);
    });

  });

  ds.automigrate('TrashPoint', function (err) {
    if (err) {
      throw err;
    }

    var trashes = [
      {
        userId: 1
      },
      {
        userId: 1,
        reviewed: '2016-08-07 12:11:33'
      },
      {
        userId: 1
      },
      {
        userId: 1
      },
      {
        userId: 1
      },
      {
        userId: 3,
        reviewed: '2016-08-27 19:05:01'
      },
      {
        userId: 4
      },
      {
        userId: 3,
        reviewed: '2016-09-07 10:15:48'
      },
      {
        userId: 5
      },
      {
        userId: 6
      }
    ];

    server.models.TrashPoint.create(trashes, function (err, model) {
      if (err) {
        throw err;
      }

      console.log('Created:', model);
    });

  });

  ds.automigrate('TrashPointActivity', function (err) {
    if (err) {
      throw err;
    }

    var trashActivities = [
      {
        status: 'stillHere',
        userId: 1,
        trashPointId: 1,
        gpsId: 1,
        trashPointSizeId: 1,
        lastId: 3,
        changed: {
          updateTime: "2016-10-12T07:38:33.000Z",
          changed: {
            images: [
              {
                created: '2016-08-08 13:11:10',
                fullStorageLocation: "gs://trashoutngo-dev.appspot.com/temp-images/02-02-updated.jpg",
                fullDownloadUrl: "https://firebasestorage.googleapis.com/v0/b/trashoutngo-dev.appspot.com/o/temp-images%2F02-02-updated.jpg?alt=media&token=dd376894-fc67-4c59-8de8-3d1a7d064265",
                thumbDownloadUrl: null,
                thumbStorageLocation: null,
                thumbRetinaStorageLocation: null,
                thumbRetinaDownloadUrl: 'abc',
                id: 1
              },
              {
                created: '2016-08-08 13:11:10',
                fullStorageLocation: "gs://trashoutngo-dev.appspot.com/temp-images/02-02-updated.jpg",
                fullDownloadUrl: "https://firebasestorage.googleapis.com/v0/b/trashoutngo-dev.appspot.com/o/temp-images%2F02-02-updated.jpg?alt=media&token=dd376894-fc67-4c59-8de8-3d1a7d064265",
                thumbDownloadUrl: null,
                thumbStorageLocation: null,
                thumbRetinaStorageLocation: null,
                thumbRetinaDownloadUrl: 'def',
                id: 2
              }
            ],
            status: 'stillHere',
            type: [
              'domestic',
              'automotive',
              'metal'
            ]
          }
        }
      },
      {
        status: 'stillHere',
        userId: 1,
        trashPointId: 2,
        gpsId: 2,
        trashPointSizeId: 2,
        lastId: null
      },
      {
        status: 'less',
        userId: 1,
        trashPointId: 1,
        gpsId: 1,
        trashPointSizeId: 1,
        lastId: null
      },
      {
        status: 'stillHere',
        userId: 1,
        trashPointId: 3,
        gpsId: 3,
        trashPointSizeId: 3,
        note: 'Lorem ipsum',
        lastId: null
      },
      {
        status: 'stillHere',
        userId: 1,
        trashPointId: 4,
        gpsId: 4,
        trashPointSizeId: 2,
        lastId: null
      },
      {
        status: 'stillHere',
        userId: 1,
        trashPointId: 5,
        gpsId: 5,
        trashPointSizeId: 3,
        note: 'Dolor sit amet',
        lastId: null
      },
      {
        status: 'stillHere',
        userId: 3,
        trashPointId: 6,
        gpsId: 5,
        trashPointSizeId: 3,
        lastId: 8,
        changed: {
          changed: {
            updateTime: "2016-10-12T07:38:33.000Z",
            images: [
              {
                created: '2016-08-08 13:11:10',
                fullStorageLocation: "gs://trashoutngo-dev.appspot.com/temp-images/02-02-updated.jpg",
                fullDownloadUrl: "https://firebasestorage.googleapis.com/v0/b/trashoutngo-dev.appspot.com/o/temp-images%2F02-02-updated.jpg?alt=media&token=dd376894-fc67-4c59-8de8-3d1a7d064265",
                thumbDownloadUrl: null,
                thumbStorageLocation: null,
                thumbRetinaStorageLocation: null,
                thumbRetinaDownloadUrl: 'rumrum',
                id: 13
              },
              {
                created: '2016-08-08 13:11:10',
                fullStorageLocation: "gs://trashoutngo-dev.appspot.com/temp-images/02-02-updated.jpg",
                fullDownloadUrl: "https://firebasestorage.googleapis.com/v0/b/trashoutngo-dev.appspot.com/o/temp-images%2F02-02-updated.jpg?alt=media&token=dd376894-fc67-4c59-8de8-3d1a7d064265",
                thumbDownloadUrl: null,
                thumbStorageLocation: null,
                thumbRetinaStorageLocation: null,
                thumbRetinaDownloadUrl: 'bumbum',
                id: 14
              }
            ],
            status: 'stillHere'
          }
        }
      },
      {
        status: 'more',
        userId: 5,
        trashPointId: 6,
        gpsId: 5,
        trashPointSizeId: 3,
        lastId: null
      },
      {
        status: 'stillHere',
        userId: 4,
        trashPointId: 7,
        gpsId: 5,
        trashPointSizeId: 2,
        note: 'My first reported trash',
        lastId: null
      },
      {
        status: 'stillHere',
        userId: 5,
        trashPointId: 8,
        gpsId: 5,
        trashPointSizeId: 1,
        lastId: null
      },
      {
        status: 'stillHere',
        userId: 2,
        trashPointId: 9,
        gpsId: 5,
        trashPointSizeId: 2,
        lastId: null
      },
      {
        status: 'stillHere',
        userId: 3,
        trashPointId: 10,
        gpsId: 5,
        trashPointSizeId: 3,
        lastId: null
      }
    ];

    server.models.TrashPointActivity.create(trashActivities, function (err, model) {
      if (err) {
        throw err;
      }

      console.log('Created:', model);
    });

  });

  ds.automigrate('OrganizationType', function (err) {
    if (err) {
      throw err;
    }

    var orgTypes = [
      {name: 'Organization'},
      {name: 'Municipality'},
      {name: 'AreaManagement'},
      {name: 'Company'}
    ];

    server.models.OrganizationType.create(orgTypes, function (err, model) {
      if (err) {
        throw err;
      }

      console.log('Created:', model);
    });
  });


  ds.automigrate('Organization', function (err) {
    if (err) {
      throw err;
    }

    var organizations = [
      {
        name: 'Greenpeace',
        description: 'Eco green trolls',
        organizationTypeId: 2,
        gpsId: 1,
        mailBody: 'Test lorem ipsum',
        mailSubject: 'Test subject',
        contactEmail: 'test@org-one.com',
        contactPhone: '+420123456789',
        contactTwitter: '@greenpeaceIntl',
        contactFacebook: 'greenpeace12345',
        contactUrl: 'http://org-one.com',
        parentId: null,
        imageId: 1
      },
      {
        name: 'Děti Země',
        description: 'Treehugging freaks',
        organizationTypeId: 1,
        gpsId: 2,
        mailBody: 'Mail contents',
        mailSubject: 'Test subject 2',
        contactEmail: 'test@org-two.com',
        contactPhone: '+421917000456',
        contactTwitter: '@ech',
        contactFacebook: 'ech12345',
        contactUrl: 'http://org-two.com',
        parentId: 1,
        imageId: 3
      }
    ];

    server.models.Organization.create(organizations, function (err, model) {
      if (err) {
        throw err;
      }

      console.log('Created:', model);
    });
  });

  ds.automigrate('Event', function (err) {
    if (err) {
      throw err;
    }

    var events = [
      {
        name: 'Jarní sběr',
        userId: 6,
        gpsId: 1,
        areaId: 1,
        description: 'Lorem ipsum',
        duration: 120, // mins
        start: '2017-05-15T10:00:00',
        bring: 'Shovel',
        have: 'Gloves',
        childFriendly: true,
        city: 'Praha',
        street: 'Jindřišská 2',
        contactEmail: 'email@example.com',
        contactPhone: '+420123456789',
        cleaningAreaUpperLeftGpsId: 1,
        cleaningAreaBottomRightGpsId: 2
      },
      {
        name: 'Get schwifty',
        userId: 1,
        gpsId: 2,
        areaId: 2,
        description: 'Take off your pants and your panties. Shit on the floor. Time to get Schwifty in here.',
        duration: 800, // mins
        start: '2017-02-15T10:00:00',
        bring: 'Pants, panties',
        have: 'Schwifty time, floor',
        childFriendly: true,
        contactEmail: 'rick@morty.com',
        contactPhone: '+420123456789',
        cleaningAreaUpperLeftGpsId: 1,
        cleaningAreaBottomRightGpsId: 2
      },
      {
        name: 'Lorem ipsum',
        userId: 1,
        gpsId: 3,
        areaId: 2,
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus quis metus in mi gravida porttitor. Praesent fringilla mi nec mollis maximus.',
        duration: 20, // mins
        start: '2017-02-15T10:00:00',
        bring: 'Lorem, ipsum',
        have: 'dolor, sit, amet',
        city: 'Lorem ipsum',
        street: 'Dolor sit amet 2/78',
        contactEmail: 'lorem.ipsum@dolorsitamet.com',
        contactPhone: '+420123456789',
        cleaningAreaUpperLeftGpsId: 1,
        cleaningAreaBottomRightGpsId: 2
      },
      {
        name: "Tacos lo-fi 90's flannel swag marfa",
        userId: 2,
        gpsId: 3,
        areaId: 2,
        description: 'IPhone before they sold out swag, kombucha pour-over ramps pok pok prism poutine godard pitchfork next level sustainable. Hammock fam keffiyeh gentrify wayfarers kickstarter, quinoa iPhone. Vape single-origin coffee meditation, kale chips typewriter la croix pug squid.',
        duration: 20, // mins
        start: '2017-02-15T10:00:00',
        bring: 'beard, flannel pullover',
        have: 'Raw vegan food',
        childFriendly: false,
        city: 'Praha',
        street: 'Krymská',
        contactEmail: 'vegan@swag.com',
        contactPhone: '+420123456789',
        cleaningAreaUpperLeftGpsId: 1,
        cleaningAreaBottomRightGpsId: 2
      },
      {
        name: "Make 'murica great again",
        userId: 3,
        gpsId: 3,
        areaId: 2,
        description: '',
        duration: 20, // mins
        start: '2017-02-15T10:00:00',
        bring: 'baseball sticks, guns, knifes...',
        have: 'Bricks, walls...',
        childFriendly: true,
        city: 'Dýtrojt',
        street: 'Fordova 8',
        contactEmail: 'so.huge@murica.com',
        contactPhone: '+420123456789',
        cleaningAreaUpperLeftGpsId: 1,
        cleaningAreaBottomRightGpsId: 2
      },
      {
        name: "Make Istanbul Constantinopole Again",
        userId: 1,
        gpsId: 4,
        areaId: 2,
        description: 'Tyranosaurus je na časové ose blíž k tomu, aby viděl koncert Miley Cyrus, než aby viděl živého stegosaura.',
        duration: 30, // mins
        start: '2017-02-15T10:00:00',
        bring: 'Sufurky, motorku',
        have: 'Neviem už',
        childFriendly: true,
        city: 'Berlin',
        street: 'Gestapo strasse 88',
        contactEmail: 'milka@ccc.com',
        contactPhone: '+420123456789',
        cleaningAreaUpperLeftGpsId: 1,
        cleaningAreaBottomRightGpsId: 2
      },
      {
        name: "Zakázání internetů a počítačů",
        userId: 2,
        gpsId: 5,
        areaId: 2,
        description: 'Tyhle aféry každého jenom otravují. Já bych všechny ty internety a počítače zakázala.',
        duration: 30, // mins
        start: '2017-02-15T10:00:00',
        bring: 'Kladivo',
        have: 'Internety, počítače',
        contactEmail: 'vera.pohlova@duchodkyne72.com',
        contactPhone: '+420123456789',
        cleaningAreaUpperLeftGpsId: 1,
        cleaningAreaBottomRightGpsId: 2
      }
    ];

    server.models.Event.create(events, function (err, model) {
      if (err) {
        throw err;
      }

      console.log('Created:', model);
    });

  });

  ds.automigrate('TrashPointHasEvent', function (err) {
    if (err) {
      throw err;
    }

    var rows = [
      {
        trashPointId: 1,
        eventId: 1
      }
    ];

    server.models.TrashPointHasEvent.create(rows, function (err, model) {
      if (err) {
        throw err;
      }

      console.log('Created:', model);
    });

  });

  ds.automigrate('EventHasImage', function (err) {
    if (err) {
      throw err;
    }

    var evtImgs = [
      {
        eventId: 1,
        imageId: 1
      }
    ];

    server.models.EventHasImage.create(evtImgs, function (err, model) {
      if (err) {
        throw err;
      }

      console.log('Created:', model);
    });

  });

  ds.automigrate('PrContent', function (err) {
    if (err) {
      throw err;
    }

    var articles = [
      {
        title: "Článek jedna",
        body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis.",
        url: "http://www.example.com/article/1",
        language: "cs_CZ",
        tags: "trash, planes, ecology, garbage",
        userId: 1,
        areaId: 11,
        appIosUrl: "http://www.example.com/app/ios",
        appAndroidUrl: "http://www.example.com/app/android",
        appWindowsUrl: "http://www.example.com/app/windows"
      }
    ];

    articles.forEach(function (article) {
      console.log(article.userId);
      server.models.PrContent.create(article, function (err, model) {
        if (err) {
          throw err;
        }

        console.log('Created:', model);
      });
    });


  });

  ds.automigrate('PrContentVideo', function (err) {
    if (err) {
      throw err;
    }

    var videos = [
      {
        url: "https://www.youtube.com/watch?v=wa0nLXVFZR0",
        prContentId: 1
      }
    ];

    videos.forEach(function (video) {

      server.models.PrContentVideo.create(video, function (err, model) {
        if (err) {
          throw err;
        }

        console.log('Created:', model);
      });
    });

  });

  ds.automigrate('Image', function (err) {
    if (err)
      throw err;

    var Images = [
      {
        fullStorageLocation: "gs://trashoutngo-dev.appspot.com/temp-images/02-02-updated.jpg",
        fullDownloadUrl: "https://firebasestorage.googleapis.com/v0/b/trashoutngo-dev.appspot.com/o/temp-images%2F02-02-updated.jpg?alt=media&token=dd376894-fc67-4c59-8de8-3d1a7d064265",
        thumbDownloadUrl: null,
        thumbStorageLocation: null,
        thumbRetinaStorageLocation: null,
        thumbRetinaDownloadUrl: 'abc'
      },
      {
        fullStorageLocation: "gs://trashoutngo-dev.appspot.com/temp-images/02-02-updated.jpg",
        fullDownloadUrl: "https://firebasestorage.googleapis.com/v0/b/trashoutngo-dev.appspot.com/o/temp-images%2F02-02-updated.jpg?alt=media&token=dd376894-fc67-4c59-8de8-3d1a7d064265",
        thumbDownloadUrl: null,
        thumbStorageLocation: null,
        thumbRetinaStorageLocation: null,
        thumbRetinaDownloadUrl: 'def'
      },
      {
        fullStorageLocation: "gs://trashoutngo-dev.appspot.com/temp-images/02-02-updated.jpg",
        fullDownloadUrl: "https://firebasestorage.googleapis.com/v0/b/trashoutngo-dev.appspot.com/o/temp-images%2F02-02-updated.jpg?alt=media&token=dd376894-fc67-4c59-8de8-3d1a7d064265",
        thumbDownloadUrl: null,
        thumbStorageLocation: null,
        thumbRetinaStorageLocation: null,
        thumbRetinaDownloadUrl: 'xyz'
      },
      {
        fullStorageLocation: "gs://trashoutngo-dev.appspot.com/temp-images/02-02-updated.jpg",
        fullDownloadUrl: "https://firebasestorage.googleapis.com/v0/b/trashoutngo-dev.appspot.com/o/temp-images%2F02-02-updated.jpg?alt=media&token=dd376894-fc67-4c59-8de8-3d1a7d064265",
        thumbDownloadUrl: null,
        thumbStorageLocation: null,
        thumbRetinaStorageLocation: null,
        thumbRetinaDownloadUrl: '123'
      },
      {
        fullStorageLocation: "gs://trashoutngo-dev.appspot.com/temp-images/02-02-updated.jpg",
        fullDownloadUrl: "https://firebasestorage.googleapis.com/v0/b/trashoutngo-dev.appspot.com/o/temp-images%2F02-02-updated.jpg?alt=media&token=dd376894-fc67-4c59-8de8-3d1a7d064265",
        thumbDownloadUrl: null,
        thumbStorageLocation: null,
        thumbRetinaStorageLocation: null,
        thumbRetinaDownloadUrl: '456'
      },
      {
        fullStorageLocation: "gs://trashoutngo-dev.appspot.com/temp-images/02-02-updated.jpg",
        fullDownloadUrl: "https://firebasestorage.googleapis.com/v0/b/trashoutngo-dev.appspot.com/o/temp-images%2F02-02-updated.jpg?alt=media&token=dd376894-fc67-4c59-8de8-3d1a7d064265",
        thumbDownloadUrl: null,
        thumbStorageLocation: null,
        thumbRetinaStorageLocation: null,
        thumbRetinaDownloadUrl: '789'
      },
      {
        fullStorageLocation: "gs://trashoutngo-dev.appspot.com/temp-images/02-02-updated.jpg",
        fullDownloadUrl: "https://firebasestorage.googleapis.com/v0/b/trashoutngo-dev.appspot.com/o/temp-images%2F02-02-updated.jpg?alt=media&token=dd376894-fc67-4c59-8de8-3d1a7d064265",
        thumbDownloadUrl: null,
        thumbStorageLocation: null,
        thumbRetinaStorageLocation: null,
        thumbRetinaDownloadUrl: 'obrazek-collection-point-321'
      },
      {
        fullStorageLocation: "gs://trashoutngo-dev.appspot.com/temp-images/02-02-updated.jpg",
        fullDownloadUrl: "https://firebasestorage.googleapis.com/v0/b/trashoutngo-dev.appspot.com/o/temp-images%2F02-02-updated.jpg?alt=media&token=dd376894-fc67-4c59-8de8-3d1a7d064265",
        thumbDownloadUrl: null,
        thumbStorageLocation: null,
        thumbRetinaStorageLocation: null,
        thumbRetinaDownloadUrl: 'obrazek-collection-point-322'
      },
      {
        fullStorageLocation: "gs://trashoutngo-dev.appspot.com/temp-images/02-02-updated.jpg",
        fullDownloadUrl: "https://firebasestorage.googleapis.com/v0/b/trashoutngo-dev.appspot.com/o/temp-images%2F02-02-updated.jpg?alt=media&token=dd376894-fc67-4c59-8de8-3d1a7d064265",
        thumbDownloadUrl: null,
        thumbStorageLocation: null,
        thumbRetinaStorageLocation: null,
        thumbRetinaDownloadUrl: 'obrazek-collection-point-323'
      },
      {
        fullStorageLocation: "gs://trashoutngo-dev.appspot.com/temp-images/02-02-updated.jpg",
        fullDownloadUrl: "https://firebasestorage.googleapis.com/v0/b/trashoutngo-dev.appspot.com/o/temp-images%2F02-02-updated.jpg?alt=media&token=dd376894-fc67-4c59-8de8-3d1a7d064265",
        thumbDownloadUrl: null,
        thumbStorageLocation: null,
        thumbRetinaStorageLocation: null,
        thumbRetinaDownloadUrl: 'obrazek-collection-point-324'
      },
      {
        fullStorageLocation: "gs://trashoutngo-dev.appspot.com/temp-images/02-02-updated.jpg",
        fullDownloadUrl: "https://firebasestorage.googleapis.com/v0/b/trashoutngo-dev.appspot.com/o/temp-images%2F02-02-updated.jpg?alt=media&token=dd376894-fc67-4c59-8de8-3d1a7d064265",
        thumbDownloadUrl: null,
        thumbStorageLocation: null,
        thumbRetinaStorageLocation: null,
        thumbRetinaDownloadUrl: 'obrazek-collection-point-325'
      },
      {
        fullStorageLocation: "gs://trashoutngo-dev.appspot.com/temp-images/02-02-updated.jpg",
        fullDownloadUrl: "https://firebasestorage.googleapis.com/v0/b/trashoutngo-dev.appspot.com/o/temp-images%2F02-02-updated.jpg?alt=media&token=dd376894-fc67-4c59-8de8-3d1a7d064265",
        thumbDownloadUrl: null,
        thumbStorageLocation: null,
        thumbRetinaStorageLocation: null,
        thumbRetinaDownloadUrl: 'obrazek-collection-point-326'
      },
      {
        fullStorageLocation: "gs://trashoutngo-dev.appspot.com/temp-images/02-02-updated.jpg",
        fullDownloadUrl: "https://firebasestorage.googleapis.com/v0/b/trashoutngo-dev.appspot.com/o/temp-images%2F02-02-updated.jpg?alt=media&token=dd376894-fc67-4c59-8de8-3d1a7d064265",
        thumbDownloadUrl: null,
        thumbStorageLocation: null,
        thumbRetinaStorageLocation: null,
        thumbRetinaDownloadUrl: 'rumrum'
      },
      {
        fullStorageLocation: "gs://trashoutngo-dev.appspot.com/temp-images/02-02-updated.jpg",
        fullDownloadUrl: "https://firebasestorage.googleapis.com/v0/b/trashoutngo-dev.appspot.com/o/temp-images%2F02-02-updated.jpg?alt=media&token=dd376894-fc67-4c59-8de8-3d1a7d064265",
        thumbDownloadUrl: null,
        thumbStorageLocation: null,
        thumbRetinaStorageLocation: null,
        thumbRetinaDownloadUrl: 'bumbum'
      },
      {
        fullStorageLocation: "gs://trashoutngo-dev.appspot.com/temp-images/02-02-updated.jpg",
        fullDownloadUrl: "https://firebasestorage.googleapis.com/v0/b/trashoutngo-dev.appspot.com/o/temp-images%2F02-02-updated.jpg?alt=media&token=dd376894-fc67-4c59-8de8-3d1a7d064265",
        thumbDownloadUrl: null,
        thumbStorageLocation: null,
        thumbRetinaStorageLocation: null,
        thumbRetinaDownloadUrl: 'obrazek-trash-789'
      },
      {
        fullStorageLocation: "gs://trashoutngo-dev.appspot.com/temp-images/02-02-updated.jpg",
        fullDownloadUrl: "https://firebasestorage.googleapis.com/v0/b/trashoutngo-dev.appspot.com/o/temp-images%2F02-02-updated.jpg?alt=media&token=dd376894-fc67-4c59-8de8-3d1a7d064265",
        thumbDownloadUrl: null,
        thumbStorageLocation: null,
        thumbRetinaStorageLocation: null,
        thumbRetinaDownloadUrl: 'obrazek-trash-790'
      }
    ];

    server.models.Image.create(Images, function (err, model) {
      if (err) {
        throw err;
      }

      console.log('Created:', model);
    });

  });

  ds.automigrate('PrContentHasImage', function (err) {
    if (err)
      throw err;

    var imageLinks = [
      {
        imageId: 2,
        prContentId: 1
      }
    ];

    imageLinks.forEach(function (img) {

      server.models.PrContentHasImage.create(img, function (err, model) {
        if (err) {
          throw err;
        }

        console.log('Created:', model);
      });
    });

  });


  ds.automigrate('TrashPointActivityHasImage', function (err) {
    if (err) {
      throw err;
    }

    var trashImages = [
      {
        imageId: 1,
        trashPointActivityId: 1
      },
      {
        imageId: 2,
        trashPointActivityId: 1
      },
      {
        imageId: 3,
        trashPointActivityId: 1
      },
      {
        imageId: 4,
        trashPointActivityId: 2
      },
      {
        imageId: 5,
        trashPointActivityId: 2
      },
      {
        imageId: 6,
        trashPointActivityId: 2
      },
      {
        imageId: 13,
        trashPointActivityId: 7
      },
      {
        imageId: 14,
        trashPointActivityId: 7
      },
      {
        imageId: 15,
        trashPointActivityId: 8
      },
      {
        imageId: 16,
        trashPointActivityId: 8
      }

    ];

    server.models.TrashPointActivityHasImage.create(trashImages, function (err, model) {
      if (err) {
        throw err;
      }

      console.log('Created:', model);
    });

  });

  ds.automigrate('TrashPointActivityHasTrashPointType', function (err) {
    if (err) {
      throw err;
    }

    var trashActivityHasTrashPointTypes = [
      {
        trashPointTypeId: 6,
        trashPointActivityId: 1
      },
      {
        trashPointTypeId: 4,
        trashPointActivityId: 1
      },
      {
        trashPointTypeId: 2,
        trashPointActivityId: 1
      },
      {
        trashPointTypeId: 5,
        trashPointActivityId: 2
      },
      {
        trashPointTypeId: 3,
        trashPointActivityId: 2
      },
      {
        trashPointTypeId: 2,
        trashPointActivityId: 2
      },
      {
        trashPointTypeId: 6,
        trashPointActivityId: 3
      },
      {
        trashPointTypeId: 3,
        trashPointActivityId: 3
      },
      {
        trashPointTypeId: 2,
        trashPointActivityId: 3
      }
    ];

    server.models.TrashPointActivityHasTrashPointType.create(trashActivityHasTrashPointTypes, function (err, model) {
      if (err) {
        throw err;
      }

      console.log('Created:', model);
    });

  });

  ds.automigrate('TrashPointActivityHasAccessibilityType', function (err) {
    if (err) {
      throw err;
    }

    var trashActivityHasAccessibilityTypes = [
      {
        accessibilityTypeId: 1,
        trashPointActivityId: 1
      },
      {
        accessibilityTypeId: 2,
        trashPointActivityId: 1
      },
      {
        accessibilityTypeId: 2,
        trashPointActivityId: 1
      },
      {
        accessibilityTypeId: 1,
        trashPointActivityId: 2
      },
      {
        accessibilityTypeId: 1,
        trashPointActivityId: 3
      }
    ];

    server.models.TrashPointActivityHasAccessibilityType.create(trashActivityHasAccessibilityTypes, function (err, model) {
      if (err) {
        throw err;
      }

      console.log('Created:', model);
    });

  });

  ds.automigrate('UserHasOrganization', function (err) {
    if (err) {
      throw err;
    }

    var userOrganizationLinks = [
      {
        userId: 1,
        organizationId: 2,
        organizationRoleId: 1
      }
    ];

    server.models.UserHasOrganization.create(userOrganizationLinks, function (err, model) {
      if (err) {
        throw err;
      }

      console.log('Created:', model);
    });

  });

  ds.automigrate('UserHasEvent', function (err) {
    if (err) {
      throw err;
    }

    var userEventLinks = [
      {
        userId: 1,
        eventId: 1
      }
    ];

    server.models.UserHasEvent.create(userEventLinks, function (err, model) {
      if (err) {
        throw err;
      }

      console.log('Created:', model);
    });

  });

  ds.automigrate('Area', function (err) {
    if (err) {
      throw err;
    }

    var areas = [
      {centerLat: 50.065872, centerLong: 14.444854, zoomLevel: 5, type: 'country', continent: 'Europe', country: 'Czech Republic'},
      {centerLat: 50.065872, centerLong: 14.444854, zoomLevel: 9, type: 'aa1', continent: 'Europe', country: 'Czech Republic', aa1: 'Středočeský kraj'},
      {centerLat: 50.065872, centerLong: 14.444854, zoomLevel: 10, type: 'locality', continent: 'Europe', country: 'Czech Republic', aa1: 'Středočeský kraj', locality: 'Praha'},
      {centerLat: 50.065872, centerLong: 14.444854, zoomLevel: 12, type: 'subLocality', continent: 'Europe', country: 'Czech Republic', aa1: 'Středočeský kraj', locality: 'Praha', subLocality: 'Praha 1'},
      {centerLat: 50.065872, centerLong: 14.444854, zoomLevel: 15, type: 'street', continent: 'Europe', country: 'Czech Republic', aa1: 'Středočeský kraj', locality: 'Praha', subLocality: 'Praha 1', street: 'Vodičkova'},
      {centerLat: 50.065872, centerLong: 14.444854, zoomLevel: 20, type: 'zip', continent: 'Europe', country: 'Czech Republic', aa1: 'Středočeský kraj', locality: 'Praha', subLocality: 'Praha 1', street: 'Vodičkova', zip: 22},
      {centerLat: 50.083444, centerLong: 14.427874, zoomLevel: 20, type: 'street', continent: 'Europe', country: 'Czech Republic', aa1: 'Středočeský kraj', locality: 'Praha', subLocality: 'Praha 1', street: 'Jindřišská'},
      {centerLat: 50.083444, centerLong: 14.427874, zoomLevel: 20, type: 'zip', continent: 'Europe', country: 'Czech Republic', aa1: 'Středočeský kraj', locality: 'Praha', subLocality: 'Praha 1', street: 'Jindřišská', zip: 12},
      {centerLat: 50.065872, centerLong: 14.444854, zoomLevel: 12, type: 'subLocality', continent: 'Europe', country: 'Czech Republic', aa1: 'Středočeský kraj', locality: 'Praha', subLocality: 'Praha 2'},
      {centerLat: 49.123456, centerLong: 13.123456, zoomLevel: 10, type: 'locality', continent: 'Europe', country: 'Czech Republic', locality: 'Brno'},
      {centerLat: 49.123456, centerLong: 13.123456, zoomLevel: 10, type: 'locality', continent: 'Europe', country: 'Czech Republic', locality: 'Ostrava'},
      {centerLat: 49.123456, centerLong: 13.123456, zoomLevel: 10, type: 'locality', continent: 'Europe', country: 'Czech Republic', locality: 'Plzeň'},
      {centerLat: 50.770672, centerLong: 15.055182, zoomLevel: 10, type: 'locality', continent: 'Europe', country: 'Czech Republic', locality: 'Liberec'},
      {centerLat: 49.123456, centerLong: 13.123456, zoomLevel: 10, type: 'locality', continent: 'Europe', country: 'Czech Republic', locality: 'Olomouc'},
      {centerLat: 49.123456, centerLong: 13.123456, zoomLevel: 10, type: 'locality', continent: 'Europe', country: 'Czech Republic', locality: 'Ústí nad Labem'},
      {centerLat: 49.123456, centerLong: 13.123456, zoomLevel: 10, type: 'locality', continent: 'Europe', country: 'Czech Republic', locality: 'České Budějovice'},
      {centerLat: 49.123456, centerLong: 13.123456, zoomLevel: 10, type: 'locality', continent: 'Europe', country: 'Czech Republic', locality: 'Hradec Králové'},
      {centerLat: 49.123456, centerLong: 13.123456, zoomLevel: 10, type: 'locality', continent: 'Europe', country: 'Czech Republic', locality: 'Pardubice'},
      {centerLat: 49.123456, centerLong: 13.123456, zoomLevel: 10, type: 'locality', continent: 'Europe', country: 'Czech Republic', locality: 'Zlín'},
      {centerLat: 49.123456, centerLong: 13.123456, zoomLevel: 10, type: 'locality', continent: 'Europe', country: 'Czech Republic', locality: 'Havířov'},
      {centerLat: 49.123456, centerLong: 13.123456, zoomLevel: 10, type: 'locality', continent: 'Europe', country: 'Czech Republic', locality: 'Kladno'},
      {centerLat: 49.123456, centerLong: 13.123456, zoomLevel: 10, type: 'locality', continent: 'Europe', country: 'Czech Republic', locality: 'Most'},
      {centerLat: 49.123456, centerLong: 13.123456, zoomLevel: 10, type: 'locality', continent: 'Europe', country: 'Czech Republic', locality: 'Opava'},
      {centerLat: 49.123456, centerLong: 13.123456, zoomLevel: 10, type: 'locality', continent: 'Europe', country: 'Czech Republic', locality: 'Frýdek-Místek'},
      {centerLat: 49.123456, centerLong: 13.123456, zoomLevel: 10, type: 'locality', continent: 'Europe', country: 'Czech Republic', locality: 'Karviná'},
      {centerLat: 48.864601, centerLong: 2.335424, zoomLevel: 5, type: 'country', continent: 'Europe', country: 'France'},
      {centerLat: 48.864601, centerLong: 2.335424, zoomLevel: 10, type: 'locality', continent: 'Europe', country: 'France', locality: 'Paris'},
      {centerLat: 43.297958, centerLong: 5.359606, zoomLevel: 10, type: 'locality', continent: 'Europe', country: 'France', locality: 'Marseille'},
      {centerLat: 45.760754, centerLong: 4.823240, zoomLevel: 10, type: 'locality', continent: 'Europe', country: 'France', locality: 'Lyon'},
      {centerLat: 43.601709, centerLong: 1.424334, zoomLevel: 10, type: 'locality', continent: 'Europe', country: 'France', locality: 'Toulouse'},
      {centerLat: 49.123456, centerLong: 13.123456, zoomLevel: 10, type: 'locality', continent: 'Europe', country: 'France', locality: 'Nice'},
      {centerLat: 47.216556, centerLong: -1.554614, zoomLevel: 10, type: 'locality', continent: 'Europe', country: 'France', locality: 'Nantes'},
      {centerLat: 49.123456, centerLong: 13.123456, zoomLevel: 10, type: 'locality', continent: 'Europe', country: 'France', locality: 'Strasbourg'},
      {centerLat: 49.123456, centerLong: 13.123456, zoomLevel: 10, type: 'locality', continent: 'Europe', country: 'France', locality: 'Montpellier'},
      {centerLat: 49.123456, centerLong: 13.123456, zoomLevel: 10, type: 'locality', continent: 'Europe', country: 'France', locality: 'Bordeaux'},
      {centerLat: 49.123456, centerLong: 13.123456, zoomLevel: 10, type: 'locality', continent: 'Europe', country: 'France', locality: 'Lille'},
      {centerLat: 49.123456, centerLong: 13.123456, zoomLevel: 10, type: 'locality', continent: 'Europe', country: 'France', locality: 'Rennes'},
      {centerLat: 49.263494, centerLong: 4.019277, zoomLevel: 10, type: 'locality', continent: 'Europe', country: 'France', locality: 'Reims'},
      {centerLat: 49.491575, centerLong: 0.095269, zoomLevel: 10, type: 'locality', continent: 'Europe', country: 'France', locality: 'Le Havre'},
      {centerLat: 49.123456, centerLong: 13.123456, zoomLevel: 10, type: 'locality', continent: 'Europe', country: 'France', locality: 'Saint-Étienne'},
      {centerLat: 49.123456, centerLong: 13.123456, zoomLevel: 10, type: 'locality', continent: 'Europe', country: 'France', locality: 'Toulon'},
      {centerLat: 49.123456, centerLong: 13.123456, zoomLevel: 10, type: 'locality', continent: 'Europe', country: 'France', locality: 'Grenoble'},
      {centerLat: 47.327986, centerLong: 5.036747, zoomLevel: 10, type: 'locality', continent: 'Europe', country: 'France', locality: 'Dijon'},
      {centerLat: 50.676370, centerLong: 4.851651, zoomLevel: 5, type: 'country', continent: 'Europe', country: 'Belgium'},
      {centerLat: 40.385489, centerLong: -4.566468, zoomLevel: 5, type: 'country', continent: 'Europe', country: 'Spain'},
      {centerLat: 40.422570, centerLong: -3.713692, zoomLevel: 10, type: 'locality', continent: 'Europe', country: 'Spain', locality: 'Madrid'},
      {centerLat: 43.049615, centerLong: 12.439265, zoomLevel: 5, type: 'country', continent: 'Europe', country: 'Italy'},
      {centerLat: 41.910714, centerLong: 12.450789, zoomLevel: 10, type: 'locality', continent: 'Europe', country: 'Italy', locality: 'Roma'}
    ];

    server.models.Area.create(areas, function (err, model) {
      if (err) {
        throw err;
      }

      console.log('Created:', model);
    });
  });

  ds.automigrate('AreaManager', function (err) {
    if (err) {
      throw err;
    }

    var items = [
      {
        userId: 1,
        areaId: 4
      }
    ];

    server.models.AreaManager.create(items, function (err, model) {
      if (err) {
        throw err;
      }

      console.log('Created:', model);
    });

  });

  ds.automigrate('CollectionPoint', function (err) {
    if (err) {
      throw err;
    }

    var collectionPoints = [
      {
        userId: 2,
        reviewed: '2016-08-08 13:11:10'
      },
      {
        userId: 1
      },
      {
        userId: 1
      },
      {
        userId: 4,
        reviewed: '2016-09-08 10:11:10'
      },
      {
        userId: 1
      }
    ];

    server.models.CollectionPoint.create(collectionPoints, function (err, model) {
      if (err) {
        throw err;
      }

      console.log('Created:', model);
    });

  });

  ds.automigrate('CollectionPointActivity', function (err) {
    if (err) {
      throw err;
    }

    var collectionPointActivities = [
      {
        userId: 1,
        collectionPointId: 1,
        gpsId: 1,
        collectionPointSizeId: 1,
        lastId: 3,
        changed: {
          updateTime: "2016-10-12T07:38:33.000Z",
          changed: {
            images: [
              {
                created: '2016-08-08 13:11:10',
                fullStorageLocation: "gs://trashoutngo-dev.appspot.com/temp-images/02-02-updated.jpg",
                fullDownloadUrl: "https://firebasestorage.googleapis.com/v0/b/trashoutngo-dev.appspot.com/o/temp-images%2F02-02-updated.jpg?alt=media&token=dd376894-fc67-4c59-8de8-3d1a7d064265",
                thumbDownloadUrl: null,
                thumbStorageLocation: null,
                thumbRetinaStorageLocation: null,
                thumbRetinaDownloadUrl: 'obrazek-collection-point-321',
                id: 7
              },
              {
                created: '2016-08-08 13:11:10',
                fullStorageLocation: "gs://trashoutngo-dev.appspot.com/temp-images/02-02-updated.jpg",
                fullDownloadUrl: "https://firebasestorage.googleapis.com/v0/b/trashoutngo-dev.appspot.com/o/temp-images%2F02-02-updated.jpg?alt=media&token=dd376894-fc67-4c59-8de8-3d1a7d064265",
                thumbDownloadUrl: null,
                thumbStorageLocation: null,
                thumbRetinaStorageLocation: null,
                thumbRetinaDownloadUrl: 'obrazek-collection-point-322',
                id: 8
              }
            ],
            type: [
              'metal',
              'electronic',
              'deadAnimals'
            ]
          }
        }
      },
      {
        userId: 1,
        collectionPointId: 2,
        gpsId: 2,
        collectionPointSizeId: 2,
        lastId: null
      },
      {
        userId: 1,
        collectionPointId: 1,
        gpsId: 1,
        collectionPointSizeId: 1,
        lastId: null
      },
      {
        userId: 1,
        collectionPointId: 3,
        gpsId: 3,
        collectionPointSizeId: 2,
        lastId: null
      },
      {
        userId: 1,
        collectionPointId: 4,
        gpsId: 4,
        collectionPointSizeId: 2,
        lastId: null
      },
      {
        userId: 1,
        collectionPointId: 5,
        gpsId: 5,
        collectionPointSizeId: 1,
        lastId: null
      }
    ];

    server.models.CollectionPointActivity.create(collectionPointActivities, function (err, model) {
      if (err) {
        throw err;
      }

      console.log('Created:', model);
    });

  });

  ds.automigrate('CollectionPointType', function (err) {
    if (err) {
      throw err;
    }

    var collectionPointTypes = [
      {name: 'plastic'},
      {name: 'metal'},
      {name: 'electronic'},
      {name: 'deadAnimals'},
      {name: 'organic'}
    ];

    server.models.CollectionPointType.create(collectionPointTypes, function (err, model) {
      if (err) {
        throw err;
      }

      console.log('Created:', model);
    });
  });

  ds.automigrate('CollectionPointSize', function (err) {
    if (err) {
      throw err;
    }

    var collectionPointSizes = [
      {name: 'dustbin'},
      {name: 'scrapyard'}
    ];

    server.models.CollectionPointSize.create(collectionPointSizes, function (err, model) {
      if (err) {
        throw err;
      }

      console.log('Created:', model);
    });
  });

  ds.automigrate('CollectionPointActivityHasImage', function (err) {
    if (err) {
      throw err;
    }

    var collectionPointImages = [
      {
        imageId: 7,
        collectionPointActivityId: 1
      },
      {
        imageId: 8,
        collectionPointActivityId: 1
      },
      {
        imageId: 9,
        collectionPointActivityId: 2
      },
      {
        imageId: 10,
        collectionPointActivityId: 2
      },
      {
        imageId: 11,
        collectionPointActivityId: 3
      },
      {
        imageId: 12,
        collectionPointActivityId: 3
      }
    ];

    server.models.CollectionPointActivityHasImage.create(collectionPointImages, function (err, model) {
      if (err) {
        throw err;
      }

      console.log('Created:', model);
    });

  });

  ds.automigrate('CollectionPointActivityHasCollectionPointType', function (err) {
    if (err) {
      throw err;
    }

    var collectionPointActivityHasCollectionPointTypes = [
      {
        collectionPointTypeId: 3,
        collectionPointActivityId: 1
      },
      {
        collectionPointTypeId: 4,
        collectionPointActivityId: 1
      },
      {
        collectionPointTypeId: 2,
        collectionPointActivityId: 1
      },
      {
        collectionPointTypeId: 4,
        collectionPointActivityId: 2
      },
      {
        collectionPointTypeId: 3,
        collectionPointActivityId: 2
      },
      {
        collectionPointTypeId: 2,
        collectionPointActivityId: 2
      },
      {
        collectionPointTypeId: 3,
        collectionPointActivityId: 3
      },
      {
        collectionPointTypeId: 2,
        collectionPointActivityId: 3
      },
      {
        collectionPointTypeId: 5,
        collectionPointActivityId: 3
      }
    ];

    server.models.CollectionPointActivityHasCollectionPointType.create(collectionPointActivityHasCollectionPointTypes, function (err, model) {
      if (err) {
        throw err;
      }

      console.log('Created:', model);
    });

  });

  ds.automigrate('ApiKey', function (err) {
    if (err) {
      throw err;
    }

    var apiKeys = [
      {
        apiKey: 'a35sd6a2s0q223aaaad22a3',
        userId: 3,
        limitPerHour: 3
      },
      {
        apiKey: '9wa6d65d8sa355g5j5l5p5r',
        userId: 1,
        limitPerHour: 70
      }
    ];

    server.models.ApiKey.create(apiKeys, function (err, model) {
      if (err) {
        throw err;
      }

      console.log('Created:', model);
    });

  });

  ds.automigrate('CollectionPointHasEvent', function (err) {
    if (err) {
      throw err;
    }

    var rows = [
      {
        collectionPointId: 1,
        eventId: 1
      }
    ];

    server.models.CollectionPointHasEvent.create(rows, function (err, model) {
      if (err) {
        throw err;
      }

      console.log('Created:', model);
    });

  });

  setTimeout(function () {
    // Add foreign keys manually

    var addForeignKeysSql = readFile(__dirname + '/../sql/addForeignKeys.sql', 'utf8');

    var foreignKeysAdded = addForeignKeysSql.then(function (sql) {
      return new Promise(function (resolve, reject) {
        ds.connector.execute(sql, function (err, response) {

          if (err) {
            reject(err);
          }

          resolve(response);
        });
      });
    }).catch(function (error) {
      throw error;
    });

    foreignKeysAdded.then(function () {
      console.log('==============================');
      console.log('Foreign keys added.');
      console.log('==============================');
      console.log('Fixed timeout: 5 seconds');
      console.log('Disconnecting...');
      ds.disconnect();
    });

  }, 5000);

}).catch(function (error) {
  console.error(error);
});
