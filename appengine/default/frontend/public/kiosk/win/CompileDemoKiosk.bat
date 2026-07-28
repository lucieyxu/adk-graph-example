@echo off
setlocal

:: --- 1. SET VARIABLES ---
set "SCRIPT_NAME=DemoKiosk.ahk"
set "EXE_NAME=DemoKiosk.exe"
set "ICON_NAME=SuperCloud.ico"
set "ZIP_NAME=DemoKiosk-win.zip"

:: --- 2. FIND AHK COMPILER ---
:: Common paths for Ahk2Exe
if exist "C:\Program Files\AutoHotkey\Compiler\Ahk2Exe.exe" (
    set "COMPILER=C:\Program Files\AutoHotkey\Compiler\Ahk2Exe.exe"
) else if exist "C:\Program Files (x86)\AutoHotkey\Compiler\Ahk2Exe.exe" (
    set "COMPILER=C:\Program Files (x86)\AutoHotkey\Compiler\Ahk2Exe.exe"
) else (
    echo [ERROR] Could not find Ahk2Exe.exe. 
    echo Please make sure AutoHotKey is installed.
    pause
    exit /b
)

echo [INFO] Found Compiler at: "%COMPILER%"

:: --- 3. COMPILE .EXE ---
echo [INFO] Compiling %SCRIPT_NAME%...
"%COMPILER%" /in "%SCRIPT_NAME%" /out "%EXE_NAME%" /icon "%ICON_NAME%"

if exist "%EXE_NAME%" (
    echo [SUCCESS] Created %EXE_NAME%
    
    :: --- 4. ZIP, MOVE, AND CLEANUP ---
    echo [INFO] Zipping executable to parent directory...
    powershell Compress-Archive -Path "%EXE_NAME%" -DestinationPath "..\%ZIP_NAME%" -Force
    
    echo [INFO] Cleaning up original executable...
    del "%EXE_NAME%"
    
    echo.
    echo ----------------------------------------------------
    echo  BUILD COMPLETE!
    echo  Packaged created: ..\%ZIP_NAME%
    echo ----------------------------------------------------
) else (
    echo [ERROR] Compilation failed.
    pause
    exit /b
)

echo.
echo ----------------------------------------------------
echo  BUILD COMPLETE!
echo  Executable created: %EXE_NAME%
echo ----------------------------------------------------
pause