const { withPodfile } = require('@expo/config-plugins');

module.exports = function withDisableSandboxing(config) {
  return withPodfile(config, (config) => {
    let contents = config.modResults.contents;
    if (!contents.includes('ENABLE_USER_SCRIPT_SANDBOXING')) {
      contents = contents.replace(
        /post_install do \|installer\|/,
        `post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'
    end
  end`
      );
      config.modResults.contents = contents;
    }
    return config;
  });
};
