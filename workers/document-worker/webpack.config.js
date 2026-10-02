const nodeExternals = require('webpack-node-externals');
const path = require('path');
const webpack = require('webpack');

module.exports = function (options) {
  return {
    ...options,
    externals: [
      nodeExternals({
        allowlist: [/^@nestlancer\//],
        additionalModuleDirs: [
          path.resolve(__dirname, '../node_modules'),
          path.resolve(__dirname, '../../node_modules'),
        ],
      }),
      ({ request }, callback) => {
        if (request.startsWith('@nestlancer/')) return callback();
        if (request.startsWith('.') || path.isAbsolute(request)) return callback();
        return callback(null, 'commonjs ' + request);
      },
    ],
    resolve: {
      ...options.resolve,
      alias: {
        ...options.resolve?.alias,
        'mock-aws-s3': false,
        'aws-sdk': false,
        nock: false,
      },
    },
    plugins: [
      ...options.plugins,
      new webpack.IgnorePlugin({ resourceRegExp: /s3_setup|nw-pre-gyp/ }),
    ],
  };
};
