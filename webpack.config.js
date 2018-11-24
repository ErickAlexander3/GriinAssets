 var path = require('path');
 var webpack = require('webpack');

 module.exports = {
     entry: './s3upload.js',
     output: {
         path: path.resolve(__dirname, '../GriinAPI/thrives/static/thrives'),
         filename: 's3upload.bundle.js'
     },
     module: {
         rules: [
             {
                 test: /\.js$/,
                 use: [{
                    loader: 'babel-loader',
                    query: {
                     presets: ['env']
                    }
                 }],
                 
             }
         ]
     },
     stats: {
         colors: true
     },
     devtool: 'source-map'
 };