const webpack = require('webpack');
const { resolve } = require('path');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

const config = {
  entry: [ './src/utils/polyfills', './src/client' ],
  output: {
    path: resolve(process.cwd(), './dist/static'),
    filename: 'live-reload.client.js'
  },
  mode: 'production',
  cache: false,
  devtool: 'source-map',
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
    new UglifyJSPlugin({ sourceMap: true }),
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': JSON.stringify('production')
      }
    })
  ],
  resolve: {
    extensions: [ '.ts', '.tsx', '.js', '.jsx' ],
    mainFields: [ 'esnext', 'es2015', 'module', 'main' ]
  },
  externals : {
    'adal-angular': 'adal-angular'
  }
};

module.exports = config;