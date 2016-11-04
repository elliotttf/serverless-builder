'use strict';

const npm = require('npm');
const tar = require('tar-fs');
const temp = require('temp');
const zlib = require('zlib');
const S3 = require('aws-sdk').S3;
const WriteStream = require('s3-streams').WriteStream;

temp.track();

/**
 * Runs npm install then compresses and uploads the resulting node_modules
 * directory to s3.
 *
 * @param {Object} packages
 *  An object of npm packages to install, keyed by package name, with the
 *  package version or install path as the value.
 * @param {Object} s3ObjectOptions
 *   Options to pass to the S3 write stream.
 * @param {Object} s3Options
 *   Options to pass to the S3 instance.
 *
 * @return {Promise}
 *   Resolves when the install finishes, else rejects.
 */
module.exports = (packages, s3ObjectOptions, s3Options) => new Promise((resolve, reject) => {
  const myS3Options = s3Options || {};
  temp.mkdir('builder', (err, path) => {
    if (err) {
      return reject(err);
    }

    process.chdir(path);
    return npm.load(
      { progress: false, loglevel: 'silent', cache: `${path}/cache` },
      (loadErr) => {
        if (loadErr) {
          return reject(loadErr);
        }
        const promises = Object.keys(packages).map(pkg => new Promise((iResolve, iReject) => {
          npm.install(`${pkg}@${packages[pkg]}`, (iErr, modules, idealTree) => {
            if (iErr) {
              return iReject(iErr);
            }

            return iResolve({ modules, idealTree });
          });
        }));

        return Promise.all(promises)
          .then(() => {
            const Key = `${path.split('/').pop()}.tgz`;
            tar.pack(`${path}/node_modules`)
              .pipe(zlib.Gzip())
              .pipe(WriteStream(new S3(myS3Options), Object.assign({ Key }, s3ObjectOptions)))
              .on('finish', () => {
                resolve({
                  Bucket: s3ObjectOptions.Bucket,
                  Key,
                });
              })
              .on('error', deployErr => reject(deployErr));
          })
          .catch(deployErr => reject(deployErr));
      }
    );
  });
});

