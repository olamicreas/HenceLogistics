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
  
  // 1. Downgrade swift-tools-version to 6.1
  packageContent = packageContent.replace(/swift-tools-version:\s*6\.2/g, 'swift-tools-version: 6.1');
  
  // 2. Fix invalid trailing commas in parameter lists
  packageContent = packageContent.replace(/,(\s*\))/g, '$1');
  
  // 3. Add NonescapableTypes experimental feature
  packageContent = packageContent.replace(
    /\.enableUpcomingFeature\(\"InferIsolatedConformances\"\),/g,
    '.enableUpcomingFeature("InferIsolatedConformances"),\n        .enableExperimentalFeature("NonescapableTypes"),'
  );
  
  fs.writeFileSync(packageFile, packageContent);
  console.log('Patched ExpoModulesJSI Package.swift for Swift 6.1 successfully.');
}

// 4. Fix 'weak let' -> 'nonisolated(unsafe) weak var' in all Swift source files
const glob = require('child_process').execSync('find node_modules/expo-modules-jsi/apple/Sources -name "*.swift"').toString().trim().split('\n');
for (const file of glob) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    
    // Fix Swift 6.1 mutability error by converting `weak let` to `weak var`.
    // Add `nonisolated(unsafe)` to prevent the compiler from throwing a Sendable error
    // because these properties are inside Sendable classes.
    if (content.includes('weak let ')) {
      content = content.replace(/weak let /g, 'nonisolated(unsafe) weak var ');
      changed = true;
    }
    
    // Fix invalid trailing commas in parameter lists (Swift 6.1 does not support this)
    if (content.match(/,(\s*\))/)) {
      content = content.replace(/,(\s*\))/g, '$1');
      changed = true;
    }
    
    if (changed) {
      fs.writeFileSync(file, content);
      console.log('Fixed syntax in ' + file);
    }
  }
}

// 5. Fix CppError library evolution visibility issue in JavaScriptError.swift
const jsErrorFile = 'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Runtime/Values/JavaScriptError.swift';
if (fs.existsSync(jsErrorFile)) {
  let content = fs.readFileSync(jsErrorFile, 'utf8');
  content = content.replace(/public var message:\s*String\s*\{/g, 'internal var message: String {');
  fs.writeFileSync(jsErrorFile, content);
  console.log('Fixed CppError visibility in JavaScriptError.swift');
}
