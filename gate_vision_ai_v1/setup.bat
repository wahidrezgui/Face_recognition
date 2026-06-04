@echo off
echo === GateVision AI v1 (CPU) — Setup ===

where python >nul 2>&1
if errorlevel 1 (
    echo ERROR: python not found. Install Python 3.12+ and add it to PATH.
    pause & exit /b 1
)

echo Creating virtual environment...
python -m venv .venv

echo Installing dependencies...
.venv\Scripts\python.exe -m pip install --upgrade pip
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe -m pip install -e .

echo.
echo Setup complete. Edit .env then run start.bat
pause
