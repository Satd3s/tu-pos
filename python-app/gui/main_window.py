# =============================================================================
# VENTANA PRINCIPAL - Aplicación de Punto de Venta
# =============================================================================

from PyQt6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, QLabel,
    QPushButton, QFrame, QStackedWidget, QSizePolicy, QSpacerItem,
    QStatusBar, QMessageBox, QApplication
)
from PyQt6.QtCore import Qt, QSize, pyqtSignal, QTimer
from PyQt6.QtGui import QFont, QIcon, QAction, QCloseEvent

from .styles import COLORS, get_stylesheet, set_theme
from .widgets.sidebar import Sidebar
from .modules.pos_module import POSModule
from .modules.products_module import ProductsModule
from .modules.inventory_module import InventoryModule
from .modules.customers_module import CustomersModule
from .modules.reports_module import ReportsModule
from .modules.settings_module import SettingsModule

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from core.config_manager import config


class MainWindow(QMainWindow):
    """Ventana principal de la aplicación"""
    
    # Señal para cerrar sesión
    logout_requested = pyqtSignal()
    
    def __init__(self, user_data=None):
        super().__init__()
        self.user_data = user_data or {'username': 'admin', 'role': 'admin'}
        self.current_module = None
        self.modules = {}
        
        # Cargar preferencia de tema
        saved_theme = config.get('gui.theme', 'dark')
        set_theme(saved_theme)
        
        self.setup_ui()
        self.setup_statusbar()
        self.load_enabled_modules()
        
    def setup_ui(self):
        """Configurar interfaz de usuario"""
        # Configuración de ventana
        company_name = config.get('company.name', 'Tu POS')
        self.setWindowTitle(f"{company_name} - Sistema de Punto de Venta")
        self.setMinimumSize(1200, 700)
        self.showMaximized()
        
        # Aplicar estilos globales
        self.apply_theme(config.get('gui.theme', 'dark'))
        
        # Widget central
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # Layout principal horizontal
        main_layout = QHBoxLayout(central_widget)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)
        
        # Sidebar
        self.sidebar = Sidebar(self)
        self.sidebar.module_selected.connect(self.switch_module)
        self.sidebar.logout_clicked.connect(self.logout)
        main_layout.addWidget(self.sidebar)
        
        # Área de contenido principal
        content_container = QWidget()
        content_layout = QVBoxLayout(content_container)
        content_layout.setContentsMargins(0, 0, 0, 0)
        content_layout.setSpacing(0)
        
        # Header del contenido
        self.header = self._create_header()
        content_layout.addWidget(self.header)
        
        # Stack de módulos
        self.module_stack = QStackedWidget()
        content_layout.addWidget(self.module_stack)
        
        main_layout.addWidget(content_container, 1)

    def apply_theme(self, theme_name):
        """Aplicar tema visual a toda la aplicación"""
        set_theme(theme_name)
        app = QApplication.instance()
        if app:
            app.setStyleSheet(get_stylesheet(theme_name))
        
        # Guardar preferencia
        config.set('gui.theme', theme_name)
        
    def _create_header(self):
        """Crear barra de cabecera del contenido"""
        header = QFrame()
        header.setFixedHeight(60)
        header.setObjectName("header")
        # El estilo se aplica via stylesheet global
        
        layout = QHBoxLayout(header)
        layout.setContentsMargins(20, 0, 20, 0)
        
        # Título del módulo actual
        self.header_title = QLabel("Punto de Venta")
        self.header_title.setFont(QFont("Segoe UI", 16, QFont.Weight.Bold))
        layout.addWidget(self.header_title)
        
        layout.addStretch()
        
        # Botones de Tema Rápido (Temporal hasta tener settings)
        btn_theme = QPushButton("🎨 Tema")
        btn_theme.setCursor(Qt.CursorShape.PointingHandCursor)
        btn_theme.clicked.connect(self._toggle_theme)
        layout.addWidget(btn_theme)
        
        layout.addSpacing(10)
        
        # Info del usuario
        user_label = QLabel(f"👤 {self.user_data.get('username', 'Usuario')}")
        user_label.setFont(QFont("Segoe UI", 11))
        layout.addWidget(user_label)
        
        # Fecha y hora
        self.datetime_label = QLabel()
        self.datetime_label.setFont(QFont("Segoe UI", 11))
        self.datetime_label.setStyleSheet(f"margin-left: 20px;")
        layout.addWidget(self.datetime_label)
        
        # Actualizar hora cada segundo
        self.timer = QTimer(self)
        self.timer.timeout.connect(self._update_datetime)
        self.timer.start(1000)
        self._update_datetime()
        
        return header
        
    def _toggle_theme(self):
        """Alternar entre claro y oscuro"""
        current = config.get('gui.theme', 'dark')
        new_theme = 'light' if current == 'dark' else 'dark'
        self.apply_theme(new_theme)
        
    def _update_datetime(self):
        """Actualizar fecha y hora en el header"""
        from datetime import datetime
        now = datetime.now()
        self.datetime_label.setText(now.strftime("📅 %d/%m/%Y   🕐 %H:%M:%S"))
        
    def setup_statusbar(self):
        """Configurar barra de estado"""
        statusbar = QStatusBar()
        self.setStatusBar(statusbar)
        
        # Estado de conexión
        self.connection_status = QLabel("● Conectado")
        self.connection_status.setStyleSheet("color: #107C10; font-weight: bold;") 
        # Color hardcoded temporalmente, idealmente usar colors
        statusbar.addWidget(self.connection_status)
        
        # Separador
        statusbar.addWidget(QLabel(" | "))
        
        # Información de la estación
        station = config.get('network.station_name', 'CAJA-1')
        self.station_label = QLabel(f"Estación: {station}")
        statusbar.addWidget(self.station_label)
        
        # Información a la derecha
        statusbar.addPermanentWidget(QLabel(f"v1.0.0"))
        
    def load_enabled_modules(self):
        """Cargar módulos habilitados según configuración"""
        enabled_modules = config.get_enabled_modules()
        
        # Módulos disponibles (en orden)
        available_modules = {
            'pos': ('Punto de Venta', '💳', POSModule),
            'products': ('Productos', '📦', ProductsModule),
            'inventory': ('Inventario', '📋', InventoryModule),
            'customers': ('Clientes', '👥', CustomersModule),
            'reports': ('Reportes', '📊', ReportsModule),
            'settings': ('Configuración', '⚙️', SettingsModule),
        }
        
        first_module = None
        
        for module_id, (name, icon, module_class) in available_modules.items():
            # Siempre mostrar POS y Settings, los demás según config
            if module_id in ['pos', 'settings'] or module_id in enabled_modules:
                try:
                    # Crear instancia del módulo
                    module = module_class(self)
                    self.modules[module_id] = module
                    self.module_stack.addWidget(module)
                    
                    # Agregar al sidebar
                    self.sidebar.add_module(module_id, name, icon)
                    
                    if first_module is None:
                        first_module = module_id
                        
                except Exception as e:
                    print(f"[ERROR] No se pudo cargar módulo {module_id}: {e}")
        
        # Seleccionar primer módulo
        if first_module:
            self.switch_module(first_module)
            self.sidebar.select_module(first_module)
            
    def switch_module(self, module_id):
        """Cambiar al módulo especificado"""
        if module_id in self.modules:
            module = self.modules[module_id]
            self.module_stack.setCurrentWidget(module)
            self.current_module = module_id
            
            # Actualizar título del header
            titles = {
                'pos': 'Punto de Venta',
                'products': 'Gestión de Productos',
                'inventory': 'Control de Inventario',
                'customers': 'Clientes',
                'reports': 'Reportes y Estadísticas',
                'settings': 'Configuración',
            }
            self.header_title.setText(titles.get(module_id, module_id.title()))
            
            # Notificar al módulo que fue activado
            if hasattr(module, 'on_activated'):
                module.on_activated()
                
    def logout(self):
        """Cerrar sesión"""
        reply = QMessageBox.question(
            self,
            "Cerrar Sesión",
            "¿Estás seguro que deseas cerrar sesión?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
            QMessageBox.StandardButton.No
        )
        
        if reply == QMessageBox.StandardButton.Yes:
            self.logout_requested.emit()
            self.close()
            
    def closeEvent(self, event: QCloseEvent):
        """Evento al cerrar ventana"""
        # Crear respaldo antes de cerrar
        try:
            from database import backup_db
            result = backup_db()
            if result.get('success'):
                print("[OK] Respaldo creado al cerrar")
        except Exception as e:
            print(f"[WARN] Error en respaldo: {e}")
            
        event.accept()
