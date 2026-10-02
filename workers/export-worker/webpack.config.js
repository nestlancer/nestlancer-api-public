const nodeExternals = require('webpack-node-externals');
const path = require('path');

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
  };
};
