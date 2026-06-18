# =============================================================================
# MÓDULO DE INVENTARIO
# =============================================================================

from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QTableWidget,
    QTableWidgetItem, QHeaderView, QPushButton, QComboBox,
    QDateEdit, QDialog, QFormLayout, QSpinBox, QLineEdit,
    QMessageBox
)
from PyQt6.QtCore import Qt, QDate
from PyQt6.QtGui import QFont

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from gui.styles import COLORS
from api import movements, products

class InventoryModule(QWidget):
    """Módulo de Movimientos de Inventario"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setup_ui()
        self.load_movements()
        
    def setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 20, 20, 20)
        
        # Header
        header = QHBoxLayout()
        title = QLabel("📋 Historial de Movimientos")
        title.setFont(QFont("Segoe UI", 18, QFont.Weight.Bold))
        header.addWidget(title)
        
        header.addStretch()
        
        btn_adjustment = QPushButton("➕ Nuevo Ajuste")
        btn_adjustment.setStyleSheet(f"""
            QPushButton {{
                background-color: {COLORS['primary']};
                color: white;
                border: none;
                border-radius: 6px;
                padding: 8px 16px;
                font-weight: bold;
            }}
        """)
        btn_adjustment.clicked.connect(self.new_adjustment)
        header.addWidget(btn_adjustment)
        layout.addLayout(header)
        
        # Filtros
        filters_layout = QHBoxLayout()
        filters_layout.addWidget(QLabel("Filtrar por tipo:"))
        
        self.type_filter = QComboBox()
        self.type_filter.addItems(["Todos", "entrada", "salida", "ajuste", "venta", "compra"])
        self.type_filter.currentTextChanged.connect(self.load_movements)
        filters_layout.addWidget(self.type_filter)
        
        filters_layout.addStretch()
        layout.addLayout(filters_layout)
        
        # Tabla
        self.table = QTableWidget()
        self.table.setColumnCount(6)
        self.table.setHorizontalHeaderLabels([
            "Fecha", "Tipo", "Producto", "Cantidad", "Usuario", "Motivo"
        ])
        self.table.horizontalHeader().setSectionResizeMode(2, QHeaderView.ResizeMode.Stretch)
        self.table.setAlternatingRowColors(True)
        self.table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        self.table.setStyleSheet(f"background-color: {COLORS['bg_medium']};")
        layout.addWidget(self.table)
        
    def load_movements(self):
        """Cargar movimientos"""
        filter_type = self.type_filter.currentText()
        if filter_type == "Todos":
            result = movements.get_all()
        else:
            result = movements.get_all({'type': filter_type})
            
        if result.get('success'):
            data = result.get('data', [])
            self.table.setRowCount(len(data))
            
            for row, m in enumerate(data):
                self.table.setItem(row, 0, QTableWidgetItem(m.get('created_at', m.get('date', ''))))
                
                type_item = QTableWidgetItem(m.get('type', '').upper())
                if m.get('type') in ['entrada', 'compra']:
                    type_item.setForeground(Qt.GlobalColor.green)
                else:
                    type_item.setForeground(Qt.GlobalColor.red)
                self.table.setItem(row, 1, type_item)
                
                self.table.setItem(row, 2, QTableWidgetItem(m.get('product_name', '')))
                self.table.setItem(row, 3, QTableWidgetItem(str(m.get('quantity', 0))))
                self.table.setItem(row, 4, QTableWidgetItem(m.get('user', '')))
                self.table.setItem(row, 5, QTableWidgetItem(m.get('reason', '')))
                
    def new_adjustment(self):
        """Crear nuevo ajuste de inventario"""
        dialog = AdjustmentDialog(self)
        if dialog.exec():
            data = dialog.get_data()
            if not data: return
            
            result = movements.create(data)
            if result.get('success'):
                QMessageBox.information(self, "Éxito", "Movimiento registrado")
                self.load_movements()
            else:
                QMessageBox.warning(self, "Error", f"Error: {result.get('error')}")

class AdjustmentDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setup_ui()
        
    def setup_ui(self):
        self.setWindowTitle("Nuevo Ajuste de Inventario")
        self.setFixedSize(400, 300)
        
        layout = QVBoxLayout(self)
        form = QFormLayout()
        
        # Producto
        self.product_combo = QComboBox()
        self.products_data = products.get_all().get('data', [])
        for p in self.products_data:
            self.product_combo.addItem(f"{p['code']} - {p['name']}", p['id'])
        form.addRow("Producto:", self.product_combo)
        
        # Tipo
        self.type_combo = QComboBox()
        self.type_combo.addItems(["entrada", "salida", "ajuste"])
        form.addRow("Tipo Movimiento:", self.type_combo)
        
        # Cantidad
        self.qty_spin = QSpinBox()
        self.qty_spin.setRange(1, 10000)
        form.addRow("Cantidad:", self.qty_spin)
        
        # Motivo
        self.reason_edit = QLineEdit()
        form.addRow("Motivo:", self.reason_edit)
        
        layout.addLayout(form)
        
        # Botones
        btns = QHBoxLayout()
        ok_btn = QPushButton("Guardar")
        ok_btn.clicked.connect(self.accept)
        cancel_btn = QPushButton("Cancelar")
        cancel_btn.clicked.connect(self.reject)
        
        btns.addWidget(cancel_btn)
        btns.addWidget(ok_btn)
        layout.addLayout(btns)
        
    def get_data(self):
        idx = self.product_combo.currentIndex()
        if idx < 0: return None
        
        return {
            'product_id': self.product_combo.itemData(idx),
            'type': self.type_combo.currentText(),
            'quantity': self.qty_spin.value(),
            'reason': self.reason_edit.text() or "Ajuste manual",
            'user_id': 1 # TODO: Usar usuario real
        }
