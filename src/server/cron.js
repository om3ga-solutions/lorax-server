var cron = require('cron');
var https = require('https');
var http = require('http');

//var url = 'http://localhost:3000/api/cron/daily';
var url = 'https://api.trashout.ngo/v1/cron/daily';

var cronTime = '0 15 * * *';

var job = new cron.CronJob({
  cronTime: cronTime,
  onTick: function () {
    https.get(url, function (res) {
      console.log('cron ok - ' + (new Date()).toUTCString());
    });
  },
  start: false,
  timeZone: 'Europe/Prague'
});

job.start();
