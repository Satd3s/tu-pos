# =============================================================================
# VENTANA DE LOGIN - Acceso al sistema
# =============================================================================

from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, 
    QLineEdit, QPushButton, QFrame, QMessageBox,
    QGraphicsDropShadowEffect
)
from PyQt6.QtCore import Qt, pyqtSignal, QPropertyAnimation, QEasingCurve
from PyQt6.QtGui import QFont, QIcon, QPixmap, QColor

from .styles import COLORS

class LoginWindow(QWidget):
    """Ventana de inicio de sesión"""
    
    # Señal emitida cuando el login es exitoso
    login_successful = pyqtSignal(dict)
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setup_ui()
        
    def setup_ui(self):
        """Configurar interfaz de usuario"""
        self.setWindowTitle("Tu POS - Iniciar Sesión")
        self.setFixedSize(400, 500)
        self.setWindowFlags(Qt.WindowType.FramelessWindowHint)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        
        # Layout principal
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(0, 0, 0, 0)
        
        # Card container con sombra
        self.card = QFrame()
        self.card.setObjectName("login-card")
        self.card.setStyleSheet(f"""
            QFrame#login-card {{
                background-color: {COLORS['bg_panel']};
                border-radius: 16px;
                border: 1px solid {COLORS['border']};
            }}
        """)
        
        # Sombra
        shadow = QGraphicsDropShadowEffect()
        shadow.setBlurRadius(30)
        shadow.setXOffset(0)
        shadow.setYOffset(10)
        shadow.setColor(QColor(0, 0, 0, 80))
        self.card.setGraphicsEffect(shadow)
        
        card_layout = QVBoxLayout(self.card)
        card_layout.setContentsMargins(40, 40, 40, 40)
        card_layout.setSpacing(20)
        
        # Espaciador superior para mantener alineación limpia y discreta
        card_layout.addSpacing(15)
        
        # Logo/Icono
        logo_container = QHBoxLayout()
        logo_container.addStretch()
        
        logo_label = QLabel("🏪")
        logo_label.setFont(QFont("Segoe UI Emoji", 48))
        logo_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        logo_container.addWidget(logo_label)
        logo_container.addStretch()
        card_layout.addLayout(logo_container)
        
        # Título
        title = QLabel("Tu POS")
        title.setFont(QFont("Segoe UI", 28, QFont.Weight.Bold))
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        title.setStyleSheet(f"color: {COLORS['text_primary']};")
        card_layout.addWidget(title)
        
        # Subtítulo
        subtitle = QLabel("Sistema de Punto de Venta")
        subtitle.setFont(QFont("Segoe UI", 12))
        subtitle.setAlignment(Qt.AlignmentFlag.AlignCenter)
        subtitle.setStyleSheet(f"color: {COLORS['text_secondary']};")
        card_layout.addWidget(subtitle)
        
        card_layout.addSpacing(20)
        
        # Campo de usuario
        self.username_input = QLineEdit()
        self.username_input.setPlaceholderText("👤  Usuario")
        self.username_input.setFont(QFont("Segoe UI", 12))
        self.username_input.setMinimumHeight(48)
        self.username_input.setStyleSheet(self._get_input_style())
        card_layout.addWidget(self.username_input)
        
        # Campo de contraseña
        self.password_input = QLineEdit()
        self.password_input.setPlaceholderText("🔒  Contraseña")
        self.password_input.setEchoMode(QLineEdit.EchoMode.Password)
        self.password_input.setFont(QFont("Segoe UI", 12))
        self.password_input.setMinimumHeight(48)
        self.password_input.setStyleSheet(self._get_input_style())
        self.password_input.returnPressed.connect(self.attempt_login)
        card_layout.addWidget(self.password_input)
        
        card_layout.addSpacing(10)
        
        # Botón de login
        self.btn_login = QPushButton("Iniciar Sesión")
        self.btn_login.setFont(QFont("Segoe UI", 13, QFont.Weight.Bold))
        self.btn_login.setMinimumHeight(50)
        self.btn_login.setCursor(Qt.CursorShape.PointingHandCursor)
        self.btn_login.setStyleSheet(f"""
            QPushButton {{
                background-color: {COLORS['primary']};
                color: {COLORS['primary_text']};
                border: none;
                border-radius: 8px;
            }}
            QPushButton:hover {{
                background-color: {COLORS['primary_hover']};
            }}
            QPushButton:pressed {{
                background-color: {COLORS['primary_pressed']};
            }}
        """)
        self.btn_login.clicked.connect(self.attempt_login)
        card_layout.addWidget(self.btn_login)
        
        # Mensaje de error (oculto inicialmente)
        self.error_label = QLabel("")
        self.error_label.setFont(QFont("Segoe UI", 10))
        self.error_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.error_label.setStyleSheet(f"color: {COLORS['danger']}; padding: 8px;")
        self.error_label.hide()
        card_layout.addWidget(self.error_label)
        
        card_layout.addStretch()
        
        # Versión
        version = QLabel("v1.0.0")
        version.setFont(QFont("Segoe UI", 9))
        version.setAlignment(Qt.AlignmentFlag.AlignCenter)
        version.setStyleSheet(f"color: {COLORS['text_disabled']};")
        card_layout.addWidget(version)
        
        main_layout.addWidget(self.card)
        
        # Focus inicial
        self.username_input.setFocus()
        
    def _get_input_style(self):
        """Estilo para inputs del login"""
        return f"""
            QLineEdit {{
                background-color: {COLORS['bg_input']};
                color: {COLORS['text_primary']};
                border: 2px solid {COLORS['border']};
                border-radius: 8px;
                padding: 0 16px;
            }}
            QLineEdit:focus {{
                border-color: {COLORS['border_focus']};
            }}
            QLineEdit::placeholder {{
                color: {COLORS['text_disabled']};
            }}
        """
        
    def attempt_login(self):
        """Intentar iniciar sesión"""
        username = self.username_input.text().strip()
        password = self.password_input.text()
        
        if not username:
            self.show_error("Ingresa tu nombre de usuario")
            self.username_input.setFocus()
            return
            
        if not password:
            self.show_error("Ingresa tu contraseña")
            self.password_input.setFocus()
            return
        
        # Validar credenciales con la API
        try:
            from api import users
            result = users.login(username, password)
            
            if result.get('success'):
                user_data = result.get('user', {})
                self.login_successful.emit(user_data)
                self.close()
            else:
                self.show_error(result.get('error', 'Credenciales incorrectas'))
                self.password_input.clear()
                self.password_input.setFocus()
        except Exception as e:
            self.show_error(f"Error de conexión: {str(e)}")
            
    def show_error(self, message):
        """Mostrar mensaje de error"""
        self.error_label.setText(message)
        self.error_label.show()
        
        # Efecto de shake en el card
        self._shake_animation()
        
    def _shake_animation(self):
        """Animación de sacudida para errores"""
        original_pos = self.card.pos()
        
        animation = QPropertyAnimation(self.card, b"pos")
        animation.setDuration(500)
        animation.setEasingCurve(QEasingCurve.Type.OutBounce)
        
        # Keyframes: izq, der, izq, centro
        animation.setKeyValueAt(0, original_pos)
        animation.setKeyValueAt(0.1, original_pos + type(original_pos)(10, 0))
        animation.setKeyValueAt(0.2, original_pos + type(original_pos)(-10, 0))
        animation.setKeyValueAt(0.3, original_pos + type(original_pos)(8, 0))
        animation.setKeyValueAt(0.4, original_pos + type(original_pos)(-8, 0))
        animation.setKeyValueAt(0.5, original_pos + type(original_pos)(5, 0))
        animation.setKeyValueAt(0.6, original_pos + type(original_pos)(-5, 0))
        animation.setKeyValueAt(1, original_pos)
        
        animation.start()
        
    def mousePressEvent(self, event):
        """Permitir arrastrar la ventana"""
        if event.button() == Qt.MouseButton.LeftButton:
            self._drag_pos = event.globalPosition().toPoint() - self.frameGeometry().topLeft()
            event.accept()
            
    def mouseMoveEvent(self, event):
        """Mover ventana al arrastrar"""
        if event.buttons() == Qt.MouseButton.LeftButton and hasattr(self, '_drag_pos'):
            self.move(event.globalPosition().toPoint() - self._drag_pos)
            event.accept()

    def keyPressEvent(self, event):
        """Cerrar la ventana de login al presionar la tecla Escape"""
        if event.key() == Qt.Key.Key_Escape:
            self.close()
        else:
            super().keyPressEvent(event)
