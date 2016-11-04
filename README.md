# Serverless Builder

[![Build Status](https://travis-ci.org/elliotttf/serverless-builder.svg?branch=master)](https://travis-ci.org/elliotttf/serverless-builder)
[![Coverage Status](https://coveralls.io/repos/github/elliotttf/serverless-builder/badge.svg?branch=master)](https://coveralls.io/github/elliotttf/serverless-builder?branch=master)

This module helps to build dependencies for serverless environments that cannot
build at install time.

This is achieved by passing in an object of dependencies (formatted the same as package.json)
which is then installed using `npm install`. The resulting `node_modules` directory is
compressed and uploaded to s3.

## Usage

```javascript
const sb = require('serverless-builder');
const dependencies = require('./package.json').dependencies;
sb(dependencies, { Bucket: 'my-s3-bucket' }, { Region: 'us-east-1' })
  .then(res => {
    // res contains the s3 key and bucket that the node_modules tgz was uploaded
    // to.
  });
```

## API

* `serverless-builder` - Accepts a list of packages and s3 configuration options
  and returns a promise that resolves with the location in s3 that the package
  was saved to.
 * `packages` - An object of npm packages to install, keyed by package name,
   with the package version or install path as the value. This object takes the
   same format as the `dependencies` object in `package.json` files.
 * `s3ObjectOptions` - Options to pass to the S3 write stream. This object
   _must_ contain at least `Bucket` and may contain any other valid S3 putObject
   options.
 * `s3Options` - (optional) Options to pass to the S3 instance. This object may
   contain any options used when instantiating a S3 object.

