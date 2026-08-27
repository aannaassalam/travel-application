module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // Reanimated 4 runs its worklets through this plugin, and it has to stay
    // last — anything after it sees code the plugin has already rewritten.
    plugins: ["react-native-worklets/plugin"]
  };
};
