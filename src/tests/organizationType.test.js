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

describe('INTEGRATION: Organization type', function () {

  var payload = {
    name: 'ngo'
  };

  /**
   * create a new organization type
   */
  it('can create organization type', function (done) {
    api.post('/organizationType')
      .set('X-Token', superAdminToken)
      .send(payload)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function (err, res) {
        if (err) {
          return done(err);
        }

        res.body.should.have.property('id').and.match(/[0-9]+/);
        res.body.should.have.property('name').and.equal(payload.name);

        payload.id = res.body.id;
        done();
      });
  });

  /**
   * List organization types
   */
  it('can get organization type list', function (done) {
    api.get('/organizationType')
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
   * Update organization type from previous scenario
   * test that name has been updated
   */
  it('can update organization type', function (done) {

    payload.name = 'corporation';

    api.put('/OrganizationType/' + payload.id)
      .set('X-Token', superAdminToken)
      .send(payload)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function (err, res) {
        if (err) {
          return done(err);
        }

        /*api.get('/OrganizationType/' + payload.id)
          .expect(200)
          .end(function (err, res) {
            res.body.should.have.property('id').and.be.equal(payload.id);
            res.body.should.have.property('name').and.be.equal(payload.name);
          })
        ;*/

        done();
      });
  });

  /**
   * Delete organization type - test also cleans up after itself
   */
  it('can delete organization type', function (done) {

    api.delete('/OrganizationType/' + payload.id)
      .set('X-Token', superAdminToken)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function (err, res) {
        if (err) {
          return done(err);
        }

        api.get('/OrganizationType/' + payload.id)
          .expect(404)
        ;

        done();
      });
  });
});