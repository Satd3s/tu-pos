# =============================================================================
# SIDEBAR - Menú lateral de navegación
# =============================================================================

from PyQt6.QtWidgets import (
    QFrame, QVBoxLayout, QHBoxLayout, QLabel,
    QPushButton, QSizePolicy, QSpacerItem, QWidget
)
from PyQt6.QtCore import Qt, QSize, pyqtSignal
from PyQt6.QtGui import QFont, QIcon

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from gui.styles import COLORS


class SidebarButton(QPushButton):
    """Botón del sidebar con icono y texto"""
    
    def __init__(self, module_id, text, icon_text, parent=None):
        super().__init__(parent)
        self.module_id = module_id
        self.is_selected = False
        
        self.setText(f"  {icon_text}   {text}")
        self.setFont(QFont("Segoe UI", 11))
        self.setFixedHeight(48)
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        self.setCheckable(True)
        
        self._update_style()
        
    def _update_style(self):
        """Actualizar estilo según estado"""
        if self.is_selected:
            self.setStyleSheet(f"""
                QPushButton {{
                    background-color: {COLORS['primary']};
                    color: {COLORS['text_primary']};
                    border: none;
                    border-radius: 8px;
                    text-align: left;
                    padding-left: 16px;
                    font-weight: 600;
                }}
            """)
        else:
            self.setStyleSheet(f"""
                QPushButton {{
                    background-color: transparent;
                    color: {COLORS['text_secondary']};
                    border: none;
                    border-radius: 8px;
                    text-align: left;
                    padding-left: 16px;
                }}
                QPushButton:hover {{
                    background-color: {COLORS['sidebar_item_hover']};
                    color: {COLORS['text_primary']};
                }}
            """)
            
    def set_selected(self, selected):
        """Establecer estado de selección"""
        self.is_selected = selected
        self.setChecked(selected)
        self._update_style()


class Sidebar(QFrame):
    """Barra lateral de navegación"""
    
    # Señales
    module_selected = pyqtSignal(str)
    logout_clicked = pyqtSignal()
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.buttons = {}
        self.current_selection = None
        
        self.setup_ui()
        
    def setup_ui(self):
        """Configurar interfaz"""
        self.setObjectName("sidebar")
        self.setFixedWidth(240)
        self.setStyleSheet(f"""
            QFrame#sidebar {{
                background-color: {COLORS['sidebar_bg']};
                border-right: 1px solid {COLORS['border']};
            }}
        """)
        
        layout = QVBoxLayout(self)
        layout.setContentsMargins(12, 12, 12, 12)
        layout.setSpacing(4)
        
        # Logo / Título
        logo_container = QWidget()
        logo_layout = QHBoxLayout(logo_container)
        logo_layout.setContentsMargins(8, 12, 8, 24)
        
        logo_icon = QLabel("🏪")
        logo_icon.setFont(QFont("Segoe UI Emoji", 24))
        logo_layout.addWidget(logo_icon)
        
        from core.config_manager import config
        company_name = config.get('company.name', 'Tu POS')
        
        logo_text = QLabel(company_name)
        logo_text.setFont(QFont("Segoe UI", 16, QFont.Weight.Bold))
        logo_text.setStyleSheet(f"color: {COLORS['text_primary']};")
        logo_layout.addWidget(logo_text)
        logo_layout.addStretch()
        
        layout.addWidget(logo_container)
        
        # Separador
        separator = QFrame()
        separator.setFixedHeight(1)
        separator.setStyleSheet(f"background-color: {COLORS['border']};")
        layout.addWidget(separator)
        
        layout.addSpacing(12)
        
        # Contenedor para botones de módulos
        self.modules_container = QVBoxLayout()
        self.modules_container.setSpacing(4)
        layout.addLayout(self.modules_container)
        
        # Espaciador
        layout.addStretch()
        
        # Separador antes de logout
        separator2 = QFrame()
        separator2.setFixedHeight(1)
        separator2.setStyleSheet(f"background-color: {COLORS['border']};")
        layout.addWidget(separator2)
        
        layout.addSpacing(8)
        
        # Botón de cerrar sesión
        btn_logout = QPushButton("  🚪   Cerrar Sesión")
        btn_logout.setFont(QFont("Segoe UI", 11))
        btn_logout.setFixedHeight(48)
        btn_logout.setCursor(Qt.CursorShape.PointingHandCursor)
        btn_logout.setStyleSheet(f"""
            QPushButton {{
                background-color: transparent;
                color: {COLORS['text_secondary']};
                border: none;
                border-radius: 8px;
                text-align: left;
                padding-left: 16px;
            }}
            QPushButton:hover {{
                background-color: {COLORS['danger']};
                color: {COLORS['text_primary']};
            }}
        """)
        btn_logout.clicked.connect(self.logout_clicked.emit)
        layout.addWidget(btn_logout)
        
    def add_module(self, module_id, name, icon):
        """Agregar un módulo al sidebar"""
        btn = SidebarButton(module_id, name, icon, self)
        btn.clicked.connect(lambda checked, mid=module_id: self._on_module_clicked(mid))
        
        self.buttons[module_id] = btn
        self.modules_container.addWidget(btn)
        
    def _on_module_clicked(self, module_id):
        """Manejar clic en módulo"""
        self.select_module(module_id)
        self.module_selected.emit(module_id)
        
    def select_module(self, module_id):
        """Seleccionar un módulo visualmente"""
        # Deseleccionar anterior
        if self.current_selection and self.current_selection in self.buttons:
            self.buttons[self.current_selection].set_selected(False)
            
        # Seleccionar nuevo
        if module_id in self.buttons:
            self.buttons[module_id].set_selected(True)
            self.current_selection = module_id
