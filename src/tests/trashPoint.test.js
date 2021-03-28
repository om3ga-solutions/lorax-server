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

describe('INTEGRATION: Trash List', function () {

  it('should filter TrashPoints with size "bag"', function (done) {
    api.get('/trash/?attributesNeeded=size&trashSize=bag&limit=10')
            .set('X-Token', reviewerToken)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function (err, res) {
              if (err) {
                return done(err);
              }

              res.body.should.be.instanceof(Array).and.all.have.property('size', 'bag');
              done();
            });
  });

});

describe('INTEGRATION: Trash', function () {

  var createdTestingEntityId;
  var createdTestingEntityActivityId;
  var lastTestingEntityActivityId;
  var lastTestingEntityImageId;

  it('should create trash point', function (done) {

    var payload = {
      images: [
        {
          fullStorageLocation: 'gs://trashoutngo-dev.appspot.com/temp-images/02-02-updated.jpg',
          fullDownloadUrl: 'https://firebasestorage.googleapis.com/v0/b/trashoutngo-dev.appspot.com/o/temp-images%2F02-02-updated.jpg?alt=media&token=dd376894-fc67-4c59-8de8-3d1a7d064265',
          thumbDownloadUrl: '1c',
          thumbStorageLocation: '1d',
          thumbRetinaStorageLocation: '1e',
          thumbRetinaDownloadUrl: '1f'
        },
        {
          fullStorageLocation: 'gs://trashoutngo-dev.appspot.com/temp-images/02-02-updated.jpg',
          fullDownloadUrl: 'https://firebasestorage.googleapis.com/v0/b/trashoutngo-dev.appspot.com/o/temp-images%2F02-02-updated.jpg?alt=media&token=dd376894-fc67-4c59-8de8-3d1a7d064265',
          thumbDownloadUrl: '2c',
          thumbStorageLocation: '2d',
          thumbRetinaStorageLocation: '2e',
          thumbRetinaDownloadUrl: '2f'
        }
      ],
      gps: {
        lat: 54.123456,
        long: 54.123456,
        accuracy: 50,
        source: 'wifi'
      },
      size: 'bag',
      types: [
        'plastic',
        'domestic',
        'automotive',
        'liquid',
        'dangerous'
      ],
      note: 'Lorem ipsum',
      anonymous: true,
      accessibility: {
        byCar: true,
        inCave: true,
        underWater: false,
        notForGeneralCleanup: false
      }
    };

    api.post('/trash')
            .set('X-Token', reviewerToken)
            .send(payload)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function (err, res) {
              if (err) {
                return done(err);
              }

              res.body.should.have.property('id').and.match(/[0-9]+/);
              res.body.should.have.property('activityId').and.match(/[0-9]+/);

              createdTestingEntityId = res.body.id;
              createdTestingEntityActivityId = res.body.activityId;
              done();
            });

  });

  it('should update trash point', function (done) {

    var payload = {
      images: [
        {
          fullStorageLocation: 'gs://trashoutngo-dev.appspot.com/temp-images/02-02-updated.jpg',
          fullDownloadUrl: 'https://firebasestorage.googleapis.com/v0/b/trashoutngo-dev.appspot.com/o/temp-images%2F02-02-updated.jpg?alt=media&token=dd376894-fc67-4c59-8de8-3d1a7d064265',
          thumbDownloadUrl: '1c',
          thumbStorageLocation: '1d',
          thumbRetinaStorageLocation: '1e',
          thumbRetinaDownloadUrl: '1f'
        },
        {
          fullStorageLocation: 'gs://trashoutngo-dev.appspot.com/temp-images/02-02-updated.jpg',
          fullDownloadUrl: 'https://firebasestorage.googleapis.com/v0/b/trashoutngo-dev.appspot.com/o/temp-images%2F02-02-updated.jpg?alt=media&token=dd376894-fc67-4c59-8de8-3d1a7d064265',
          thumbDownloadUrl: '2c',
          thumbStorageLocation: '2d',
          thumbRetinaStorageLocation: '2e',
          thumbRetinaDownloadUrl: '2f'
        }
      ],
      gps: {
        lat: 54.123456,
        long: 54.123456,
        accuracy: 44,
        source: 'network'
      },
      size: 'bag',
      types: [
        'plastic',
        'domestic',
        'automotive',
        'liquid',
        'dangerous'
      ],
      note: 'Lorem ipsum',
      anonymous: true,
      status: 'less',
      cleanedByMe: false,
      accessibility: {
        byCar: false,
        inCave: true,
        underWater: false,
        notForGeneralCleanup: false
      }
    };

    api.put('/trash/' + createdTestingEntityId)
            .set('X-Token', reviewerToken)
            .send(payload)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function (err, res) {
              if (err) {
                return done(err);
              }

              res.body.should.have.property('id').and.match(/[0-9]+/);
              res.body.should.have.property('activityId').and.match(/[0-9]+/);
              lastTestingEntityActivityId = res.body.activityId;

              done();
            });

  });

  it('should contain array of images', function (done) {
    api.get('/trash/' + createdTestingEntityId)
            .set('X-Token', reviewerToken)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function (err, res) {
              if (err) {
                return done(err);
              }

              res.body.should.have.property('images').and.be.instanceof(Array);
              lastTestingEntityImageId = res.body.images[0].id;

              done();
            });

  });

  it('shouldn\'t delete trash point activity image (reviewer)', function (done) {

    api.delete('/trash/activity/' + lastTestingEntityActivityId + '/images/' + lastTestingEntityImageId)
            .set('X-Token', reviewerToken)
            .expect(403)
            .expect('Content-Type', /json/)
            .end(function (err) {
              if (err) {
                return done(err);
              }

              done();
            });

  });

  it('should delete trash point activity image (superAdmin)', function (done) {

    api.delete('/trash/activity/' + lastTestingEntityActivityId + '/images/' + lastTestingEntityImageId)
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

  it('shouldn\'t delete trash point activity (reviewer)', function (done) {

    api.delete('/trash/' + createdTestingEntityId)
            .set('X-Token', reviewerToken)
            .expect(403)
            .expect('Content-Type', /json/)
            .end(function (err) {
              if (err) {
                return done(err);
              }

              done();
            });

  });

  it('should delete trash point activity (superAdmin)', function (done) {

    api.delete('/trash/activity/' + lastTestingEntityActivityId)
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

  it('shouldn\'t delete trash point (reviewer)', function (done) {

    api.delete('/trash/' + createdTestingEntityId)
            .set('X-Token', reviewerToken)
            .expect(403)
            .expect('Content-Type', /json/)
            .end(function (err) {
              if (err) {
                return done(err);
              }

              done();
            });

  });

  it('should delete trash point (superAdmin)', function (done) {

    api.delete('/trash/' + createdTestingEntityId)
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
