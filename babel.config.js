module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // Reanimated v4 split its Babel transform into react-native-worklets — the old
  // 'react-native-reanimated/plugin' name no longer applies. Must stay last.
  plugins: ['react-native-worklets/plugin'],
};
