@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================================
echo  SUBIENDO BÓVEDA DE PRESUPUESTO & TÚNEL MAGIA A GITHUB
echo ========================================================
echo.
git add .
git commit -m "feat: Boveda de Presupuesto Personal, Separacion Magia con K y Papel, y Fiscalidad VE con Tunel Supabase"
git push -u origin main
echo.
echo ========================================================
echo Presiona cualquier tecla para cerrar esta ventana...
pause >nul
