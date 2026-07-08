const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const localNodeModules = path.resolve(__dirname, 'node_modules');

// Force React and React-DOM to resolve from the local node_modules
// This prevents the root workspace React 18 from conflicting with local React 19
config.resolver.extraNodeModules = {
  'react': path.resolve(localNodeModules, 'react'),
  'react-dom': path.resolve(localNodeModules, 'react-dom'),
  'react-native': path.resolve(localNodeModules, 'react-native'),
};

module.exports = config;
