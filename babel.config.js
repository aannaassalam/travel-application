module.exports = {
  presets: ["module:@react-native/babel-preset"],
  plugins: [
    // "@/x" imports, matching tsconfig. Metro does not read tsconfig paths.
    ["module-resolver", { root: ["./"], alias: { "@": "./" } }],
    // Reanimated 4 rewrites worklets through this plugin, and it must stay
    // last — anything after it sees code the plugin has already transformed.
    "react-native-worklets/plugin"
  ]
};
