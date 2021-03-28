'use strict';

/*global describe*/
/*global it*/
/*eslint no-unused-vars: "off"*/

/**
 * how to run a single test:
 * npm test -- --grep "user"
 *
 */

var util = require('util');
var assert = require('assert');
var should = require('chai').should();
var supertest = require('supertest');
var UserPoints = require('../common/helpers/userPoints');

var url;
if (process.env.NODE_ENV === 'production') {
  url = 'https://api.trashout.ngo/v1';
} else {
  url = 'http://localhost:3000/api';
}

var api = supertest(url);

describe('UNIT - UserPoints model', function () {
  it('can count user points', function (done) {
    assert(312 === UserPoints.calculateUserPoints(10, 4, 8, 7));
    assert(8001 !== UserPoints.calculateUserPoints(1,2,3,7));
    done();
  });
});
