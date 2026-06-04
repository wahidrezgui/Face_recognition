@echo off
echo === GateVision AI v1 (CPU) — Starting ===

if not exist ".venv\Scripts\python.exe" (
    echo ERROR: .venv not found. Run setup.bat first.
    pause & exit /b 1
)

REM Override these on the command line or set them here:
REM   set GV_GATE_ID=gate-entrance
REM   set GV_CAMERA_SOURCE=0
REM   set GV_DIRECTION=entry
REM   set GV_PORT=8001

.venv\Scripts\python.exe -m gate_vision_ai
