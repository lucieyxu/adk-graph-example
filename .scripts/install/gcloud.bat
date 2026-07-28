@echo off
@setlocal
@setlocal enableextensions
@cd /d "%~dp0"

echo Checking for gcloud SDK

FOR /F "tokens=*" %%A IN ('where gcloud 2^>^&1') DO (
  SET where_results=%%A
)
SET "failure=Could not find file"

echo %where_results% | find "%failure%" > nul
if %errorlevel% equ 0 (
    echo Did not find gcloud -- installing! Please wait, this will take a couple minutes, depending on your network speed...
    powershell -Command "Invoke-WebRequest https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe -OutFile .\gcloud-installer.exe"
    call .\gcloud-installer.exe /S /singleuser /nostartmenu /nodesktop
    del .\gcloud-installer.exe /F /Q
    echo Installed gcloud successfully.
    echo Please restart your terminal.
) else (
    echo Found gcloud installation
)