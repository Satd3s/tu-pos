# =============================================================================
# ESTILOS - Sistema de Temas Dinámicos (Dark & Light)
# =============================================================================

# Definición de Paletas
PALETTES = {
    'dark': {
        'bg_app': '#1F1F1F',
        'bg_panel': '#2D2D2D',
        'bg_content': '#2D2D2D',
        'bg_input': '#383838',
        'bg_hover': '#404040',
        
        'text_primary': '#FFFFFF',
        'text_secondary': '#B3B3B3',
        'text_disabled': '#6E6E6E',
        
        'border': '#454545',
        'border_focus': '#0078D4',
        
        'primary': '#0078D4',
        'primary_hover': '#1084D8',
        'primary_pressed': '#006CC1',
        'primary_text': '#FFFFFF',
        
        'success': '#107C10',
        'success_hover': '#0E6B0E',
        'danger': '#D13438',
        'danger_hover': '#A82C2E',
        
        'sidebar_bg': '#1A1A1A',
        'sidebar_hover': '#333333',
        'sidebar_active': '#0078D4',
        'sidebar_text': '#CCCCCC',
        'sidebar_text_active': '#FFFFFF',
        
        # Claves de compatibilidad
        'bg_medium': '#2D2D2D',
        'bg_dark': '#1A1A1A',
        'bg_light': '#383838',
        'sidebar_item_hover': '#333333',
        'warning': '#F59E0B',
    },
    'light': {
        'bg_app': '#F3F3F3',
        'bg_panel': '#FFFFFF',
        'bg_content': '#FFFFFF',
        'bg_input': '#FFFFFF',
        'bg_hover': '#E1EDF7',
        
        'text_primary': '#202020',
        'text_secondary': '#606060',
        'text_disabled': '#A0A0A0',
        
        'border': '#D1D1D1',
        'border_focus': '#005FB8',
        
        'primary': '#005FB8',
        'primary_hover': '#004C94',
        'primary_pressed': '#003970',
        'primary_text': '#FFFFFF',
        
        'success': '#107C10',
        'success_hover': '#0B5A0B',
        'danger': '#C50F1F',
        'danger_hover': '#A80000',
        
        'sidebar_bg': '#FFFFFF',
        'sidebar_hover': '#DAECF9',
        'sidebar_active': '#C9E0F5',
        'sidebar_text': '#444444',
        'sidebar_text_active': '#005FB8',
        
        # Claves de compatibilidad
        'bg_medium': '#F3F3F3',
        'bg_dark': '#E5E5E5',
        'bg_light': '#FFFFFF',
        'sidebar_item_hover': '#DAECF9',
        'warning': '#B7791F',
    }
}

# Variable global para el tema actual
CURRENT_THEME = 'dark'  # Default
COLORS = PALETTES[CURRENT_THEME]

def set_theme(theme_name):
    """Cambiar el tema actual"""
    global COLORS, CURRENT_THEME
    if theme_name in PALETTES:
        CURRENT_THEME = theme_name
        COLORS = PALETTES[theme_name]

