'use strict';

/*global describe*/
/*global it*/
/*eslint no-unused-vars: "off"*/

var should = require('chai').should();
var supertest = require('supertest');

var url;
if (process.env.NODE_ENV === 'production') {
  url = 'https://api.trashout.ngo/v1';
} else {
  url = 'http://localhost:3000/api';
}

var api = supertest(url);

var chai = require("chai");
chai.should();
chai.use(require('chai-things'));

var superAdminToken = 'e3VzZXJSb2xlOiAnc3VwZXJBZG1pbid9';
var adminToken = 'e3VzZXJSb2xlOiBhZG1pbn0=';
var reviewerToken = 'e3VzZXJSb2xlOiByZXZpZXdlcn0=';
var authenticatedToken = 'e3VzZXJSb2xlOiBhdXRoZW50aWNhdGVkfQ==';

describe('INTEGRATION: Event List', function () {

  it('should filter Events with name "volunteer"', function (done) {
    api.get('/event/?attributesNeeded=name&eventName=volunteer&limit=10')
            .set('X-Token', reviewerToken)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function (err, res) {
              if (err) {
                return done(err);
              }

              res.body.should.be.instanceof(Array).and.all.have.property('name', 'volunteer');
              done();
            });
  });

});

describe('INTEGRATION: Event', function () {

  var createdTestingEntityId;

  it('should create Event', function (done) {

    var payload = {
      images: [
        {
          fullStorageLocation: 'gs://trashoutngo-dev.appspot.com/temp-images/02-02-updated.jpg',
          fullDownloadUrl: 'https://firebasestorage.googleapis.com/v0/b/trashoutngo-dev.appspot.com/o/temp-images%2F02-02-updated.jpg?alt=media&token=dd376894-fc67-4c59-8de8-3d1a7d064265',
          thumbDownloadUrl: null,
          thumbStorageLocation: null,
          thumbRetinaStorageLocation: null,
          thumbRetinaDownloadUrl: null
        }
      ],
      name: 'New cleaning',
      gps: {
        lat: 54.123456,
        long: 36.123456,
        accuracy: 5,
        source: 'network'
      },
      cleaningArea: {
        upperLeft: {
          lat: 50.083677,
          long: 14.426023,
          accuracy: 10,
          source: 'network'
        },
        bottomRight: {
          lat: 50.052761,
          long: 14.513095,
          accuracy: 10,
          source: 'network'
        }
      },
      description: 'Lorem ipsum',
      start: '2016-04-12T07:38:33.000Z',
      duration: 4,
      bring: 'Shovel, bags',
      have: 'Gloves...',
      childFriendly: true,
      contact: {
        email: 'john@doe.com',
        phone: '111222333'
      },
      trashPointIds: [],
      collectionPointIds: []
    };

    api.post('/event')
            .set('X-Token', reviewerToken)
            .send(payload)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function (err, res) {
              if (err) {
                return done(err);
              }

              res.body.should.have.property('id').and.match(/[0-9]+/);

              createdTestingEntityId = res.body.id;
              done();
            });

  });

  it('should update Event (reviewer - event creator)', function (done) {

    var payload = {
      name: 'Cleanin\'N\'Fixin',
      gps: {
        lat: 54.123456,
        long: 54.123456,
        accuracy: 0,
        source: 'gps'
      },
      cleaningArea: {
        upperLeft: {
          lat: 50.083677,
          long: 14.426023,
          accuracy: 10,
          source: 'network'
        },
        bottomRight: {
          lat: 50.052761,
          long: 14.513095,
          accuracy: 10,
          source: 'network'
        }
      },
      description: 'Lorem ipsum',
      start: '2016-04-12T07:38:33.000Z',
      duration: 4,
      bring: 'Shovel, bags',
      have: 'Gloves...',
      childFriendly: true,
      contact: {
        email: 'john@doe.com',
        phone: '111222333'
      },
      trashPointIds: [],
      collectionPointIds: []
    };

    api.put('/event/' + createdTestingEntityId)
            .set('X-Token', reviewerToken)
            .send(payload)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function (err, res) {
              if (err) {
                return done(err);
              }

              res.body.should.have.property('id').and.match(/[0-9]+/);

              done();
            });

  });

  it('should join user to Event (reviewer)', function (done) {

    api.post('/event/' + createdTestingEntityId + '/users')
            .set('X-Token', reviewerToken)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function (err, res) {
              if (err) {
                return done(err);
              }

              done();
            });

  });

  it('shouldn\'t delete user from Event (reviewer)', function (done) {

    api.delete('/event/' + createdTestingEntityId + '/users/' + 34000)
            .set('X-Token', reviewerToken)
            .expect(403)
            .expect('Content-Type', /json/)
            .end(function (err, res) {
              if (err) {
                return done(err);
              }

              done();
            });

  });

  it('should delete user from Event (superAdmin)', function (done) {

    api.delete('/event/' + createdTestingEntityId + '/users/' + 34000)
            .set('X-Token', superAdminToken)
            .expect(204)
            .expect('Content-Type', /json/)
            .end(function (err, res) {
              if (err) {
                return done(err);
              }

              done();
            });

  });

  it('shouldn\'t delete Event (admin, but different user)', function (done) {

    api.delete('/event/' + createdTestingEntityId)
            .set('X-Token', authenticatedToken)
            .expect(403)
            .expect('Content-Type', /json/)
            .end(function (err) {
              if (err) {
                return done(err);
              }

              done();
            });

  });

  it('should delete Event (superAdmin)', function (done) {

    api.delete('/event/' + createdTestingEntityId)
            .set('X-Token', superAdminToken)
            .expect(204)
            .expect('Content-Type', /json/)
            .end(function (err) {
              if (err) {
                return done(err);
              }

              done();
            });

  });

});
