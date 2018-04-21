const webpack = require('webpack');
const { resolve } = require('path');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

const sourceMap = false;

const config = {
  mode: 'production',
  entry: [ './src/utils/polyfills', './src/client' ],
  output: {
    path: resolve(process.cwd(), './dist/static'),
    filename: 'live-reload.client.js'
  },
  cache: false,
  devtool: sourceMap ? 'source-map' : 'none',
  module: {
    rules: [
      {
        test: /\.ts(x?)$/,
        exclude: /(node_modules|dist)/,
        use: [ 'awesome-typescript-loader' ]
      }
    ]
  },
  plugins: [
    new UglifyJSPlugin({ sourceMap }),
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': JSON.stringify('production')
      }
    })
  ],
  resolve: {
    extensions: [ '.ts', '.js' ],
    // mainFields: [ 'esnext', 'es2015', 'module', 'main' ]
  }
};

module.exports = config;