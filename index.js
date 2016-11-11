'use strict';

const npm = require('npm');
const os = require('os');
const tar = require('tar-fs');
const temp = require('temp');
const zlib = require('zlib');
const S3 = require('aws-sdk').S3;
const WriteStream = require('s3-streams').WriteStream;

const supportModules = [
  'node-gyp',
];

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
  process.env.HOME = os.tmpDir();
  const myS3Options = s3Options || {};
  let builderPath;
  let cachePath;
  let supportPath;
  new Promise((tResolve, tReject) => {
    temp.mkdir('cache', (err, path) => {
      if (err) {
        return tReject(err);
      }
      cachePath = path;
      return tResolve();
    });
  })
  .then(() => new Promise((tResolve, tReject) => {
    temp.mkdir('support', (err, path) => {
      if (err) {
        return tReject(err);
      }
      supportPath = path;
      return tResolve();
    });
  }))
  .then(() => new Promise((tResolve, tReject) => {
    temp.mkdir('builder', (err, path) => {
      if (err) {
        return tReject(err);
      }
      builderPath = path;
      return tResolve();
    });
  }))
  .then(() => {
    process.chdir(builderPath);
    return new Promise((lResolve, lReject) => {
      npm.load(
        { progress: false, loglevel: 'silent', cache: cachePath, prefix: supportPath },
        (loadErr) => {
          if (loadErr) {
            return lReject(loadErr);
          }
          return lResolve();
        }
      );
    });
  })
  .then(() => {
    npm.config.set('global', true);
    return Promise.all(supportModules.map(module => new Promise((iResolve, iReject) => {
      npm.install(module, (err) => {
        if (err) {
          return iReject(err);
        }
        return iResolve();
      });
    })))
      .then(() => {
        process.env.PATH = `${supportPath}/bin:${process.env.PATH}`;
        npm.config.set('global', false);
      });
  })
  .then(() => {
    npm.prefix = builderPath;
    const promises = Object.keys(packages).map(pkg => new Promise((iResolve, iReject) => {
      npm.install(`${pkg}@${packages[pkg]}`, (iErr, modules, idealTree) => {
        if (iErr) {
          return iReject(iErr);
        }

        return iResolve({ modules, idealTree });
      });
    }));

    return Promise.all(promises);
  })
  .then(() => {
    const Key = `${builderPath.split('/').pop()}.tgz`;
    tar.pack(`${builderPath}/node_modules`)
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
});

