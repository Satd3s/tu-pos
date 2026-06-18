import sqlite3
import json
import traceback
import hashlib
from database import get_db_connection

def hash_password(password):
    """Hashear contraseña usando SHA256"""
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def verify_password(password, hashed):
    """Verificar contraseña contra hash almacenado"""
    return hash_password(password) == hashed

def get_all():
    """Obtener todos los usuarios"""
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, username, role, full_name, active, permissions, created_at FROM users ORDER BY username")
            users = [dict(row) for row in cursor.fetchall()]
            
            # Parsear permisos JSON para cada usuario
            for u in users:
                if u.get('permissions') and isinstance(u['permissions'], str):
                    try:
                        u['permissions'] = json.loads(u['permissions'])
                    except:
                        u['permissions'] = {}
            
            return {'success': True, 'data': users}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def save(user_data):
    """Crear o actualizar usuario"""
    if not user_data.get('username') or not user_data.get('role'):
        return {'success': False, 'error': 'Usuario y Rol requeridos'}
    
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            user_id = user_data.get('id')
            
            # Procesar permisos (dict -> json string)
            permissions = user_data.get('permissions', {})
            if isinstance(permissions, dict):
                permissions = json.dumps(permissions)
            
            if user_id:
                # Update
                params = [user_data['username'], user_data['role'], user_data.get('full_name'), user_data.get('active', 1), permissions]
                password_query = ""
                
                if user_data.get('password'):
                    password_query = ", password = ?"
                    params.append(hash_password(user_data['password']))
                
                params.append(user_id)  # WHERE id
                
                sql = f'''
                    UPDATE users 
                    SET username = ?, role = ?, full_name = ?, active = ?, permissions = ? {password_query}
                    WHERE id = ?
                '''
                cursor.execute(sql, params)
            else:
                # Insert
                if not user_data.get('password'):
                    return {'success': False, 'error': 'Contraseña requerida para nuevos usuarios'}
                
                cursor.execute('''
                    INSERT INTO users (username, password, role, full_name, active, permissions)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (user_data['username'], hash_password(user_data['password']), user_data['role'], user_data.get('full_name'), 1, permissions))
                user_id = cursor.lastrowid
                
            conn.commit()
            return {'success': True, 'id': user_id}
            
    except sqlite3.IntegrityError:
        return {'success': False, 'error': 'El nombre de usuario ya existe'}
    except Exception as e:
        print(traceback.format_exc())
        return {'success': False, 'error': str(e)}

def delete(user_id):
    """Eliminar usuario"""
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            # No permitir borrar admin principal (id 1 o username admin)
            cursor.execute("SELECT username FROM users WHERE id = ?", (user_id,))
            user = cursor.fetchone()
            if user and user['username'] == 'admin':
                return {'success': False, 'error': 'No se puede eliminar el superadministrador'}
                
            cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
            conn.commit()
            return {'success': True}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def login(username, password):
    """Autenticar usuario"""
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE username = ? AND active = 1", (username,))
            user = cursor.fetchone()
            
            if user and verify_password(password, user['password']):
                user_dict = dict(user)
                del user_dict['password'] # No devolver password
                
                # Parsear permisos
                if user_dict.get('permissions') and isinstance(user_dict['permissions'], str):
                    try:
                        user_dict['permissions'] = json.loads(user_dict['permissions'])
                    except:
                        user_dict['permissions'] = {}
                        
                return {'success': True, 'user': user_dict}
            else:
                return {'success': False, 'error': 'Credenciales inválidas'}
    except Exception as e:
        return {'success': False, 'error': str(e)}
