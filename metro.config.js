// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withUniwindConfig(config, {
    // Points to your global CSS file
    cssEntryFile: './global.css',
    // Generates TypeScript definitions for your Tailwind classes
    dtsFile: './uniwind-types.d.ts',
});