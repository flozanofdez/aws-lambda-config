var assert = require('assert'),
    sinon = require('sinon'),
    AWS = require('aws-sdk'),
    context = require('aws-lambda-mock-context');

describe('lambdaConfig', function() {
  var s3 = {'getObject': function(){}};
  var lambdaConfig;
  const ctx = context({
    region: "us-east-1",
    account: "1234567890",
    functionName: "test"
  });

  before(function() {
    sinon.stub(AWS, 'S3').returns(s3);
    delete require.cache[require.resolve('../index')];
    lambdaConfig = require('../index');
  });

  after(function() {
    AWS.S3.restore();
  });

  describe('#getConfigBucket()', function() {
    it('should find the bucket based on the function\'s ARN', function() {
      assert.equal(lambdaConfig.getConfigBucket('arn:aws:lambda:us-east-1:1234567890:function:test'), 'aws.lambda.us-east-1.1234567890.config');
    });

    it('should be case-insensitive', function() {
      assert.equal(lambdaConfig.getConfigBucket('ARN:aws:lambda:us-east-1:1234567890:function:test'), 'aws.lambda.us-east-1.1234567890.config');
      assert.equal(lambdaConfig.getConfigBucket('arn:aws:lambda:us-east-1:1234567890:Function:test'), 'aws.lambda.us-east-1.1234567890.config');
      assert.equal(lambdaConfig.getConfigBucket('arn:aws:Lambda:us-east-1:1234567890:function:test'), 'aws.lambda.us-east-1.1234567890.config');
    });

    it('should throw an exception if the ARN is invalid', function() {
      assert.throws(function() { lambdaConfig.getConfigBucket('invalid') }, /Invalid ARN/);
      assert.throws(function() { lambdaConfig.getConfigBucket('arn:aws:lambda:us-east-1:1234567890') }, /Invalid ARN/);
      assert.throws(function() { lambdaConfig.getConfigBucket('aws:lambda:us-east-1:1234567890:function:test') }, /Invalid ARN/);
    });
  });

  describe('#getConfig()', function() {
    afterEach(function() {
      s3.getObject.restore();
    });

    it('should work when the file exists', function() {
      sinon
        .stub(s3, 'getObject')
        .yields(null, {"Body": "{\"foo\":\"bar\",\"baz\":1}"});

      lambdaConfig.getConfig(ctx, function(err, config) {
        assert.equal(err, null);
        assert.equal(config.foo, "bar");
        assert.equal(config.baz, 1);
      });
    });

    it('should fail when the file is missing', function() {
      sinon
        .stub(s3, 'getObject')
        .yields({'code': 'NoSuchKey', 'message': 'Key not found'}, null);

      lambdaConfig.getConfig(ctx, function(err, config) {
        assert.deepEqual(err, {'code': 'NoSuchKey', 'message': 'Key not found'});
        assert.equal(config, null);
      });
    });
  });

  describe('#getOptionalConfig()', function() {
    afterEach(function() {
      s3.getObject.restore();
    });

    it('should work when the file exists', function() {
      sinon
        .stub(s3, 'getObject')
        .yields(null, {"Body": "{\"foo\":\"bar\",\"baz\":1}"});

      lambdaConfig.getOptionalConfig(ctx, function(err, config) {
        assert.equal(config.foo, "bar");
        assert.equal(config.baz, 1);
      });
    });

    it('should work when the file is missing', function() {
      sinon
        .stub(s3, 'getObject')
        .yields({'code': 'NoSuchKey'}, null);

      lambdaConfig.getOptionalConfig(ctx, function(err, config) {
        assert.equal(err, null);
        assert.equal(config, null);
      });
    });
  });
});
