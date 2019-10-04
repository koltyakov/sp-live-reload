//@ts-check

const webpack = require('webpack');
const { resolve } = require('path');
const TerserPlugin = require('terser-webpack-plugin');

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
  optimization: {
    minimizer: [
      new TerserPlugin({
        cache: true,
        parallel: true,
        sourceMap: false,
        extractComments: 'all'
      })
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': JSON.stringify('production')
      }
    })
  ],
  resolve: {
    extensions: [ '.ts', '.js' ]
  }
};

module.exports = config;