# aws-lambda-config
A module to provide config/environment variables to AWS Lambda functions

## Motivation
AWS Lambda doesn't support environment variables, which makes it difficult to share the same code across
multiple instances of the same function (for example: prod and test instances, or using the same function
across multiple accounts, or sharing the function via open source). For example, if the Lambda function
pushes files to a S3 bucket, you might not want multiple instances of the same function pushing to the
same bucket. So the S3 bucket will need to be configured for each instance of the function. This is
currently solved by possibly including the config file in the .zip file used by the Lambda function - but
then you need to upload (and manage) multiple .zip files for the multiple functions. If you make a change to
the code, then you need to re-upload those one-off .zip files (each with different config) all over again.
Clearly, it would be nice to be able to deploy a Lambda function with config specific to its instance. Then
you could reference a common .zip file, and if the code is updated you simply point the function at the new
version of the .zip file.

This module enables that functionality by making one assumption: you must store the config file (named the
same as your Lambda function, with a '.json' extension) in a S3 bucket with the following format: 
aws.lambda.{your-region}.{your-account-id}.config . Unfortunately Lambda functions don't expose much
metadata, so we need to be able to find the config file using simply the ARN of the function (where is where
the bucket naming comes from) and the function name (used for the config filename).


## Usage
1. Create a config bucket in your account in this format: aws.lambda.{your-region}.{your-account-id}.config
2. Upload a JSON file containing your config (see below for encryption options)
3. From your Lambda function, call either getConfig (a config file is required) or getOptionalConfig (no error
   if the config file is missing) and get the config back as a JSON object.

```
var conf = require('aws-lambda-config');

exports.handler = function(event, context) {
  conf.getConfig(context, function(err, config) {
    if (!err) {
      console.log(JSON.stringify(config));
    }
  });
}
```


## Encrypting the config file
This library uses [node-s3-encryption-client](https://github.com/gilt/node-s3-encryption-client), so it
supports client-side encryption of the config file. To encrypt a config file and upload to S3 please see
[the command line script](https://github.com/gilt/node-s3-encryption-client/blob/master/bin/s3-put-encrypted)
there.

If you only need to encrypt the config file on the server side, you simply manage that in S3 and this
client isn't affected.


## Design Decisions

### Promises
Yes, Promises are much preferred over callbacks. But I decided to implement this using callbacks because it
allows people to use it either with callbacks or Promises (by promisifying it using something like
[Bluebird](http://bluebirdjs.com/), which is what I personall will do when using this in other projects). Plus,
callbacks simplify the code and tests here.


## License
Copyright 2016 Gilt Groupe, Inc.

Licensed under the Apache License, Version 2.0: http://www.apache.org/licenses/LICENSE-2.0