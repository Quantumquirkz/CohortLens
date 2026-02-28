const { getDefaultConfig } = require('@react-native/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add web platform support
config.resolver.platforms = ['web', 'ios', 'android'];

// Add react-native-web alias
config.resolver.alias = {
  'react-native$': 'react-native-web',
};

module.exports = config;
