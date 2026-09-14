@echo off
rem MINO launcher: starts the local bridge and opens the HUD as an app-style window.
rem Mic access requires a secure origin, so the HUD is always opened on localhost.
title MINO Bridge
cd /d "%~dp0"

rem If the bridge is already running, don't start a second one.
netstat -ano | findstr ":5001 .*LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo MINO bridge already running on port 5001.
) else (
    echo Starting MINO bridge...
    start "MINO Bridge" /min python dev_server.py
    timeout /t 2 /nobreak >nul
)

rem Open the HUD in app mode (Edge preferred, Chrome fallback).
set "HUD=http://localhost:5001"
where msedge >nul 2>&1
if %errorlevel%==0 (
    start "" msedge --app=%HUD%
) else if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app=%HUD%
) else if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app=%HUD%
) else (
    start "" %HUD%
)
