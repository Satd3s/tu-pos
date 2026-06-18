# =============================================================================
# LANZADOR NATIVO (PyQt6)
# =============================================================================
import sys
import os
from PyQt6.QtWidgets import QApplication
from PyQt6.QtGui import QIcon

# Asegurar que podemos importar módulos del proyecto
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import init_database
from gui.login_window import LoginWindow
from gui.main_window import MainWindow

def main():
    # Inicializar Base de Datos
    init_database()
    
    # Crear aplicación Qt
    app = QApplication(sys.argv)
    app.setStyle("Fusion") # Estilo base moderno
    
    # Icono de la aplicación (usar emoji temporal si no hay .ico)
    # app.setWindowIcon(QIcon("icon.ico")) 
    
    # Mostrar Login
    login = LoginWindow()
    
    # Variable para almacenar la ventana principal y evitar que el GC la elimine
    main_window = None
    
    def on_login_success(user_data):
        nonlocal main_window
        main_window = MainWindow(user_data)
        main_window.show()
    
    login.login_successful.connect(on_login_success)
    login.show()
    
    sys.exit(app.exec())

if __name__ == "__main__":
    main()
