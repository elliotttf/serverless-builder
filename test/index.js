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
      { 'native-module': '^0.11.3' },
      { Bucket: process.env.SB_S3_BUCKET_NAME }
    )
      .then((res) => {
        this.uploaded = res;
        s3.getObject(res, (getErr, data) => {
          if (getErr) {
            return test.done();
          }

          const bStream = new stream.PassThrough();
          bStream.pipe(zlib.Gunzip())
            .pipe(tar.extract(this.path))
            .on('finish', () => {
              fs.readdir(this.path, (fsErr, files) => {
                test.notEqual(files.indexOf('native-module'), -1);
                test.done();
              });
            })
            .on('error', () => test.done());
          return bStream.end(data.Body);
        });
      })
      .catch(() => test.done());
  },
};

