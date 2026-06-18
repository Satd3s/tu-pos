# =============================================================================
# LANZADOR NATIVO DE WINDOWS (PyQt6 + QWebEngineView - Híbrido Premium Autónomo)
# =============================================================================
import sys
import os
import threading
import socket
import eel
from PyQt6.QtWidgets import QApplication, QMainWindow, QVBoxLayout, QWidget
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtCore import QUrl
from PyQt6.QtGui import QCloseEvent

# Asegurar path para importaciones
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main_backend import *
from gui.login_window import LoginWindow
from gui.styles import set_theme

# Variable global para usuario logueado
current_user_data = None

# Eliminar funciones duplicadas que vienen de main_backend para sobreescribirlas
if 'get_logged_user_bypass' in eel._exposed_functions:
    del eel._exposed_functions['get_logged_user_bypass']
if 'close_app' in eel._exposed_functions:
    del eel._exposed_functions['close_app']

@eel.expose
def get_logged_user_bypass():
    """Retorna el usuario ya logueado desde la ventana nativa"""
    return {'success': True, 'data': current_user_data}

@eel.expose
def close_app():
    """Cerrar la aplicacion de forma segura para PyQt6 nativo"""
    print("\n" + "="*50)
    print("Cerrando aplicacion desde llamada Eel...")
    print("="*50)
    try:
        perform_backup_on_exit()
        print("[OK] Respaldo completado.")
    except Exception as e:
        print(f"[WARN] Error en respaldo al cerrar: {e}")
    # os._exit(0) finaliza el proceso de inmediato incluyendo todos los hilos
    os._exit(0)

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

class WebEngineWindow(QMainWindow):
    """Ventana nativa PyQt6 que contiene el motor Chromium QWebEngineView"""
    def __init__(self, url):
        super().__init__()
        self.url = url
        self.setup_ui()

    def setup_ui(self):
        company_name = config.get('company.name', 'Tu POS')
        self.setWindowTitle(f"{company_name} - Sistema POS")
        self.setMinimumSize(1280, 800)
        self.showMaximized()

        # Crear el contenedor de WebEngine
        self.browser = QWebEngineView()
        self.browser.setUrl(QUrl(self.url))
        
        # Layout
        central_widget = QWidget()
        layout = QVBoxLayout(central_widget)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.addWidget(self.browser)
        self.setCentralWidget(central_widget)

    def closeEvent(self, event: QCloseEvent):
        """Evento al cerrar ventana nativa: realiza confirmación, respaldo y sale"""
        from PyQt6.QtWidgets import QMessageBox
        
        reply = QMessageBox.question(
            self, 
            "Confirmar Salida", 
            "¿Esta seguro de que desea salir del Punto de Venta?\nSe cerrara el sistema y se realizara un respaldo automatico.",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
            QMessageBox.StandardButton.No
        )
        
        if reply == QMessageBox.StandardButton.Yes:
            print("\n" + "="*50)
            print("Cerrando aplicacion desde ventana PyQt6...")
            print("="*50)
            try:
                # Forzar respaldo consistente antes de cerrar
                perform_backup_on_exit()
                print("[OK] Respaldo completado.")
            except Exception as e:
                print(f"[WARN] Error en respaldo: {e}")
            
            event.accept()
            # Asegurar salida de todos los hilos y del proceso entero
            os._exit(0)
        else:
            # Cancelar evento de cerrado y mantener la aplicacion activa
            event.ignore()

def run_app():
    global current_user_data
    
    # 1. Crear aplicación Qt ÚNICA
    app = QApplication(sys.argv)
    app.setQuitOnLastWindowClosed(False)
    set_theme('dark') 
    
    # Inicializar Base de Datos
    try:
        init_database()
    except: pass
    
    login = LoginWindow()
    main_window = None  # Referencia para la ventana principal
    
    def on_login_success(auth_data):
        nonlocal main_window
        global current_user_data
        current_user_data = auth_data
        print(f"Usuario autenticado: {current_user_data.get('username')}")
        
        # Iniciar servidor Flask REST en un hilo demonio secundario para el Escáner Móvil
        try:
            from server import run_server
            api_thread = threading.Thread(target=run_server, kwargs={'host': '0.0.0.0', 'port': 5000, 'debug': False})
            api_thread.daemon = True
            api_thread.start()
            print("[OK] Servidor API en segundo plano iniciado en puerto 5000")
        except Exception as e:
            print(f"[WARN] No se pudo iniciar el servidor API en segundo plano: {e}")
        
        # 2. INICIAR BACKEND (Eel en un hilo dedicado nativo)
        port = 8920
        while is_port_in_use(port): port += 1
        
        start_page = 'index-tabs.html?autologin=true'
        
        def run_eel_backend():
            print(f"Iniciando servidor local de Eel en puerto {port}...")
            try:
                web_path = resource_path('web')
                eel.init(web_path)
                # block=True para mantener el loop de gevent en el hilo secundario
                eel.start(start_page, block=True, mode=None, port=port, host='127.0.0.1')
            except Exception as ex:
                print(f"[ERROR] Fallo al iniciar Eel en segundo plano: {ex}")
                
        eel_thread = threading.Thread(target=run_eel_backend)
        eel_thread.daemon = True
        eel_thread.start()
        
        # Esperar a que el servidor web este arriba y escuchando de forma no bloqueante para Qt
        import time
        retries = 50  # 5 segundos de espera maxima
        while retries > 0:
            app.processEvents()  # Evitar que la UI de Qt se congele y procesar tareas del sistema
            if is_port_in_use(port):
                print(f"[OK] Servidor backend de Eel listo en 127.0.0.1:{port}")
                break
            time.sleep(0.1)
            retries -= 1
            
        # 3. LANZAR VENTANA NATIVA PYQT6 CON CHROMIUM EMBEBIDO
        print("Iniciando ventana Chromium nativa autónoma...")
        url = f"http://127.0.0.1:{port}/{start_page}"
        main_window = WebEngineWindow(url)
        main_window.show()
        
        # Cerrar ventana de login después de mostrar la principal
        login.close()
    
    login.login_successful.connect(on_login_success)
    login.show()
    
    sys.exit(app.exec())

if __name__ == '__main__':
    run_app()
