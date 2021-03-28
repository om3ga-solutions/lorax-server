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

describe('INTEGRATION: UserPoints role', function () {

  var createdTestingRoleId;

  /**
   * create a new role
   */
  it('can create role', function (done) {

    var payload = {
      code: 'magician',
      description: 'someone with really special powers'
    };

    api.post('/userRole')
      .set('X-Token', superAdminToken)
      .send(payload)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function (err, res) {
        if (err) {
          return done(err);
        }

        res.body.should.have.property('id').and.match(/[0-9]+/);
        res.body.should.have.property('code');

        createdTestingRoleId = res.body.id;
        done();
      });
  });


  /**
   * create a new role without permission
   */
  it('cannot create role without permission', function (done) {

    var payload = {
      code: 'magician',
      description: 'someone with really special powers'
    };

    api.post('/userRole')
      .send(payload)
      .expect(401)
      .expect('Content-Type', /json/)
      .end(function (err, res) {
        if (err) {
          return done(err);
        }

        res.body.should.not.have.property('id');
        done();
      });
  });

  /**
   * List user roles
   */
  it('can get list', function (done) {
    api.get('/userRole')
      .set('X-Token', superAdminToken)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function (err, res) {
        if (err) {
          return done(err);
        }

        assert(res.body.length > 0);

        var firstElem = res.body.pop();

        firstElem.should.have.property('id').and.match(/[0-9]+/);
        firstElem.should.have.property('code');
        firstElem.should.have.property('description');
        done();
      });
  });

  /**
   * Update role from previous scenario
   */
  it('can update role', function (done) {

    var payload = {
      id: createdTestingRoleId,
      code: 'baboon',
      description: 'dirty ape'
    };

    api.put('/userRole/' + createdTestingRoleId)
      .set('X-Token', superAdminToken)
      .send(payload)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function (err, res) {
        if (err) {
          return done(err);
        }

        res.body.should.have.property('id').and.be.equal(createdTestingRoleId);
        res.body.should.have.property('code').and.be.equal('baboon');
        res.body.should.have.property('description').and.be.equal('dirty ape');

        done();
      });
  });

  /**
   * Delete user role - test also cleans up after itself
   */
  it('can delete role', function (done) {

    api.delete('/userRole/' + createdTestingRoleId)
      .set('X-Token', superAdminToken)    
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function (err, res) {
        if (err) {
          return done(err);
        }

        api.get('/userRole/' + createdTestingRoleId)
          .expect(404)
        ;

        done();
      });
  });
});