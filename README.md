# Serverless Builder

This module helps to build dependencies for serverless environments that cannot
build at install time.

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
