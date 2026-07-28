# 1. Set your desired app name and icon file
APP_NAME="DemoKiosk"
ICON_FILE="SuperCloud.icns"
ZIP_NAME="DemoKiosk-osx.zip"

# 2. Compile the swift file into an executable
swiftc main.swift -o "$APP_NAME"

# 3. Create the standard macOS app directory structure
mkdir -p "$APP_NAME.app/Contents/MacOS"
mkdir -p "$APP_NAME.app/Contents/Resources"

# 4. Move your compiled executable into the MacOS folder
mv "$APP_NAME" "$APP_NAME.app/Contents/MacOS/"

# 5. Copy your icon into the Resources folder
cp "$ICON_FILE" "$APP_NAME.app/Contents/Resources/"

# 6. Create the Info.plist, hide the dock icon, and declare the custom icon
cat > "$APP_NAME.app/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>$APP_NAME</string>
    <key>CFBundleIconFile</key>
    <string>SuperCloud</string>
    <key>LSUIElement</key>
    <true/>
</dict>
</plist>
EOF

touch "$APP_NAME.app"

zip -rq "../$ZIP_NAME" "$APP_NAME.app"

rm -rf "$APP_NAME.app"

echo "Build and packaging complete!"