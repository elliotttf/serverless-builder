'use strict';

const npm = require('npm');
const os = require('os');
const process = require('process');
const tar = require('tar-fs');
const temp = require('temp');
const zlib = require('zlib');
const S3 = require('aws-sdk').S3;
const S3S = require('s3-streams');

temp.track();

/**
 * Runs npm install then compresses and uploads the resulting node_modules
 * directory to s3.
 *
 * @param {Object} packages
 *  An object of npm packages to install, keyed by package name, with the
 *  package version or install path as the value.
 * @param {Object} s3Options
 *   Options to pass to s3-streams.
 *
 * @return {Promise}
 *   Resolves when the install finishes, else rejects.
 */
module.exports = (packages, s3Options) => new Promise((resolve, reject) => {
  temp.mkdir('builder', (err, path) => {
    if (err) {
      return reject(err);
    }

    process.chdir(path);
    npm.load({ progress: false, loglevel: 'silent', cache: `${path}/cache` }, (err, config) => {
      if (err) {
        return reject(err);
      }
      const promises = Object.keys(packages).map(pkg => new Promise((iResolve, iReject) => {
        npm.install(`${pkg}@${packages[pkg]}`, (err, modules, idealTree) => {
          if (err) {
            return iReject(err);
          }

          iResolve({modules, idealTree});
        })
      }));

      Promise.all(promises)
        .then(results => {
          const Key = `${path.split('/').pop()}.tgz`;
          tar.pack(`${path}/node_modules`)
            .pipe(zlib.Gzip())
            .pipe(S3S.WriteStream(new S3(), Object.assign({ Key }, s3Options)))
            .on('finish', () => {
              resolve({
                Bucket: s3Options.Bucket,
                Key,
              });
            })
            .on('error', err => reject(err));
        })
        .catch(err => reject(err));
    });
  });
});

