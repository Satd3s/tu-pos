# =============================================================================
# MÓDULO DE PRODUCTOS
# =============================================================================

from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit,
    QPushButton, QTableWidget, QTableWidgetItem, QHeaderView,
    QDialog, QFormLayout, QSpinBox, QDoubleSpinBox, QMessageBox,
    QComboBox, QCheckBox
)
from PyQt6.QtCore import Qt
from PyQt6.QtGui import QFont, QIcon

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from gui.styles import COLORS
from api import products


class ProductsModule(QWidget):
    """Módulo de Gestión de Productos"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setup_ui()
        self.load_products()
        
    def setup_ui(self):
        """Configurar interfaz"""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 20, 20, 20)
        
        # Header
        header_layout = QHBoxLayout()
        
        title = QLabel("📦 Catálogo de Productos")
        title.setFont(QFont("Segoe UI", 18, QFont.Weight.Bold))
        header_layout.addWidget(title)
        
        header_layout.addStretch()
        
        # Botón Nuevo Producto
        btn_add = QPushButton("➕ Nuevo Producto")
        btn_add.setMinimumHeight(40)
        btn_add.setCursor(Qt.CursorShape.PointingHandCursor)
        btn_add.setStyleSheet(f"""
            QPushButton {{
                background-color: {COLORS['primary']};
                color: white;
                border: none;
                border-radius: 6px;
                padding: 0 20px;
                font-weight: 600;
            }}
            QPushButton:hover {{
                background-color: {COLORS['primary_hover']};
            }}
        """)
        btn_add.clicked.connect(self.add_product)
        header_layout.addWidget(btn_add)
        
        layout.addLayout(header_layout)
        
        layout.addSpacing(20)
        
        # Barra de búsqueda
        search_layout = QHBoxLayout()
        self.search_input = QLineEdit()
        self.search_input.setPlaceholderText("🔍 Buscar por código, nombre o categoría...")
        self.search_input.setMinimumHeight(40)
        self.search_input.setStyleSheet(f"""
            QLineEdit {{
                background-color: {COLORS['bg_light']};
                border: 1px solid {COLORS['border']};
                border-radius: 6px;
                padding: 0 12px;
            }}
            QLineEdit:focus {{
                border-color: {COLORS['primary']};
            }}
        """)
        self.search_input.textChanged.connect(self.filter_products)
        search_layout.addWidget(self.search_input)
        
        btn_refresh = QPushButton("🔄")
        btn_refresh.setFixedSize(40, 40)
        btn_refresh.setCursor(Qt.CursorShape.PointingHandCursor)
        btn_refresh.clicked.connect(self.load_products)
        search_layout.addWidget(btn_refresh)
        
        layout.addLayout(search_layout)
        
        # Tabla de productos
        self.table = QTableWidget()
        self.table.setColumnCount(6)
        self.table.setHorizontalHeaderLabels([
            "Código", "Producto", "Categoría", "Precio", "Stock", "Acciones"
        ])
        self.table.horizontalHeader().setSectionResizeMode(1, QHeaderView.ResizeMode.Stretch)
        self.table.setAlternatingRowColors(True)
        self.table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        self.table.verticalHeader().setVisible(False)
        self.table.setStyleSheet(f"""
            QTableWidget {{
                background-color: {COLORS['bg_medium']};
                border: 1px solid {COLORS['border']};
                border-radius: 8px;
                gridline-color: {COLORS['border']};
            }}
            QHeaderView::section {{
                background-color: {COLORS['bg_dark']};
                padding: 8px;
                border: none;
                font-weight: bold;
            }}
            QTableWidget::item {{
                padding: 6px;
            }}
        """)
        layout.addWidget(self.table)
        
    def load_products(self):
        """Cargar productos desde la base de datos"""
        try:
            result = products.get_all()
            if result.get('success'):
                self.products_data = result.get('data', [])
                self.filter_products(self.search_input.text())
            else:
                QMessageBox.warning(self, "Error", f"No se pudieron cargar los productos: {result.get('error')}")
        except Exception as e:
            QMessageBox.critical(self, "Error Critical", str(e))

    def filter_products(self, query):
        """Filtrar y mostrar productos"""
        query = query.lower()
        filtered = [
            p for p in self.products_data 
            if query in str(p.get('code', '')).lower() 
            or query in str(p.get('name', '')).lower()
            or query in str(p.get('category', '')).lower()
        ]
        
        self.table.setRowCount(len(filtered))
        
        for row, p in enumerate(filtered):
            # Columna Código
            self.table.setItem(row, 0, QTableWidgetItem(str(p.get('code', ''))))
            
            # Columna Nombre
            self.table.setItem(row, 1, QTableWidgetItem(str(p.get('name', ''))))
            
            # Columna Categoría
            self.table.setItem(row, 2, QTableWidgetItem(str(p.get('category', 'General'))))
            
            # Columna Precio
            price_item = QTableWidgetItem(f"${p.get('public_price') or p.get('price', 0):.2f}")
            price_item.setTextAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
            self.table.setItem(row, 3, price_item)
            
            # Columna Stock
            stock = p.get('stock', 0)
            stock_item = QTableWidgetItem(str(stock))
            stock_item.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
            
            # Alerta visual de stock bajo
            if stock <= p.get('min_stock', 5):
                stock_item.setForeground(Qt.GlobalColor.red)
                stock_item.setFont(QFont("Segoe UI", 9, QFont.Weight.Bold))
                
            self.table.setItem(row, 4, stock_item)
            
            # Columna Acciones
            actions_widget = QWidget()
            actions_layout = QHBoxLayout(actions_widget)
            actions_layout.setContentsMargins(0, 0, 0, 0)
            actions_layout.setSpacing(4)
            
            btn_edit = QPushButton("✏️")
            btn_edit.setFixedSize(30, 24)
            btn_edit.setToolTip("Editar")
            btn_edit.clicked.connect(lambda checked, pid=p['id']: self.edit_product(pid))
            
            btn_del = QPushButton("🗑️")
            btn_del.setFixedSize(30, 24)
            btn_del.setToolTip("Eliminar")
            btn_del.setStyleSheet(f"color: {COLORS['danger']};")
            btn_del.clicked.connect(lambda checked, pid=p['id']: self.delete_product(pid))
            
            actions_layout.addWidget(btn_edit)
            actions_layout.addWidget(btn_del)
            actions_layout.addStretch()
            
            self.table.setCellWidget(row, 5, actions_widget)
            
    def add_product(self):
        """Abrir diálogo para nuevo producto"""
        dialog = ProductDialog(parent=self)
        if dialog.exec():
            data = dialog.get_data()
            result = products.save(data)
            if result.get('success'):
                self.load_products()
                QMessageBox.information(self, "Éxito", "Producto guardado correctamente")
            else:
                QMessageBox.warning(self, "Error", f"Error al guardar: {result.get('error')}")
                
    def edit_product(self, product_id):
        """Editar un producto existente"""
        result = products.get_by_id(product_id)
        if result.get('success'):
            product_data = result.get('data')
            dialog = ProductDialog(product_data, self)
            if dialog.exec():
                data = dialog.get_data()
                data['id'] = product_id # Asegurar que mantenemos el ID
                save_result = products.save(data)
                if save_result.get('success'):
                    self.load_products()
                    QMessageBox.information(self, "Éxito", "Producto actualizado correctamente")
                else:
                    QMessageBox.warning(self, "Error", f"Error al actualizar: {save_result.get('error')}")
                    
    def delete_product(self, product_id):
        """Eliminar un producto"""
        reply = QMessageBox.question(
            self, "Confirmar eliminación",
            "¿Estás seguro de que deseas eliminar este producto?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )
        
        if reply == QMessageBox.StandardButton.Yes:
            result = products.delete(product_id)
            if result.get('success'):
                self.load_products()
            else:
                QMessageBox.warning(self, "Error", f"No se pudo eliminar: {result.get('error')}")


class ProductDialog(QDialog):
    """Diálogo para agregar/editar producto"""
    
    def __init__(self, data=None, parent=None):
        super().__init__(parent)
        self.data = data or {}
        self.setup_ui()
        
    def setup_ui(self):
        self.setWindowTitle("Detalles del Producto")
        self.setFixedSize(500, 600)
        
        layout = QVBoxLayout(self)
        form_layout = QFormLayout()
        
        # Estilo de inputs
        input_style = f"background-color: {COLORS['bg_light']}; border: 1px solid {COLORS['border']}; padding: 6px; border-radius: 4px;"
        
        # Código de Barras
        self.code_input = QLineEdit(self.data.get('code', ''))
        self.code_input.setStyleSheet(input_style)
        form_layout.addRow("Código de Barras:", self.code_input)
        
        # Nombre
        self.name_input = QLineEdit(self.data.get('name', ''))
        self.name_input.setStyleSheet(input_style)
        form_layout.addRow("Nombre del Producto:", self.name_input)
        
        # Categoría
        self.category_input = QComboBox()
        self.category_input.addItems(["General", "Bebidas", "Limpieza", "Alimentos", "Farmacia"]) # Demo categories
        self.category_input.setEditable(True)
        self.category_input.setCurrentText(self.data.get('category', 'General'))
        self.category_input.setStyleSheet(input_style)
        form_layout.addRow("Categoría:", self.category_input)
        
        # Precios
        self.cost_input = QDoubleSpinBox()
        self.cost_input.setRange(0, 999999)
        self.cost_input.setValue(float(self.data.get('purchase_cost') or self.data.get('cost') or 0))
        self.cost_input.setPrefix("$ ")
        self.cost_input.setStyleSheet(input_style)
        form_layout.addRow("Costo:", self.cost_input)
        
        self.price_input = QDoubleSpinBox()
        self.price_input.setRange(0, 999999)
        self.price_input.setValue(float(self.data.get('public_price') or self.data.get('price') or 0))
        self.price_input.setPrefix("$ ")
        self.price_input.setStyleSheet(input_style)
        form_layout.addRow("Precio Venta:", self.price_input)
        
        self.wholesale_input = QDoubleSpinBox()
        self.wholesale_input.setRange(0, 999999)
        self.wholesale_input.setValue(float(self.data.get('wholesale_price', 0)))
        self.wholesale_input.setPrefix("$ ")
        self.wholesale_input.setStyleSheet(input_style)
        form_layout.addRow("Precio Mayoreo:", self.wholesale_input)
        
        # Stock
        self.stock_input = QSpinBox()
        self.stock_input.setRange(0, 1000000)
        self.stock_input.setValue(int(self.data.get('stock', 0)))
        self.stock_input.setStyleSheet(input_style)
        form_layout.addRow("Stock Actual:", self.stock_input)
        
        self.min_stock_input = QSpinBox()
        self.min_stock_input.setRange(0, 1000000)
        self.min_stock_input.setValue(int(self.data.get('min_stock', 5)))
        self.min_stock_input.setStyleSheet(input_style)
        form_layout.addRow("Stock Mínimo:", self.min_stock_input)
        
        layout.addLayout(form_layout)
        
        # Botones
        button_box = QHBoxLayout()
        button_box.addStretch()
        
        btn_cancel = QPushButton("Cancelar")
        btn_cancel.clicked.connect(self.reject)
        button_box.addWidget(btn_cancel)
        
        btn_save = QPushButton("Guardar")
        btn_save.setStyleSheet(f"background-color: {COLORS['primary']}; color: white; font-weight: bold;")
        btn_save.clicked.connect(self.accept)
        button_box.addWidget(btn_save)
        
        layout.addLayout(button_box)
        
    def get_data(self):
        """Retorna los datos del formulario"""
        return {
            'code': self.code_input.text(),
            'name': self.name_input.text(),
            'category': self.category_input.currentText(),
            'purchase_cost': self.cost_input.value(),
            'public_price': self.price_input.value(),
            'cost': self.cost_input.value(),
            'price': self.price_input.value(),
            'wholesale_price': self.wholesale_input.value(),
            'stock': self.stock_input.value(),
            'min_stock': self.min_stock_input.value()
        }
