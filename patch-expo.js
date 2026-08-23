const fs = require('fs');
const file = 'node_modules/expo-modules-jsi/apple/scripts/build-xcframework.sh';
if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');
  
  // 1. Inject sandboxing flag
  content = content.replace(/xcodebuild \\/g, 'xcodebuild ENABLE_USER_SCRIPT_SANDBOXING=NO \\');
  
  // 2. Remove quiet flag to see output if it's there
  content = content.replace(/-quiet \\/g, ' \\');
  
  // 3. Capture output
  const target = 'SWIFT_COMPILATION_MODE=wholemodule \\\n  )';
  const replacement = 'SWIFT_COMPILATION_MODE=wholemodule \\\n  ) > /tmp/expo_build.log 2>&1';
  
  content = content.replace(target, replacement);
  
  fs.writeFileSync(file, content);
  console.log('Patched ExpoModulesJSI build script successfully.');
}

const packageFile = 'node_modules/expo-modules-jsi/apple/Package.swift';
if (fs.existsSync(packageFile)) {
  let packageContent = fs.readFileSync(packageFile, 'utf8');
  packageContent = packageContent.replace(/swift-tools-version:\s*6\.2/g, 'swift-tools-version: 6.0');
  fs.writeFileSync(packageFile, packageContent);
  console.log('Patched ExpoModulesJSI Package.swift successfully.');
}
