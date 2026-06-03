const path = require('path');

// ---------------------------------------------------------------------------
// Widget entries
// To add widget #15, #16, etc: add one line here and create src/widget-name/.
// Nothing else in this file needs to change.
// ---------------------------------------------------------------------------
const widgetEntries = {
  'widget-hero':  './src/widget-hero/index.tsx',
  'widget-clock': './src/widget-clock/index.tsx',
};

module.exports = (_env, argv) => {
  const isDev = argv.mode === 'development';

  return {
    entry: widgetEntries,

    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      // AMD is required: Duda lazy-loads bundles via require.js.
      // Do NOT change this to 'umd' or add a `library` name — that breaks
      // Duda's loader. Non-AMD route requires options.amd=false in Duda and
      // a global name, which we are not using.
      libraryTarget: 'amd',
      clean: true,
    },

    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
      alias: {
        '@shared': path.resolve(__dirname, 'src/shared'),
      },
    },

    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },

    // Source maps in dev only
    devtool: isDev ? 'inline-source-map' : false,

    devServer: isDev
      ? {
          // Serve the dev/ harness HTML from the root
          static: {
            directory: path.join(__dirname, 'dev'),
          },
          port: 3000,
          // AMD format is incompatible with webpack HMR; use plain live-reload.
          hot: false,
          liveReload: true,
          // Write bundles to dist/ so require.js can load them via the
          // dev server at /dist/widget-hero.js etc.
          devMiddleware: {
            writeToDisk: true,
            publicPath: '/dist/',
          },
        }
      : undefined,
  };
};
