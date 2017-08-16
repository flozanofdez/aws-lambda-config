# aws-lambda-config
A module to provide config (JSON document) to AWS Lambda functions

## Motivation
AWS Lambda environment variable values do not allow commas (what?) and thus cannot support a robust JSON
document for function config; they also don't support native JSON documents (only support a string that
could be parsed into JSON). But JSON-ish support can be achieved by encrypting the value (which might be
desired anyway), so the commas are not included in the "value". This small library wraps the concerns above
(decryption + JSON parsing) into a single call that allows the client function to simply deal with a JSON
config document.

If your Lambda function config a) does not need to be encrypted and b) fits neatly into key-value pairs
(i.e. not a nested document), it is recommended to avoid this module and simply use Lambda Environment
Variables directly. There is some overhead in both processing time and cost for using the KMS key - so if
your function does not need it, don't add that overhead.


## Usage
1. Include a valid JSON document in an environment variable for your Lambda function, and encrypt it using
   a KMS key. Alternatively, use the [command-line tool](bin/put-config) to upload new or updated config to
   an existing function.
2. From your Lambda function, call either getConfig (a config file is required) or getOptionalConfig (no error
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


### Cache invalidation
For speed/efficiency, this library automatically stores previously-loaded config into a local (in memory)
variable for a default of 5 minutes. Obviously, this is dependent on whether or not Lambda still has the
function loaded into memory - but if your function is executed frequently enough to avoid cold starts,
the config will be cached.

You can optionally set the maximum amount of time that config values remain in the in-memory cache by calling
`conf.setCacheValidFor()` with the number of milliseconds that you would like the values to remain in memory
without being reloaded...actually I'm realizing that this entire commit isn't necessary because the function
will naturally be kicked out of memory as soon as the ENV variables are changed. So there will never be any
reason to replace out the in-memory values.


## Design Decisions

### Promises
Yes, Promises are much preferred over callbacks. But I decided to implement this using callbacks because it
allows people to use it either with callbacks or Promises (by promisifying it using something like
[Bluebird](http://bluebirdjs.com/), which is what I personall will do when using this in other projects). Plus,
callbacks simplify the code and tests here.


### Config JSON
Recommended best practice is to keep the config JSON checked in to a code repository with the Lambda function
(or in a central config repo). Because of this, the [included command line tool](bin/put-config) expects the
config JSON to be loaded from a file in your file system. To encourage this, there is not a config parameter
that accepts the JSON string directly.


## License
Copyright 2016 Gilt Groupe, Inc.

Licensed under the Apache License, Version 2.0: http://www.apache.org/licenses/LICENSE-2.0