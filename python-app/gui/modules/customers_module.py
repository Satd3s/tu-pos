# =============================================================================
# MÓDULO DE CLIENTES
# =============================================================================

from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit,
    QPushButton, QTableWidget, QTableWidgetItem, QHeaderView,
    QDialog, QFormLayout, QMessageBox
)
from PyQt6.QtCore import Qt
from PyQt6.QtGui import QFont

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from gui.styles import COLORS
from api import customers

class CustomersModule(QWidget):
    """Módulo de Gestión de Clientes"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setup_ui()
        self.load_customers()
        
    def setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 20, 20, 20)
        
        # Header
        header = QHBoxLayout()
        title = QLabel("👥 Clientes")
        title.setFont(QFont("Segoe UI", 18, QFont.Weight.Bold))
        header.addWidget(title)
        
        header.addStretch()
        
        btn_add = QPushButton("➕ Nuevo Cliente")
        btn_add.setStyleSheet(f"background-color: {COLORS['primary']}; color: white; border-radius: 6px; padding: 8px;")
        btn_add.clicked.connect(self.add_customer)
        header.addWidget(btn_add)
        layout.addLayout(header)
        
        # Tabla
        self.table = QTableWidget()
        self.table.setColumnCount(5)
        self.table.setHorizontalHeaderLabels(["Nombre", "Teléfono", "Email", "Dirección", "Saldo Crèdito"])
        self.table.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeMode.Stretch)
        self.table.setAlternatingRowColors(True)
        self.table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        self.table.setStyleSheet(f"background-color: {COLORS['bg_medium']};")
        layout.addWidget(self.table)
        
    def load_customers(self):
        result = customers.get_all()
        if result.get('success'):
            data = result.get('data', [])
            self.table.setRowCount(len(data))
            for row, c in enumerate(data):
                self.table.setItem(row, 0, QTableWidgetItem(c.get('name', '')))
                self.table.setItem(row, 1, QTableWidgetItem(c.get('phone', '')))
                self.table.setItem(row, 2, QTableWidgetItem(c.get('email', '')))
                self.table.setItem(row, 3, QTableWidgetItem(c.get('address', '')))
                
                balance = f"${c.get('current_balance', 0):.2f}"
                self.table.setItem(row, 4, QTableWidgetItem(balance))
                
    def add_customer(self):
        dialog = CustomerDialog(self)
        if dialog.exec():
            data = dialog.get_data()
            if customers.save(data).get('success'):
                self.load_customers()

class CustomerDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Nuevo Cliente")
        self.setFixedSize(400, 300)
        
        layout = QVBoxLayout(self)
        form = QFormLayout()
        
        self.name_edit = QLineEdit()
        form.addRow("Nombre:", self.name_edit)
        
        self.phone_edit = QLineEdit()
        form.addRow("Teléfono:", self.phone_edit)
        
        self.email_edit = QLineEdit()
        form.addRow("Email:", self.email_edit)
        
        self.address_edit = QLineEdit()
        form.addRow("Dirección:", self.address_edit)
        
        self.limit_edit = QLineEdit("0")
        form.addRow("Límite Crédito:", self.limit_edit)
        
        layout.addLayout(form)
        
        btns = QHBoxLayout()
        ok = QPushButton("Guardar")
        ok.clicked.connect(self.accept)
        btns.addWidget(ok)
        layout.addLayout(btns)
        
    def get_data(self):
        return {
            'name': self.name_edit.text(),
            'phone': self.phone_edit.text(),
            'email': self.email_edit.text(),
            'address': self.address_edit.text(),
            'credit_limit': float(self.limit_edit.text() or 0)
        }
