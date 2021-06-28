let path = require('path');
let webpack = require('webpack');
const TerserJSPlugin = require('terser-webpack-plugin')
module.exports = [
  {
    entry: {
      'sdk': './src/index.js',
      'custom': './src/custom.js'
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      library: 'SDK',
      libraryTarget: 'umd'
    }
  }, {
    entry: {
      'sdk.min': './src/index.js'
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      library: 'SDK',
      libraryTarget: 'umd'
    },
    optimization: {
      minimizer: [new TerserJSPlugin({
        cache: true, // 是否缓存
        parallel: true, // 是否并行打包
        sourceMap: true
      })],
    }
  }
]

