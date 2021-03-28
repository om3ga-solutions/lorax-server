'use strict';

/*global describe*/
/*global it*/
/*eslint no-unused-vars: "off"*/

/**
 * how to run a single test:
 * npm test -- --grep "user"
 *
 */

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



var payload = {
  firstName: 'Maurice',
  lastName: 'Moss',
  email: Math.floor((Math.random() * 1000) + 1) + 'moss@renholm-industries.com',
  info: 'Node',
  //info: 'Node.js je softwarový systém navržený pro psaní vysoce škálovatelných internetových aplikací, především webových serverů.',
  birthdate: '1962-08-16',
  active: true,
  newsletter: false,
  imageKeys: null,
  uid: Math.floor((Math.random() * 1000) + 1) + 'JNgNzUH3XdNnmi0IlMbNzR3SMm93asd', // actual Firebase token for jim.raynor
  tokenFCM: '123456asdf',
  facebookUrl: 'https://www.facebook.com/pages/Nodejs/362746997258897?fref=ts&rf=132640106759624',
  twitterUrl: 'https://twitter.com/nodejs',
  googlePlusUrl: 'https://plus.google.com/collection/AlDOp',
  phoneNumber: "609123987",
  points: 46,
  reviewed: false,
  eventOrganizer: true,
  volunteerCleanup: true,
  userRoleId: 1,
  areaId: 160
};

var superAdminToken = 'e3VzZXJSb2xlOiAnc3VwZXJBZG1pbid9';
var adminToken = 'e3VzZXJSb2xlOiBhZG1pbn0=';
var reviewerToken = 'e3VzZXJSb2xlOiByZXZpZXdlcn0=';
var authenticatedToken = 'e3VzZXJSb2xlOiBhdXRoZW50aWNhdGVkfQ==';

describe('INTEGRATION: User', function () {

  it('can create a new user - usertest', function (done) {
    api.post('/user/')
      .set('X-Token', authenticatedToken)
      .send(payload)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function (err, res) {
        if (err) {
          return done(err);
        }

        res.body.should.have.property('email').and.contain('@');
        res.body.should.have.property('id').and.match(/[0-9]+/);

        payload.id = res.body.id;
        done();
      });
  });

  it('can create an anonymous user - usertest', function (done) {
    api.post('/user/')
      .set('X-Token', authenticatedToken)
      .send({
        uid: Math.floor((Math.random() * 1000) + 1) + 'anonymous' // actual Firebase token for jim.raynor
      })
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

  it('contains the right detail structure - usertest', function (done) {
    api.get('/user/' + payload.id)
      .set('X-Token', superAdminToken)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function (err, res) {
        if (err) {
          return done(err);
        }

        res.body.should.have.property('email').and.equal(payload.email);
        res.body.should.have.property('tokenFCM');
        res.body.should.have.property('id').and.match(/[0-9]+/);
        res.body.should.have.property('organizations');
        res.body.should.have.property('image');
        res.body.should.have.property('userRole');
        res.body.should.have.property('badges');
        done();
      });
  });
  
  it('can search by email address - usertest', function (done) {

    api.get('/user/?emails=' + payload.email)
      .set('X-Token', superAdminToken)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function (err, res) {
        if (err) {
          return done(err);
        }

        res.body.should.be.instanceof(Array);
        //res.body.length.greaterThan(true);

        var firstResult = res.body.pop();
        firstResult.should.have.property('email').and.contain(payload.email);
        done();
      });
  });

  /**
   * Delete user - test also cleans up after itself
   */
  it('can\'t delete user - (different user) - usertest', function (done) {

    api.delete('/user/' + payload.id)
      .set('X-Token', reviewerToken)
      .expect(401)
      .end(function (err, res) {
        if (err) {
          return done(err);
        }

        api.get('/user/' + payload.id)
          .expect(404)
        ;

        done();
      });
  });  
});

describe('INTEGRATION: Users collection result', function () {

  it('contains the right detail structure', function (done) {
    api.get('/user/?limit=10')
      .set('X-Token', superAdminToken)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function (err, res) {
        if (err) {
          return done(err);
        }

        res.body.should.be.instanceof(Array);

        var firstResult = res.body.pop();

        firstResult.should.have.property('email').and.contain('@');
        firstResult.should.have.property('organizations');
        firstResult.should.have.property('badges');
        done();
      });
  });

});

describe('Input test', function () {

  it('GET parameters', function (done) {
    var number = Math.floor((Math.random() * 100) + 1);
    var string = (number % 2) === 0 ? 'abc' : 'xyz';
    var boolean = number % 2;

    api.get('/user/test-get-parameters?number=' + number + '&string=' + string + '&boolean=' + boolean)
      .set('X-Token', superAdminToken)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function (err, res) {
        if (err) {
          return done(err);
        }

        (res.body.number == number).should.be.ok;
        res.body.string.should.equal(string);
        res.body.boolean.should.equal(boolean);

        done();
      });
  });

  it('POST parameters', function (done) {
    var number = Math.floor((Math.random() * 100) + 1);
    var string = (number % 2) === 0 ? 'abc' : 'xyz';
    var boolean = number % 2;
    var object = {
      number: number,
      string: string,
      boolean: boolean
    };

    var payload = {
      number: number,
      string: string,
      boolean: boolean,
      object: object
    };

    api.get('/user/test-post-parameters')
      .set('X-Token', superAdminToken)
      .send(payload)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function (err, res) {
        if (err) {
          return done(err);
        }

        (res.body.number == number).should.be.ok;
        res.body.string.should.equal(string);
        res.body.boolean.should.equal(boolean);
        (res.body.object.number == number).should.be.ok;
        res.body.object.string.should.equal(string);
        res.body.object.boolean.should.equal(boolean);

        done();
      });
  });
  
});
