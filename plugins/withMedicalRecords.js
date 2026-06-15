const { withAppBuildGradle, createRunOncePlugin } = require('@expo/config-plugins');
const pkg = require('../package.json');

const withHealthConnectClient = (config) => {
  return withAppBuildGradle(config, async (config) => {
    if (!config.modResults.contents.includes("androidx.health.connect:health-connect-client")) {
      config.modResults.contents = config.modResults.contents.replace(
        /dependencies\s?{/,
        `dependencies {\n    implementation("androidx.health.connect:health-connect-client:1.1.0-alpha07")`
      );
    }
    return config;
  });
};
module.exports = createRunOncePlugin(withHealthConnectClient, 'withMedicalRecords', pkg.version);
