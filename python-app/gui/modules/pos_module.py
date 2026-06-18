# =============================================================================
# MÓDULO POS - Punto de Venta
# =============================================================================

from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit,
    QPushButton, QFrame, QTableWidget, QTableWidgetItem,
    QHeaderView, QMessageBox, QSplitter, QGridLayout,
    QDialog, QDialogButtonBox, QComboBox, QSpinBox,
    QDoubleSpinBox, QGroupBox, QScrollArea, QSizePolicy
)
from PyQt6.QtCore import Qt, QTimer, pyqtSignal
from PyQt6.QtGui import QFont, QKeySequence, QShortcut

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from gui.styles import COLORS
from api import products, sales


class POSModule(QWidget):
    """Módulo de Punto de Venta"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.cart = []  # Lista de items en el carrito
        self.current_shift = None
        self.search_results = []
        
        self.setup_ui()
        self.setup_shortcuts()
        self.check_shift()
        
    def setup_ui(self):
        """Configurar interfaz del POS"""
        layout = QHBoxLayout(self)
        layout.setContentsMargins(16, 16, 16, 16)
        layout.setSpacing(16)
        
        # Splitter para dividir búsqueda/carrito
        splitter = QSplitter(Qt.Orientation.Horizontal)
        
        # ===== Panel izquierdo: Búsqueda y productos =====
        left_panel = self._create_search_panel()
        splitter.addWidget(left_panel)
        
        # ===== Panel derecho: Carrito y totales =====
        right_panel = self._create_cart_panel()
        splitter.addWidget(right_panel)
        
        # Proporciones 40/60
        splitter.setSizes([400, 600])
        
        layout.addWidget(splitter)
        
    def _create_search_panel(self):
        """Crear panel de búsqueda de productos"""
        panel = QFrame()
        panel.setStyleSheet(f"""
            QFrame {{
                background-color: {COLORS['bg_medium']};
                border-radius: 12px;
                border: 1px solid {COLORS['border']};
            }}
        """)
        
        layout = QVBoxLayout(panel)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(16)
        
        # Título
        title = QLabel("🔍 Buscar Producto")
        title.setFont(QFont("Segoe UI", 14, QFont.Weight.Bold))
        layout.addWidget(title)
        
        # Campo de búsqueda
        self.search_input = QLineEdit()
        self.search_input.setPlaceholderText("Código de barras o nombre del producto...")
        self.search_input.setFont(QFont("Segoe UI", 14))
        self.search_input.setMinimumHeight(50)
        self.search_input.setStyleSheet(f"""
            QLineEdit {{
                background-color: {COLORS['bg_light']};
                border: 2px solid {COLORS['border']};
                border-radius: 8px;
                padding: 0 16px;
                font-size: 14px;
            }}
            QLineEdit:focus {{
                border-color: {COLORS['primary']};
            }}
        """)
        self.search_input.textChanged.connect(self._on_search_changed)
        self.search_input.returnPressed.connect(self._on_search_enter)
        layout.addWidget(self.search_input)
        
        # Lista de resultados
        results_label = QLabel("Resultados:")
        results_label.setFont(QFont("Segoe UI", 11))
        results_label.setStyleSheet(f"color: {COLORS['text_secondary']};")
        layout.addWidget(results_label)
        
        self.results_table = QTableWidget()
        self.results_table.setColumnCount(4)
        self.results_table.setHorizontalHeaderLabels(["Código", "Producto", "Precio", "Stock"])
        self.results_table.horizontalHeader().setSectionResizeMode(1, QHeaderView.ResizeMode.Stretch)
        self.results_table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        self.results_table.setAlternatingRowColors(True)
        self.results_table.doubleClicked.connect(self._add_selected_to_cart)
        self.results_table.setStyleSheet(f"""
            QTableWidget {{
                background-color: {COLORS['bg_light']};
                border: 1px solid {COLORS['border']};
                border-radius: 8px;
            }}
            QTableWidget::item {{
                padding: 8px;
            }}
            QTableWidget::item:selected {{
                background-color: {COLORS['primary']};
            }}
        """)
        layout.addWidget(self.results_table)
        
        # Instrucciones
        instructions = QLabel("💡 Doble clic para agregar al carrito o presiona Enter")
        instructions.setFont(QFont("Segoe UI", 10))
        instructions.setStyleSheet(f"color: {COLORS['text_secondary']};")
        layout.addWidget(instructions)
        
        return panel
        
    def _create_cart_panel(self):
        """Crear panel del carrito"""
        panel = QFrame()
        panel.setStyleSheet(f"""
            QFrame {{
                background-color: {COLORS['bg_medium']};
                border-radius: 12px;
                border: 1px solid {COLORS['border']};
            }}
        """)
        
        layout = QVBoxLayout(panel)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(16)
        
        # Título y estado del turno
        header = QHBoxLayout()
        title = QLabel("🛒 Carrito de Venta")
        title.setFont(QFont("Segoe UI", 14, QFont.Weight.Bold))
        header.addWidget(title)
        
        header.addStretch()
        
        self.shift_label = QLabel("⚪ Sin turno activo")
        self.shift_label.setFont(QFont("Segoe UI", 10))
        self.shift_label.setStyleSheet(f"color: {COLORS['warning']};")
        header.addWidget(self.shift_label)
        
        layout.addLayout(header)
        
        # Tabla del carrito
        self.cart_table = QTableWidget()
        self.cart_table.setObjectName("cart-table")
        self.cart_table.setColumnCount(5)
        self.cart_table.setHorizontalHeaderLabels(["Producto", "Precio", "Cant.", "Subtotal", ""])
        self.cart_table.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeMode.Stretch)
        self.cart_table.setColumnWidth(1, 100)
        self.cart_table.setColumnWidth(2, 70)
        self.cart_table.setColumnWidth(3, 100)
        self.cart_table.setColumnWidth(4, 50)
        self.cart_table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        self.cart_table.setStyleSheet(f"""
            QTableWidget {{
                background-color: {COLORS['bg_light']};
                border: 1px solid {COLORS['border']};
                border-radius: 8px;
                font-size: 13px;
            }}
            QTableWidget::item {{
                padding: 10px;
            }}
        """)
        layout.addWidget(self.cart_table, 1)
        
        # Panel de totales
        totals_frame = QFrame()
        totals_frame.setStyleSheet(f"""
            QFrame {{
                background-color: {COLORS['bg_dark']};
                border-radius: 8px;
                padding: 16px;
            }}
        """)
        totals_layout = QVBoxLayout(totals_frame)
        
        # Subtotal
        subtotal_row = QHBoxLayout()
        subtotal_row.addWidget(QLabel("Subtotal:"))
        self.subtotal_label = QLabel("$0.00")
        self.subtotal_label.setFont(QFont("Segoe UI", 14))
        self.subtotal_label.setAlignment(Qt.AlignmentFlag.AlignRight)
        subtotal_row.addWidget(self.subtotal_label)
        totals_layout.addLayout(subtotal_row)
        
        # Artículos
        items_row = QHBoxLayout()
        items_row.addWidget(QLabel("Artículos:"))
        self.items_label = QLabel("0")
        self.items_label.setAlignment(Qt.AlignmentFlag.AlignRight)
        items_row.addWidget(self.items_label)
        totals_layout.addLayout(items_row)
        
        # Separador
        sep = QFrame()
        sep.setFixedHeight(1)
        sep.setStyleSheet(f"background-color: {COLORS['border']};")
        totals_layout.addWidget(sep)
        
        # Total
        total_row = QHBoxLayout()
        total_label = QLabel("TOTAL:")
        total_label.setFont(QFont("Segoe UI", 18, QFont.Weight.Bold))
        total_row.addWidget(total_label)
        
        self.total_label = QLabel("$0.00")
        self.total_label.setObjectName("total-display")
        self.total_label.setFont(QFont("Segoe UI", 28, QFont.Weight.Bold))
        self.total_label.setStyleSheet(f"color: {COLORS['success']};")
        self.total_label.setAlignment(Qt.AlignmentFlag.AlignRight)
        total_row.addWidget(self.total_label)
        totals_layout.addLayout(total_row)
        
        layout.addWidget(totals_frame)
        
        # Botones de acción
        buttons_layout = QHBoxLayout()
        buttons_layout.setSpacing(12)
        
        # Limpiar carrito
        btn_clear = QPushButton("🗑️ Limpiar")
        btn_clear.setFont(QFont("Segoe UI", 12))
        btn_clear.setMinimumHeight(50)
        btn_clear.setCursor(Qt.CursorShape.PointingHandCursor)
        btn_clear.setStyleSheet(f"""
            QPushButton {{
                background-color: {COLORS['bg_light']};
                color: {COLORS['text_primary']};
                border: 1px solid {COLORS['border']};
                border-radius: 8px;
            }}
            QPushButton:hover {{
                background-color: {COLORS['danger']};
                border-color: {COLORS['danger']};
            }}
        """)
        btn_clear.clicked.connect(self.clear_cart)
        buttons_layout.addWidget(btn_clear)
        
        # Cobrar
        self.btn_checkout = QPushButton("💰 COBRAR (F12)")
        self.btn_checkout.setObjectName("btn-cobrar")
        self.btn_checkout.setFont(QFont("Segoe UI", 16, QFont.Weight.Bold))
        self.btn_checkout.setMinimumHeight(60)
        self.btn_checkout.setCursor(Qt.CursorShape.PointingHandCursor)
        self.btn_checkout.setStyleSheet(f"""
            QPushButton {{
                background-color: {COLORS['success']};
                color: white;
                border: none;
                border-radius: 8px;
            }}
            QPushButton:hover {{
                background-color: {COLORS['success_hover']};
            }}
            QPushButton:disabled {{
                background-color: {COLORS['bg_light']};
                color: {COLORS['text_disabled']};
            }}
        """)
        self.btn_checkout.clicked.connect(self.checkout)
        buttons_layout.addWidget(self.btn_checkout, 2)
        
        layout.addLayout(buttons_layout)
        
        return panel
        
    def setup_shortcuts(self):
        """Configurar atajos de teclado"""
        # F12 para cobrar
        shortcut_checkout = QShortcut(QKeySequence("F12"), self)
        shortcut_checkout.activated.connect(self.checkout)
        
        # F5 para limpiar
        shortcut_clear = QShortcut(QKeySequence("F5"), self)
        shortcut_clear.activated.connect(self.clear_cart)
        
        # Escape para enfocar búsqueda
        shortcut_search = QShortcut(QKeySequence("Escape"), self)
        shortcut_search.activated.connect(lambda: self.search_input.setFocus())
        
    def check_shift(self):
        """Verificar si hay turno activo"""
        result = sales.get_current_shift()
        if result.get('success') and result.get('data'):
            self.current_shift = result['data']
            shift_id = self.current_shift.get('id', '')
            self.shift_label.setText(f"🟢 Turno #{shift_id} activo")
            self.shift_label.setStyleSheet(f"color: {COLORS['success']};")
        else:
            self.current_shift = None
            self.shift_label.setText("⚪ Sin turno activo")
            self.shift_label.setStyleSheet(f"color: {COLORS['warning']};")
            
    def _on_search_changed(self, text):
        """Buscar productos mientras se escribe"""
        if len(text) < 2:
            self.results_table.setRowCount(0)
            self.search_results = []
            return
            
        # Buscar productos
        result = products.search(text)
        if result.get('success'):
            self.search_results = result.get('data', [])
            self._update_results_table()
            
    def _update_results_table(self):
        """Actualizar tabla de resultados"""
        self.results_table.setRowCount(len(self.search_results))
        
        for row, product in enumerate(self.search_results):
            self.results_table.setItem(row, 0, QTableWidgetItem(product.get('code', '')))
            self.results_table.setItem(row, 1, QTableWidgetItem(product.get('name', '')))
            
            price = f"${product.get('public_price', 0):.2f}"
            self.results_table.setItem(row, 2, QTableWidgetItem(price))
            
            stock = str(product.get('stock', 0))
            self.results_table.setItem(row, 3, QTableWidgetItem(stock))
            
    def _on_search_enter(self):
        """Agregar producto al presionar Enter"""
        # Si hay exactamente un resultado, agregarlo
        if len(self.search_results) == 1:
            self.add_to_cart(self.search_results[0])
            self.search_input.clear()
        # Si hay un resultado seleccionado, agregarlo
        elif self.results_table.currentRow() >= 0:
            self._add_selected_to_cart()
            
    def _add_selected_to_cart(self):
        """Agregar producto seleccionado al carrito"""
        row = self.results_table.currentRow()
        if row >= 0 and row < len(self.search_results):
            self.add_to_cart(self.search_results[row])
            self.search_input.clear()
            self.search_input.setFocus()
            
    def add_to_cart(self, product, quantity=1):
        """Agregar producto al carrito"""
        from core.config_manager import config
        check_stock = config.get('sales.check_stock', True)
        allow_negative_stock = config.get('sales.allow_negative_stock', False)
        
        # Verificar stock
        if check_stock and not allow_negative_stock:
            if product.get('stock', 0) < quantity:
                QMessageBox.warning(self, "Sin Stock", 
                    f"El producto '{product.get('name')}' no tiene suficiente stock.")
                return
            
        # Verificar si ya está en el carrito
        for item in self.cart:
            if item['product']['id'] == product['id']:
                new_qty = item['quantity'] + quantity
                if check_stock and not allow_negative_stock:
                    if new_qty > product.get('stock', 0):
                        QMessageBox.warning(self, "Sin Stock", 
                            f"No hay suficiente stock para agregar más unidades.")
                        return
                item['quantity'] = new_qty
                item['subtotal'] = item['quantity'] * item['price']
                self._update_cart_table()
                return
                
        # Agregar nuevo item
        item = {
            'product': product,
            'quantity': quantity,
            'price': product.get('public_price', 0),
            'subtotal': quantity * product.get('public_price', 0)
        }
        self.cart.append(item)
        self._update_cart_table()
        
    def _update_cart_table(self):
        """Actualizar tabla del carrito"""
        self.cart_table.setRowCount(len(self.cart))
        
        total = 0
        total_items = 0
        
        for row, item in enumerate(self.cart):
            # Nombre del producto
            self.cart_table.setItem(row, 0, QTableWidgetItem(item['product'].get('name', '')))
            
            # Precio unitario
            price_item = QTableWidgetItem(f"${item['price']:.2f}")
            price_item.setTextAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
            self.cart_table.setItem(row, 1, price_item)
            
            # Cantidad
            qty_item = QTableWidgetItem(str(item['quantity']))
            qty_item.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
            self.cart_table.setItem(row, 2, qty_item)
            
            # Subtotal
            subtotal_item = QTableWidgetItem(f"${item['subtotal']:.2f}")
            subtotal_item.setTextAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
            self.cart_table.setItem(row, 3, subtotal_item)
            
            # Botón eliminar
            btn_delete = QPushButton("✕")
            btn_delete.setStyleSheet(f"""
                QPushButton {{
                    background-color: transparent;
                    color: {COLORS['danger']};
                    border: none;
                    font-size: 14px;
                }}
                QPushButton:hover {{
                    color: white;
                    background-color: {COLORS['danger']};
                }}
            """)
            btn_delete.clicked.connect(lambda checked, r=row: self.remove_from_cart(r))
            self.cart_table.setCellWidget(row, 4, btn_delete)
            
            total += item['subtotal']
            total_items += item['quantity']
            
        # Actualizar totales
        self.subtotal_label.setText(f"${total:.2f}")
        self.items_label.setText(str(total_items))
        self.total_label.setText(f"${total:.2f}")
        
    def remove_from_cart(self, row):
        """Eliminar item del carrito"""
        if 0 <= row < len(self.cart):
            del self.cart[row]
            self._update_cart_table()
            
    def clear_cart(self):
        """Limpiar carrito"""
        if self.cart:
            reply = QMessageBox.question(self, "Limpiar Carrito",
                "¿Estás seguro de que deseas vaciar el carrito?",
                QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
                QMessageBox.StandardButton.No)
                
            if reply == QMessageBox.StandardButton.Yes:
                self.cart = []
                self._update_cart_table()
                self.search_input.setFocus()
                
    def checkout(self):
        """Procesar venta"""
        if not self.cart:
            QMessageBox.information(self, "Carrito Vacío", 
                "Agrega productos al carrito para realizar una venta.")
            return
            
        # Verificar turno activo
        if not self.current_shift:
            reply = QMessageBox.question(self, "Sin Turno",
                "No hay un turno activo. ¿Deseas iniciar uno?",
                QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No)
                
            if reply == QMessageBox.StandardButton.Yes:
                self._start_shift_dialog()
            return
            
        # Mostrar diálogo de cobro
        dialog = CheckoutDialog(self.cart, self)
        if dialog.exec() == QDialog.DialogCode.Accepted:
            # Procesar venta
            sale_data = dialog.get_sale_data()
            sale_data['shift_id'] = self.current_shift.get('id')
            sale_data['items'] = [
                {
                    'product_id': item['product']['id'],
                    'quantity': item['quantity'],
                    'price': item['price'],
                    'subtotal': item['subtotal']
                }
                for item in self.cart
            ]
            
            result = sales.create(sale_data)
            
            if result.get('success'):
                QMessageBox.information(self, "Venta Exitosa",
                    f"Venta registrada correctamente.\nFolio: {result.get('data', {}).get('folio', 'N/A')}")
                self.cart = []
                self._update_cart_table()
                self.search_input.setFocus()
            else:
                QMessageBox.critical(self, "Error", 
                    f"No se pudo completar la venta:\n{result.get('error', 'Error desconocido')}")
                    
    def _start_shift_dialog(self):
        """Mostrar diálogo para iniciar turno"""
        from PyQt6.QtWidgets import QInputDialog
        
        amount, ok = QInputDialog.getDouble(self, "Iniciar Turno",
            "Ingresa el fondo inicial de caja:", 0, 0, 100000, 2)
            
        if ok:
            result = sales.start_shift(amount)
            if result.get('success'):
                self.check_shift()
                QMessageBox.information(self, "Turno Iniciado",
                    "El turno ha sido iniciado correctamente.")
            else:
                QMessageBox.critical(self, "Error",
                    f"No se pudo iniciar el turno:\n{result.get('error')}")
                    
    def on_activated(self):
        """Llamado cuando el módulo es activado"""
        self.check_shift()
        self.search_input.setFocus()


class CheckoutDialog(QDialog):
    """Diálogo de cobro"""
    
    def __init__(self, cart, parent=None):
        super().__init__(parent)
        self.cart = cart
        self.total = sum(item['subtotal'] for item in cart)
        
        self.setup_ui()
        
    def setup_ui(self):
        """Configurar interfaz del diálogo"""
        self.setWindowTitle("Cobrar Venta")
        self.setFixedSize(450, 400)
        self.setStyleSheet(f"""
            QDialog {{
                background-color: {COLORS['bg_medium']};
            }}
        """)
        
        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(16)
        
        # Total a cobrar
        total_label = QLabel(f"Total a cobrar: ${self.total:.2f}")
        total_label.setFont(QFont("Segoe UI", 20, QFont.Weight.Bold))
        total_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        total_label.setStyleSheet(f"color: {COLORS['success']}; padding: 16px;")
        layout.addWidget(total_label)
        
        # Método de pago
        payment_group = QGroupBox("Método de Pago")
        payment_layout = QVBoxLayout(payment_group)
        
        self.payment_combo = QComboBox()
        self.payment_combo.addItems(["Efectivo", "Tarjeta", "Transferencia", "Crédito"])
        self.payment_combo.setFont(QFont("Segoe UI", 12))
        self.payment_combo.currentTextChanged.connect(self._on_payment_changed)
        payment_layout.addWidget(self.payment_combo)
        
        layout.addWidget(payment_group)
        
        # Monto recibido (solo para efectivo)
        self.cash_group = QGroupBox("Efectivo Recibido")
        cash_layout = QVBoxLayout(self.cash_group)
        
        self.cash_input = QDoubleSpinBox()
        self.cash_input.setRange(0, 999999)
        self.cash_input.setDecimals(2)
        self.cash_input.setPrefix("$ ")
        self.cash_input.setFont(QFont("Segoe UI", 16))
        self.cash_input.setMinimumHeight(50)
        self.cash_input.setValue(self.total)
        self.cash_input.valueChanged.connect(self._update_change)
        cash_layout.addWidget(self.cash_input)
        
        # Cambio
        change_layout = QHBoxLayout()
        change_layout.addWidget(QLabel("Cambio:"))
        self.change_label = QLabel("$0.00")
        self.change_label.setFont(QFont("Segoe UI", 16, QFont.Weight.Bold))
        self.change_label.setAlignment(Qt.AlignmentFlag.AlignRight)
        change_layout.addWidget(self.change_label)
        cash_layout.addLayout(change_layout)
        
        layout.addWidget(self.cash_group)
        
        layout.addStretch()
        
        # Botones
        buttons = QDialogButtonBox(
            QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel
        )
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)
        buttons.button(QDialogButtonBox.StandardButton.Ok).setText("💰 Cobrar")
        buttons.button(QDialogButtonBox.StandardButton.Cancel).setText("Cancelar")
        layout.addWidget(buttons)
        
        self._update_change()
        
    def _on_payment_changed(self, method):
        """Manejar cambio de método de pago"""
        self.cash_group.setVisible(method == "Efectivo")
        
    def _update_change(self):
        """Actualizar cambio"""
        received = self.cash_input.value()
        change = received - self.total
        
        if change >= 0:
            self.change_label.setText(f"${change:.2f}")
            self.change_label.setStyleSheet(f"color: {COLORS['success']};")
        else:
            self.change_label.setText(f"-${abs(change):.2f}")
            self.change_label.setStyleSheet(f"color: {COLORS['danger']};")
            
    def get_sale_data(self):
        """Obtener datos de la venta"""
        payment_method = self.payment_combo.currentText().lower()
        return {
            'total': self.total,
            'payment_method': payment_method,
            'amount_received': self.cash_input.value() if payment_method == 'efectivo' else self.total,
            'change': max(0, self.cash_input.value() - self.total) if payment_method == 'efectivo' else 0
        }
