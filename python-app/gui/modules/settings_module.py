# =============================================================================
# MÓDULO DE CONFIGURACIÓN
# =============================================================================

from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QTabWidget, QLabel, 
    QCheckBox, QPushButton, QFormLayout, QLineEdit,
    QMessageBox
)
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from gui.styles import COLORS
from core.config_manager import config

class SettingsModule(QWidget):
    """Módulo de Configuración"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setup_ui()
        
    def setup_ui(self):
        layout = QVBoxLayout(self)
        
        tabs = QTabWidget()
        tabs.addTab(self._create_general_tab(), "General")
        tabs.addTab(self._create_modules_tab(), "Módulos")
        
        layout.addWidget(tabs)
        
    def _create_general_tab(self):
        widget = QWidget()
        layout = QFormLayout(widget)
        
        self.company_name = QLineEdit(config.get('company.name', ''))
        layout.addRow("Nombre Empresa:", self.company_name)
        
        btn_save = QPushButton("Guardar Cambios")
        btn_save.clicked.connect(self.save_general)
        layout.addRow(btn_save)
        
        return widget
        
    def _create_modules_tab(self):
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        layout.addWidget(QLabel("Selecciona los módulos activos:"))
        
        self.modules_checks = {}
        modules = {
            'inventory': 'Inventario Avanzado',
            'customers': 'Créditos y Clientes',
            'reports': 'Reportes Financieros'
        }
        
        for key, name in modules.items():
            chk = QCheckBox(name)
            chk.setChecked(config.is_module_enabled(key))
            # chk.toggled.connect(...)
            layout.addWidget(chk)
            self.modules_checks[key] = chk
            
        btn_save = QPushButton("Guardar Módulos")
        btn_save.clicked.connect(self.save_modules)
        layout.addWidget(btn_save)
        layout.addStretch()
        
        return widget

    def save_general(self):
        config.set('company.name', self.company_name.text())
        QMessageBox.information(self, "Guardado", "Configuración guardada. Reinicia para aplicar cambios.")

    def save_modules(self):
        for key, chk in self.modules_checks.items():
            config.toggle_module(key, chk.isChecked())
        QMessageBox.information(self, "Guardado", "Módulos actualizados. Reinicia la aplicación.")
