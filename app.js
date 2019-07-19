'use strict';
const recorder = require('node_request_curl');
module.exports = app => {
  const logger = app.getLogger('requestCurl');
  app.on('request', ctx => {
    recorder(record => {
      logger.info(`${record.time}`,`${record.request}`)

      logger.info(
        `${record.error || record.response}`
      )
    });
  });

};

