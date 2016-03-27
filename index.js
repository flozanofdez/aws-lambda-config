var s3 = require('node-s3-encryption-client');

function getConfig(context, required, callback) {
  var configBucket = exports.getConfigBucket(context.invokedFunctionArn);
  return s3.getObject({
    Bucket: configBucket,
    Key: context.functionName + '.json'
  }, function(err, data) {
    if (err) {
      if ((err.code == 'NoSuchKey' || err.code == 'NoSuchBucket') && !required) {
        console.warn("Config requested but not found");
        callback(null, null);
      } else {
        callback(err, null);
      }
    } else {
      callback(null, JSON.parse(data.Body));
    }
  });
}

exports.getConfig = function(context, callback) {
  return getConfig(context, true, callback);
}

exports.getOptionalConfig = function(context, callback) {
  return getConfig(context, false, callback);
}

exports.getConfigBucket = function(arn) {
  var matches = arn.match(/arn:(.+):function/i);
  if (matches) {
    return matches[1].toLowerCase().replace(/:/g, '.') + '.config';
  } else {
    throw new Error("Invalid ARN: " + arn);
  }
}