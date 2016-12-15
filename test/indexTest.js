var assert = require('assert'),
    sinon = require('sinon'),
    AWS = require('aws-sdk');

describe('lambdaConfig', function() {
  var kms = {
    'cache': {},
    'decrypt': function(params, callback){
      if (this.cache[params.CiphertextBlob]) {
        callback(null, {Plaintext: this.cache[params.CiphertextBlob]});
      } else {
        callback(new Error('decrypt error'), null);
      }
    },
    'put': function(key, value) {
      this.cache[new Buffer(key, 'base64')] = value;
    }
  };
  var lambdaConfig;

  before(function() {
    sinon.stub(AWS, 'KMS').returns(kms);
    delete require.cache[require.resolve('../index')];
    lambdaConfig = require('../index');
  });

  after(function() {
    AWS.KMS.restore();
  });

  describe('#getConfig()', function() {
    afterEach(function() {
      kms.cache = {};
    });

    it('should work when the config exists', function() {
      kms.put('123456789', '{"foo": "bar","baz":1}');
      process.env['config01'] = '123456789';

      lambdaConfig.getConfig('config01', function(err, config) {
        assert.equal(err, null);
        assert.equal(config.foo, "bar");
        assert.equal(config.baz, 1);
      });
    });

    it('should pull from cache on subsequent calls', function() {
      kms.put('123456789', '{"foo": "bar","baz":1}');
      process.env['config05'] = '123456789';

      lambdaConfig.getConfig('config05', function(err, config) {
        kms.cache = {};
        process.env['config05'] = null;
        lambdaConfig.getConfig('config05', function(err, config) {
          assert.equal(err, null);
          assert.equal(config.foo, "bar");
          assert.equal(config.baz, 1);
        });
      });
    });

    it('should default to "config" as the name of the environment variable', function() {
      kms.put('123456789', '{"foo": "bar","baz":1}');
      process.env['config'] = '123456789';

      lambdaConfig.getConfig(undefined, function(err, config) {
        assert.equal(err, null);
        assert.equal(config.foo, "bar");
        assert.equal(config.baz, 1);
      });
    });

    it('should fail on invalid JSON config', function() {
      kms.put('123456789', 'invalid');
      process.env['config06'] = '123456789';

      lambdaConfig.getConfig('config06', function(err, config) {
        assert.equal(err, 'SyntaxError: Unexpected token i');
        assert.equal(config, null);
      });
    });

    it('should fail if KMS fails', function() {
      var decrypt = kms.decrypt;
      kms.decrypt = function(params, callback) { callback(new Error('There was a problem'), null) };
      process.env['config07'] = '123456789';

      lambdaConfig.getConfig('config07', function(err, config) {
        assert.equal(err, 'Error: There was a problem');
        assert.equal(config, null);
        kms.decrypt = decrypt;
      });
    });

    it('should fail when the config is missing', function() {
      lambdaConfig.getConfig('config02', function(err, config) {
        assert.equal(err, 'Error: Required config not found in environment variable [config02]');
        assert.equal(config, null);
      });
    });
  });

  describe('#getOptionalConfig()', function() {
    afterEach(function() {
      kms.cache = {};
    });

    it('should work when the file exists', function() {
      kms.put('123456789', '{"foo": "bar","baz":1}');
      process.env['config03'] = '123456789';

      lambdaConfig.getOptionalConfig('config03', function(err, config) {
        assert.equal(config.foo, "bar");
        assert.equal(config.baz, 1);
      });
    });

    it('should work when the file is missing', function() {
      lambdaConfig.getOptionalConfig('config04', function(err, config) {
        assert.equal(err, null);
        assert.deepEqual(config, {});
      });
    });
  });
});
