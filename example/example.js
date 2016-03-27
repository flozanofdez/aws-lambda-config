var conf = require('../index');

exports.configExample = function(event, context) {
  conf.getConfig(context, function(err, config) {
    if (err) {
      console.log(err);
      throw err;
    } else {
      console.log(JSON.stringify(config));
      context.succeed(config);
    }
  });
}

exports.optionalConfigExample = function(event, context) {
  conf.getOptionalConfig(context, function(err, config) {
    if (err) {
      console.log(err);
      throw err;
    } else {
      console.log(JSON.stringify(config));
      context.succeed(config);
    }
  });
}