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

describe('INTEGRATION: Organization role', function () {

  var createdTestingRoleId;

  /**
   * create a new role
   */
  it('can create role', function (done) {

    var payload = {
      name: 'maintenance guy'
    };

    api.post('/organizationRole')
      .set('X-Token', superAdminToken)
      .send(payload)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function (err, res) {
        if (err) {
          return done(err);
        }

        res.body.should.have.property('id').and.match(/[0-9]+/);
        res.body.should.have.property('name').and.equal('maintenance guy');

        createdTestingRoleId = res.body.id;
        done();
      });
  });

  /**
   * List organization roles
   */
  it('can get list', function (done) {
    api.get('/organizationRole')
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
        done();
      });
  });

  /**
   * Update role from previous scenario
   * test that name has been updated
   */
  it('can update role', function (done) {

    var payload = {
      id: createdTestingRoleId,
      name: 'overseer'
    };

    api.put('/organizationRole/' + createdTestingRoleId)
      .set('X-Token', superAdminToken)
      .send(payload)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function (err, res) {
        if (err) {
          return done(err);
        }

        done();
      });
  });

  /**
   * Delete organization role - test also cleans up after itself
   */
  it('can delete role', function (done) {

    api.delete('/organizationRole/' + createdTestingRoleId)
      .set('X-Token', superAdminToken)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function (err, res) {
        if (err) {
          return done(err);
        }

        done();
      });
  });
});