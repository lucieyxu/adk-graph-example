#NoEnv
SendMode Input
SetWorkingDir %A_ScriptDir%

; --- CONFIGURATION ---
; A_Desktop is the built-in variable for the current user's Desktop path
ConfigFile := A_Desktop . "\DemoKioskConfig.ini"

; Check if the config file actually exists
if !FileExist(ConfigFile)
{
    MsgBox, 16, Error, Configuration file not found at:`n%ConfigFile%`n`nPlease ensure "DemoKioskConfig.ini" is saved on your Desktop.
    ExitApp
}

; --- LOGIC: Read URL from Config ---
; Syntax: IniRead, OutputVar, Filename, Section, Key, DefaultValue
IniRead, TargetURL, %ConfigFile%, Settings, URL, https://google.com

; --- LAUNCH CHROME ---
Run, "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --kiosk-printing --disable-pinch --overscroll-history-navigation=0 --autoplay-policy=no-user-gesture-required "%TargetURL%" 

; --- BLOCK KEYS ---
!F4::return      ; Block Alt+F4
^f4::return      ; Block Ctrl+F4
^w::return       ; Block Ctrl+W (Close Tab)
^q::return       ; Block Ctrl+Q (Close Browser - typically on Mac, but good safety)
^+Esc::Return    ; Block Ctrl+Shift+Esc (Task Manager shortcut)
!Tab::Return     ; Block Alt+Tab
LWin::Return     ; Block Left Windows Key
RWin::Return     ; Block Right Windows Key

; --- EXIT SHORTCUT (Ctrl + Shift + Q) ---
^+q::
    Run, taskkill /F /IM chrome.exe /T,, Hide
    ExitApp
return