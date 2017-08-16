const AWS = require('aws-sdk'),
      kms = new AWS.KMS();

var jsonConfig = {},
    jsonConfigTimestamps = {},
    cacheValidForMs = 300000;

function getConfig(configVarName, required, callback) {
  configVarName = configVarName || 'config';
  if (jsonConfig[configVarName] && !isConfigStale(configVarName)) {
    callback(null, jsonConfig[configVarName]);
  } else {
    var encrypted = process.env[configVarName];
    if (encrypted) {
      kms.decrypt({ CiphertextBlob: new Buffer(encrypted, 'base64') }, (err, data) => {
        if (err) {
          callback(err, null);
        } else {
          var decrypted = data.Plaintext.toString('ascii');
          try {
            jsonConfig[configVarName] = JSON.parse(decrypted);
            jsonConfigTimestamps[configVarName] = new Date();
            callback(null, jsonConfig[configVarName]);
          } catch (e) {
            callback(e, null);
          }
        }
      });
    } else if (required) {
      callback(new Error('Required config not found in environment variable [' + configVarName + ']'), null);
    } else {
      console.warn("Config requested but not found");
      jsonConfig[configVarName] = {};
      callback(null, jsonConfig[configVarName]);
    }
  }
}

function isConfigStale(configVarName) {
  if (jsonConfigTimestamps[configVarName]) {
    var d = jsonConfigTimestamps[configVarName];
    d = new Date(d.getTime() + cacheValidForMs);
    return d < (new Date());
  }
  return true;
}

exports.getConfig = function(configVarName, callback) {
  return getConfig(configVarName, true, callback);
}

exports.getOptionalConfig = function(configVarName, callback) {
  return getConfig(configVarName, false, callback);
}

// To be used mostly for unit testing.
exports.clearConfig = function(configVarName) {
  delete jsonConfig[configVarName];
  delete jsonConfigTimestamps[configVarName];
}

// Use this to set the expiration interval for cached config
// values. Default is 5 minutes. The cache prevents calling
// KMS upon every access of config.
exports.setCacheValidFor = function(millis) {
  cacheValidForMs = millis;
}