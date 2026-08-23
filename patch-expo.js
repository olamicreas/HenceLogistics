const fs = require('fs');

// Fix Swift 8 ambiguous type error in JavaScriptCodable+Date.swift
const dateFile = 'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Coding/JavaScriptCodable+Date.swift';
if (fs.existsSync(dateFile)) {
  let content = fs.readFileSync(dateFile, 'utf8');
  if (content.includes('abs(milliseconds) <= maxJavaScriptDateMilliseconds')) {
    content = content.replace(
      'abs(milliseconds) <= maxJavaScriptDateMilliseconds',
      'milliseconds >= -maxJavaScriptDateMilliseconds && milliseconds <= maxJavaScriptDateMilliseconds'
    );
    fs.writeFileSync(dateFile, content);
    console.log('Patched JavaScriptCodable+Date.swift successfully.');
  }
}

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

