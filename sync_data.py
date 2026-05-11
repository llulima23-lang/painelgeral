import os
import time
import subprocess
from datetime import datetime

# Paths
EXCEL_PATH = r'C:\Users\sup.luciana\Meu Drive\MF\MF\Indicadores de Cobrança\PRODUÇÃO EQUIPES.xlsx'
EXTRACT_SCRIPT = r'c:\Users\sup.luciana\Desktop\AntiGravity\PAINEL GERAL\extract_data.py'

def get_mtime():
    try:
        return os.path.getmtime(EXCEL_PATH)
    except OSError:
        return None

def main():
    print(f"[{datetime.now()}] Monitoring Excel file for changes...")
    print(f"Path: {EXCEL_PATH}")
    
    last_mtime = get_mtime()
    
    while True:
        time.sleep(10) # Check every 10 seconds
        current_mtime = get_mtime()
        
        if current_mtime and (last_mtime is None or current_mtime > last_mtime):
            print(f"[{datetime.now()}] Change detected! Updating dashboard data...")
            try:
                # Run the extraction script
                subprocess.run(['python', EXTRACT_SCRIPT], check=True)
                print(f"[{datetime.now()}] Update successful.")
            except Exception as e:
                print(f"[{datetime.now()}] Error updating: {e}")
            
            last_mtime = current_mtime

if __name__ == "__main__":
    main()
