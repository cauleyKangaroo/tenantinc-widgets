const path = require('path');

// ---------------------------------------------------------------------------
// Widget entries
// To add widget #15, #16, etc: add one line here and create src/widget-name/.
// Nothing else in this file needs to change.
// ---------------------------------------------------------------------------
const widgetEntries = {
  'widget-hero':       './src/widget-hero/index.tsx',
  'widget-clock':      './src/widget-clock/index.tsx',
  'widget-space-list': './src/widget-space-list/index.tsx',
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
        {
          // CSS is bundled INTO the widget's .js and injected as a <style> tag
          // at runtime by style-loader. This keeps us at one CDN file per
          // widget (no separate .css to host) — required for the Duda loader.
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
        {
          // Images are base64-inlined into the bundle so the widget stays a
          // single self-contained .js file (required for the Duda AMD loader).
          test: /\.(png|jpe?g|gif|svg|webp)$/i,
          type: 'asset/inline',
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
