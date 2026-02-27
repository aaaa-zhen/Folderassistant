module.exports = {
  entry: './src/main/main.ts',
  externals: {
    'node-pty': 'commonjs node-pty',
  },
  node: {
    __dirname: false,
    __filename: false,
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: { transpileOnly: true },
        },
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.ts', '.json', '.node'],
  },
};
