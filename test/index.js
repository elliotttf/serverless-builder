'use strict';

const fs = require('fs');
const sb = require('../');
const stream = require('stream');
const tar = require('tar-fs');
const temp = require('temp');
const zlib = require('zlib');
const S3 = require('aws-sdk').S3;

const s3 = new S3();

module.exports = {
  setUp(cb) {
    temp.track();
    temp.mkdir('test', (err, path) => {
      this.path = path;
      cb();
    });
  },
  tearDown(cb) {
    s3.deleteObject(this.uploaded, cb);
  },
  success(test) {
    test.expect(1);
    sb(
      { once: '^1.0.0' },
      { Bucket: 'serverless-builder-repo' }
    )
      .then(res => {
        this.uploaded = res;
        s3.getObject(res, (err, data) => {
          if (err) {
            return test.done();
          }

          const bStream = new stream.PassThrough();
          bStream.pipe(zlib.Gunzip())
            .pipe(tar.extract(this.path))
            .on('finish', () => {
              fs.readdir(this.path, (err, files) => {
                test.notEqual(files.indexOf('once'), -1);
                test.done();
              });
            })
            .on('error', err => {
              console.log(err);
              test.done();
            });
          bStream.end(data.Body);
        });
      })
      .catch(err => {
        test.done();
      });
  }
};

