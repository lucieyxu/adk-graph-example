import Foundation
import AppKit

// 1. Define Paths
let fileManager = FileManager.default
// Properly get the current user's Desktop directory
guard let desktopURL = fileManager.urls(for: .desktopDirectory, in: .userDomainMask).first else { exit(1) }
let configURL = desktopURL.appendingPathComponent("DemoKioskConfig.txt")

var targetURL = "https://google.com" // Default fallback

// 2. Read Config (Native file reading, no "Finder" permissions needed)
do {
    let content = try String(contentsOf: configURL, encoding: .utf8)
    // Clean up newlines or spaces
    targetURL = content.trimmingCharacters(in: .whitespacesAndNewlines)
} catch {
    // If file fails, we just use the default. 
    // You could add an NSAlert here if you wanted a popup warning.
}

// 3. Kill Chrome (Polite "Kill" via shell)
let killTask = Process()
killTask.launchPath = "/usr/bin/pkill"
killTask.arguments = ["-x", "Google Chrome"]
killTask.launch()
killTask.waitUntilExit()

// Wait a moment for cleanup
sleep(1)

// 4. Launch Chrome in Kiosk Mode
let task = Process()
task.launchPath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
task.arguments = ["--kiosk", " --kiosk-printing", "--disable-pinch", "--overscroll-history-navigation=0", "--autoplay-policy=no-user-gesture-required", "--app=" + targetURL]

// Run it detached so closing this app doesn't close Chrome
task.launch()