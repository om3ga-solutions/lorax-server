'use strict';

/*global describe*/
/*global it*/
/*eslint no-unused-vars: "off"*/

var assert = require('assert');
var should = require('chai').should();
var supertest = require('supertest');

var url;
if (process.env.NODE_ENV === 'production') {
  url = 'https://api.trashout.ngo/v1';
} else {
  url = 'http://localhost:3000/api';
}


var api = supertest(url);

var superAdminToken = 'e3VzZXJSb2xlOiAnc3VwZXJBZG1pbid9';
var adminToken = 'e3VzZXJSb2xlOiBhZG1pbn0=';
var reviewerToken = 'e3VzZXJSb2xlOiByZXZpZXdlcn0=';
var authenticatedToken = 'e3VzZXJSb2xlOiBhdXRoZW50aWNhdGVkfQ==';

describe('INTEGRATION: Badge api', function () {

  var existingLocalityId = 137;
  var existingImageId = 3000;
  var createdTestingEntityId;

  /**
   * create a new badge
   */
  it('can create badge', function (done) {

    var payload = {
      name: 'blimp',
      localityId: existingLocalityId,
      imageId: existingImageId,
      points: 300
    };

    api.post('/badges')
      .set('X-Token', superAdminToken)
      .send(payload)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function (err, res) {
        if (err) {
          return done(err);
        }

        res.body.should.have.property('id').and.match(/[0-9]+/);
        res.body.should.have.property('name').and.equal('blimp');
        res.body.should.have.property('created');
        res.body.should.have.property('localityId').and.equal(existingLocalityId);
        res.body.should.have.property('points').and.equal(300);

        createdTestingEntityId = res.body.id;
        done();
      });
  });

  /**
   * List user badges
   */
  it('can get badge list', function (done) {
    api.get('/Badges')
      .expect(200)
      .set('X-Token', reviewerToken)
      .expect('Content-Type', /json/)
      .end(function (err, res) {
        if (err) {
          return done(err);
        }

        assert(res.body.length > 0);

        var firstElem = res.body.pop();

        firstElem.should.have.property('id').and.match(/[0-9]+/);
        firstElem.should.have.property('name');
        firstElem.should.have.property('points');
        done();
      });
  });

  /**
   * Update badge from previous scenario
   */
  it('can update badge', function (done) {

    var payload = {
      id: createdTestingEntityId,
      localityId: existingLocalityId,
      imageId: existingImageId,
      name: 'sheriff',
      points: 302
    };

    api.put('/Badges/' + createdTestingEntityId)
      .set('X-Token', superAdminToken)
      .send(payload)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function (err, res) {
        if (err) {
          return done(err);
        }

        res.body.should.have.property('id').and.be.equal(createdTestingEntityId);
        res.body.should.have.property('name').and.be.equal('sheriff');
        res.body.should.have.property('points').and.be.equal(302);

        done();
      });
  });

  /**
   * Delete user badge - test also cleans up after itself
   */
  it('can delete badge', function (done) {

    api.delete('/Badges/' + createdTestingEntityId)
      .set('X-Token', superAdminToken)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function (err, res) {
        if (err) {
          return done(err);
        }

        api.get('/Badges/' + createdTestingEntityId)
          .expect(404)
        ;

        done();
      });
  });
});