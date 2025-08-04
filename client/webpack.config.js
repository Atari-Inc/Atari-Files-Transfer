const webpack = require('webpack');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

module.exports = () => {
  const envPath = path.resolve(__dirname, '.env');
  let fileEnv = {};
  
  // Try to read .env file, but don't fail if it doesn't exist
  try {
    if (fs.existsSync(envPath)) {
      fileEnv = dotenv.parse(fs.readFileSync(envPath));
    }
  } catch (error) {
    console.log('No .env file found, using default configuration');
  }

  const envKeys = Object.keys(fileEnv).reduce((prev, next) => {
    prev[`process.env.${next}`] = JSON.stringify(fileEnv[next]);
    return prev;
  }, {});

  return {
    entry: './src/index.js',
    output: {
      filename: 'bundle.js',
      path: path.resolve(__dirname, 'dist'),
      publicPath: '/',
    },
    mode: 'development',
    devServer: {
      static: {
        directory: path.join(__dirname, 'public'),
      },
      port: 3000,
      hot: true,
      historyApiFallback: true,
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,             // <-- JSX and JS files
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
          },
        },
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    resolve: {
      extensions: ['.js', '.jsx'],
    },
    plugins: [
      new webpack.DefinePlugin(envKeys),
    ],
  };
};
