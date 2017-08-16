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
      lambdaConfig.clearConfig('config');
      delete process.env['config'];
    });

    it('should work when the config exists', function() {
      kms.put('123456789', '{"foo": "bar","baz":1}');
      process.env['config'] = '123456789';

      lambdaConfig.getConfig('config', function(err, config) {
        assert.equal(err, null);
        assert.equal(config.foo, "bar");
        assert.equal(config.baz, 1);
      });
    });

    it('should pull from cache on subsequent calls', function() {
      kms.put('123456789', '{"foo": "bar","baz":1}');
      process.env['config'] = '123456789';

      lambdaConfig.getConfig('config', function(err, config) {
        kms.cache = {};
        process.env['config'] = null;
        lambdaConfig.getConfig('config', function(err, config) {
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
      process.env['config'] = '123456789';

      lambdaConfig.getConfig('config', function(err, config) {
        assert.equal(err, 'SyntaxError: Unexpected token i in JSON at position 0');
        assert.equal(config, null);
      });
    });

    it('should fail if KMS fails', function() {
      var decrypt = kms.decrypt;
      kms.decrypt = function(params, callback) { callback(new Error('There was a problem'), null) };
      process.env['config'] = '123456789';

      lambdaConfig.getConfig('config', function(err, config) {
        assert.equal(err, 'Error: There was a problem');
        assert.equal(config, null);
        kms.decrypt = decrypt;
      });
    });

    it('should fail when the config is missing', function() {
      lambdaConfig.getConfig('config', function(err, config) {
        assert.equal(err, 'Error: Required config not found in environment variable [config]');
        assert.equal(config, null);
      });
    });
  });

  describe('#getOptionalConfig()', function() {
    afterEach(function() {
      kms.cache = {};
      lambdaConfig.clearConfig('config');
      delete process.env['config'];
    });

    it('should work when the file exists', function() {
      kms.put('123456789', '{"foo": "bar","baz":1}');
      process.env['config'] = '123456789';

      lambdaConfig.getOptionalConfig('config', function(err, config) {
        assert.equal(config.foo, "bar");
        assert.equal(config.baz, 1);
      });
    });

    it('should work when the file is missing', function() {
      lambdaConfig.getOptionalConfig('config', function(err, config) {
        assert.equal(err, null);
        assert.deepEqual(config, {});
      });
    });
  });

  describe('#setCacheValidFor()', function() {
    afterEach(function() {
      kms.cache = {};
      lambdaConfig.clearConfig('config');
      lambdaConfig.setCacheValidFor(300000);
      delete process.env['config'];
    });

    it('should not read from KMS on second attempt within the cache validity window', function() {
      kms.put('123456789', '{"foo": "bar","baz":1}');
      process.env['config'] = '123456789';

      lambdaConfig.getConfig('config', function(err, config) {
        assert.equal(config.foo, "bar");
        assert.equal(config.baz, 1);
        kms.cache = {};
        lambdaConfig.getConfig('config', function(err, config) {
          assert.equal(config.foo, "bar");
          assert.equal(config.baz, 1);
        });
      });
    });

    it('should read from KMS on second attempt outside the cache validity window', function() {
      kms.put('123456789', '{"foo": "bar","baz":1}');
      process.env['config'] = '123456789';
      lambdaConfig.setCacheValidFor(100);

      lambdaConfig.getConfig('config', function(err, config) {
        assert.equal(config.foo, "bar");
        assert.equal(config.baz, 1);
        kms.cache = {};
        var waitUntil = new Date(new Date().getTime() + 110);
        while(waitUntil > new Date()){}
        lambdaConfig.getConfig('config', function(err, config) {
          assert.equal(err, 'Error: decrypt error');
          assert.equal(config, null);
        });
      });
    });

  });
});
