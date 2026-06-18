# =============================================================================
# MÓDULO DE REPORTES
# =============================================================================

from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, 
    QFrame, QGridLayout, QDateEdit, QPushButton
)
from PyQt6.QtCore import Qt, QDate
from PyQt6.QtGui import QFont

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from gui.styles import COLORS
from api import reports

class ReportsModule(QWidget):
    """Módulo de Reportes y Tablero"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setup_ui()
        self.load_stats()
        
    def setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 20, 20, 20)
        
        # Filtros Fechas
        dates_layout = QHBoxLayout()
        dates_layout.addWidget(QLabel("Desde:"))
        self.start_date = QDateEdit(QDate.currentDate())
        dates_layout.addWidget(self.start_date)
        
        dates_layout.addWidget(QLabel("Hasta:"))
        self.end_date = QDateEdit(QDate.currentDate())
        dates_layout.addWidget(self.end_date)
        
        btn_update = QPushButton("Actualizar")
        btn_update.setStyleSheet(f"background-color: {COLORS['primary']}; color: white; padding: 6px 12px; border-radius: 4px;")
        btn_update.clicked.connect(self.load_stats)
        dates_layout.addWidget(btn_update)
        
        dates_layout.addStretch()
        layout.addLayout(dates_layout)
        
        # Cards de Resumen
        self.cards_grid = QGridLayout()
        layout.addLayout(self.cards_grid)
        
        # Inicializar cards vacías
        self.create_card("Ventas Totales", "$0.00", 0, 0)
        self.create_card("Ganancia Bruta", "$0.00", 0, 1)
        self.create_card("Inventario Valor", "$0.00", 0, 2)
        
        layout.addStretch()
        
    def create_card(self, title, value, row, col):
        frame = QFrame()
        frame.setStyleSheet(f"""
            QFrame {{
                background-color: {COLORS['bg_medium']};
                border: 1px solid {COLORS['border']};
                border-radius: 8px;
                padding: 16px;
            }}
        """)
        vbox = QVBoxLayout(frame)
        
        lbl_title = QLabel(title)
        lbl_title.setStyleSheet(f"color: {COLORS['text_secondary']}; font-size: 14px;")
        vbox.addWidget(lbl_title)
        
        lbl_val = QLabel(value)
        lbl_val.setStyleSheet(f"color: {COLORS['success']}; font-size: 24px; font-weight: bold;")
        lbl_val.setAlignment(Qt.AlignmentFlag.AlignRight)
        vbox.addWidget(lbl_val)
        
        self.cards_grid.addWidget(frame, row, col)
        
    def load_stats(self):
        # En una implementación real, esto llamaría a reports.get_dashboard_stats()
        # Por ahora mostramos datos simulados o básicos
        try:
            stats = reports.get_dashboard_stats().get('data', {})
        except:
            stats = {}
            
        # Reconstruir cards con datos reales (simplificado para demo)
        # TODO: Implementar actualización dinámica
