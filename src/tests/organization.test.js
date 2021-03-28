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

// According to database state
var existingGpsId = 2000;
var existingImageId = 3000;

var superAdminToken = 'e3VzZXJSb2xlOiAnc3VwZXJBZG1pbid9';
var adminToken = 'e3VzZXJSb2xlOiBhZG1pbn0=';
var reviewerToken = 'e3VzZXJSb2xlOiByZXZpZXdlcn0=';
var authenticatedToken = 'e3VzZXJSb2xlOiBhdXRoZW50aWNhdGVkfQ==';

var testingEntityId;

describe('INTEGRATION: Organization api', function () {

  var payload = {
    name: 'Residit',
    description: 'Residit-desc',
    mailSubject: 'subj',
    mailBody: 'mailbody',
    contactEmail: 'info@residit.com',
    contactPhone: '+42060445689',
    contactTwitter: '@residit',
    contactFacebook: 'residit-cz',
    contactUrl: 'http://www.residit.com',
    image: {
      id: existingImageId
    },
    organizationType: {
      id: 1
    },
    area: {
      id: existingGpsId
    },
    parentId: null
  };

  /**
   * create a new organization
   */
  it('can create organization', function (done) {

    api.post('/Organization')
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
        res.body.should.have.property('name').and.equal(payload.name);
        res.body.should.have.property('description').and.equal(payload.description);
        res.body.should.have.property('contactEmail').and.equal(payload.contactEmail);
        res.body.should.have.property('contactPhone').and.equal(payload.contactPhone);
        res.body.should.have.property('contactTwitter').and.equal(payload.contactTwitter);
        res.body.should.have.property('contactFacebook').and.equal(payload.contactFacebook);
        res.body.should.have.property('contactUrl').and.equal(payload.contactUrl);

        testingEntityId = res.body.id;
        done();
      });
  });

  /**
   * Can get organization list
   */
  it('can get organization list', function (done) {
    api.get('/Organization')
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
        firstElem.should.have.property('name');
        firstElem.should.have.property('description');
        done();
      });
  });

  /**
   * Update organization from previous scenario
   */
  it('can update organization', function (done) {

    var payload = {
      name: 'UpdatedOrgName',
      description: 'Residit-desc',
      mailSubject: 'subj',
      mailBody: 'mailbody',
      contactEmail: 'info@residit.com',
      contactPhone: '+42060445689',
      contactTwitter: '@residit',
      contactFacebook: 'residit-cz',
      contactUrl: 'http://www.residit.com',
      image: {
        id: existingImageId
      },
      organizationType: {
        id: 1
      },
      area: {
        id: existingGpsId
      },
      parentId: null
    };
    api.put('/organization/' + testingEntityId)
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
   * Can get organization detail
   */
  it('can get organization detail', function (done) {
    api.get('/Organization/' + testingEntityId)
      .set('X-Token', reviewerToken)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function (err, res) {
        if (err) {
          return done(err);
        }

        res.body.should.have.property('id').and.equal(testingEntityId);
        res.body.should.have.property('created');


        done();
      });
  });

  /**
   * can send email invitations for joining users
   */
  it('can send organization invitations', function (done) {
    var emails = [
      'trashouttest@mailinator.com'
    ];

    api.post('/organization/' + testingEntityId + '/sendInvitations')
      .set('X-Token', superAdminToken)
      .send({ emails: emails })
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function (err, res) {
        if (err) {
          return done(err);
        }

        res.body.should.have.property('success').and.equal(true);
        res.body.should.have.property('messagesSent');// .and.equal(emails.length);
        done();
      });
  });

  /**
   * Delete organization - test also cleans up after itself
   */
  it('can delete organization', function (done) {
    
    api.delete('/Organization/' + testingEntityId)
      .set('X-Token', superAdminToken)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function (err, res) {
        if (err) {
          return done(err);
        }

        api.get('/Organization/' + testingEntityId)
          .expect(404)
        ;

        done();
      });
  });
});