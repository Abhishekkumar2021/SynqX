@echo off
rem Wrapper for SynqX PowerShell script to ensure smooth execution from CMD
rem Bypasses execution policy to allow running the script without global config changes

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0synqx.ps1" %*
