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
sb(dependencies, { Bucket: 'my-s3-bucket' })
  .then(res => {
    // res contains the s3 key and bucket that the node_modules tgz was uploaded
    // to.
  });
```
