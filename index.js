const AWS = require('aws-sdk'),
      kms = new AWS.KMS();

var jsonConfig = {};

function getConfig(configVarName, required, callback) {
  configVarName = configVarName || 'config';
  if (jsonConfig[configVarName]) {
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

exports.getConfig = function(configVarName, callback) {
  return getConfig(configVarName, true, callback);
}

exports.getOptionalConfig = function(configVarName, callback) {
  return getConfig(configVarName, false, callback);
}