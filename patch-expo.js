const fs = require('fs');
const file = 'node_modules/expo-modules-jsi/apple/scripts/build-xcframework.sh';
if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');
  
  // 1. Inject sandboxing flag
  content = content.replace(/xcodebuild \\/g, 'xcodebuild ENABLE_USER_SCRIPT_SANDBOXING=NO \\');
  
  fs.writeFileSync(file, content);
  console.log('Patched ExpoModulesJSI build script successfully.');
}