def get_stylesheet(theme_name=None):
    """Generar hoja de estilos para el tema solicitado"""
    theme = PALETTES.get(theme_name or CURRENT_THEME, PALETTES['dark'])
    
    return f"""
    /* ============================================
       ESTILOS DINÁMICOS ({theme_name or CURRENT_THEME})
       ============================================ */
    
    QMainWindow, QDialog {{
        background-color: {theme['bg_app']};
        color: {theme['text_primary']};
    }}

    QWidget {{
        font-family: 'Segoe UI', Arial, sans-serif;
        font-size: 14px;
        color: {theme['text_primary']};
    }}

    /* === BOTONES === */
    QPushButton {{
        background-color: {theme['bg_panel']};
        color: {theme['text_primary']};
        border: 1px solid {theme['border']};
        border-radius: 4px;
        padding: 6px 16px;
        min-height: 28px;
    }}

    QPushButton:hover {{
        background-color: {theme['bg_hover']};
        border-color: {theme['border_focus']};
    }}

    /* Botón Primario */
    QPushButton[class="primary"] {{
        background-color: {theme['primary']};
        color: {theme['primary_text']};
        border: 1px solid {theme['primary']};
    }}
    QPushButton[class="primary"]:hover {{
        background-color: {theme['primary_hover']};
    }}

    /* Botón Success */
    QPushButton[class="success"] {{
        background-color: {theme['success']};
        color: white;
        border-color: {theme['success']};
    }}
    QPushButton[class="success"]:hover {{
        background-color: {theme['success_hover']};
    }}
    
    /* Botón Danger */
    QPushButton[class="danger"] {{
        background-color: transparent;
        color: {theme['danger']};
        border: 1px solid {theme['border']};
    }}
    QPushButton[class="danger"]:hover {{
        background-color: {theme['danger']};
        color: white;
        border-color: {theme['danger']};
    }}

    /* === INPUTS === */
    QLineEdit, QSpinBox, QDoubleSpinBox, QComboBox, QDateEdit, QTextEdit {{
        background-color: {theme['bg_input']};
        color: {theme['text_primary']};
        border: 1px solid {theme['border']};
        border-radius: 4px;
        padding: 6px;
        selection-background-color: {theme['primary']};
    }}

    QLineEdit:focus, QSpinBox:focus, QComboBox:focus {{
        border: 2px solid {theme['border_focus']};
        padding: 5px;
    }}
    
    QLineEdit::placeholder {{
        color: {theme['text_disabled']};
    }}

    /* === TABLAS === */
    QTableWidget {{
        background-color: {theme['bg_content']};
        alternate-background-color: {theme['bg_app']};
        color: {theme['text_primary']};
        border: 1px solid {theme['border']};
        gridline-color: {theme['border']};
        selection-background-color: {theme['primary']};
        selection-color: {theme['primary_text']};
    }}

    QHeaderView::section {{
        background-color: {theme['bg_app']};
        color: {theme['text_primary']};
        padding: 6px;
        border: none;
        border-bottom: 2px solid {theme['border']};
        font-weight: bold;
    }}
    
    QTableWidget::item {{
        padding: 4px;
    }}
    
    QCornerButton::section {{
        background-color: {theme['bg_app']};
    }}

    /* === PANELES Y CARDS === */
    QFrame[class="card"] {{
        background-color: {theme['bg_panel']};
        border: 1px solid {theme['border']};
        border-radius: 8px;
    }}
    
    QFrame[class="sidebar"] {{
        background-color: {theme['sidebar_bg']};
        border-right: 1px solid {theme['border']};
    }}
    
    /* === SCROLLBARS === */
    QScrollBar:vertical {{
        background-color: {theme['bg_app']};
        width: 12px;
    }}
    QScrollBar::handle:vertical {{
        background-color: {theme['border']};
        min-height: 20px;
        border-radius: 6px;
        margin: 2px;
    }}
    QScrollBar::handle:vertical:hover {{
        background-color: {theme['text_disabled']};
    }}
    
    /* === SIDEBAR BUTTONS === */
    QPushButton[class="sidebar-item"] {{
        background-color: transparent;
        color: {theme['sidebar_text']};
        text-align: left;
        border: none;
        padding: 12px 16px;
        margin: 2px 8px;
        border-radius: 6px;
    }}
    
    QPushButton[class="sidebar-item"]:hover {{
        background-color: {theme['sidebar_hover']};
        color: {theme['text_primary']};
    }}
    
    QPushButton[class="sidebar-item"]:checked {{
        background-color: {theme['sidebar_active']};
        color: {theme['sidebar_text_active']};
        font-weight: bold;
    }}

    /* === TOOLTIPS === */
    QToolTip {{
        color: {theme['text_primary']};
        background-color: {theme['bg_panel']};
        border: 1px solid {theme['border']};
    }}
    """
