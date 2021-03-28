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

describe('INTEGRATION: PR content api', function () {

  var payload = {
    title: 'Na Moravě arktický mráz, v Čechách kolem nuly. Počasí rozpůlilo republiku',
    body: 'Jako v rozdílném teplotním pásu si museli v posledních dvou nocích připadat lidé v některých částech Moravy a Čech. Zatímco na východě České republiky teploty v pondělí časně ráno spadly až k minus 25 stupňům, na Mostecku bylo v tu dobu pár desetin stupně nad nulou.',
    url: 'http://www.example.com/article/1',
    language: 'cs_CZ',
    tags: 'weather, ecology',
    userId: 1,
    appIosUrl: "http://www.example.com/app/ios",
    appAndroidUrl: "http://www.example.com/app/android",
    appWindowsUrl: "http://www.example.com/app/windows",
    areaId: 11,
    prContentImage: [
      {
        main: true,
        imageId: 2
      }
    ],
    "prContentVideo": [
      {
        videoId: 1
      }
    ]
  };

  /**
   * create a new article
   */
  it('can create article', function (done) {

    api.post('/PRContent')
            .set('X-Token', superAdminToken)
            .send(payload)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function (err, res) {
              if (err) {
                return done(err);
              }

              res.body.should.have.property('id').and.match(/[0-9]+/);
              res.body.should.have.property('created');

              payload.id = res.body.id;
              done();
            });
  });

  /**
   * Update article from previous scenario
   */
  it('can update article', function (done) {

    payload.title = 'Censored';

    api.put('/PRContent/' + payload.id)
            .set('X-Token', superAdminToken)
            .send(payload)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function (err, res) {
              if (err) {
                return done(err);
              }

              done();
//              api.get('/PRContent/' + payload.id)
//                      .expect(200)
//                      .expect('Content-Type', /json/)
//                      .end(function (err, res) {
//                        if (err) {
//                          return done(err);
//                        }
//
//                        res.body.should.have.property('id').and.be.equal(payload.id);
//                        res.body.should.have.property('title').and.be.equal(payload.title);
//
//                        done();
//                      });
            });
  });

  /**
   * Can get article detail
   */
  it('can get article detail', function (done) {
    api.get('/PRContent/' + payload.id)
            .set('X-Token', reviewerToken)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function (err, res) {
              if (err) {
                return done(err);
              }

              res.body.should.have.property('id').and.equal(payload.id);
              res.body.should.have.property('created');

              done();
            });
  });

  /**
   * Delete article - test also cleans up after itself
   */
  it('can delete article', function (done) {

    api.delete('/PRContent/' + payload.id)
            .set('X-Token', superAdminToken)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function (err, res) {
              if (err) {
                return done(err);
              }

              api.get('/PRContent/' + payload.id)
                      .expect(404)
                      ;

              done();
            });
  });
});