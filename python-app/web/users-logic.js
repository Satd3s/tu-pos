/* ==========================================================================
   GESTIÓN DE USUARIOS
   ========================================================================== */

let currentUsers = [];

// Módulos disponibles para permisos
const SYSTEM_MODULES = [
    { id: 'inventory_view', name: 'Inventario (Ver)', role: 'all' },
    { id: 'inventory_edit', name: 'Inventario (Editar/Crear)', role: 'supervisor' },
    { id: 'pos_access', name: 'Punto de Venta (Caja)', role: 'cashier' },
    { id: 'customers_view', name: 'Clientes (Ver/Editar)', role: 'cashier' },
    { id: 'movements_view', name: 'Ver Movimientos', role: 'supervisor' },
    { id: 'movements_create', name: 'Registrar Movimientos', role: 'supervisor' },
    { id: 'suppliers_view', name: 'Proveedores (Ver)', role: 'supervisor' },
    { id: 'suppliers_edit', name: 'Proveedores (Editar)', role: 'supervisor' },
    { id: 'reports_view', name: 'Reportes y Finanzas', role: 'admin' },
    { id: 'settings_access', name: 'Ajustes del Sistema', role: 'admin' },
    { id: 'users_manage', name: 'Gestión de Usuarios', role: 'admin' }
];

window.loadUsers = async function () {
    try {
        // Asegurarse de que eel está listo
        if (typeof eel === 'undefined') return;

        const result = await eel.get_users()();
        if (result.success) {
            currentUsers = result.data;
            renderUsersTable(currentUsers);
        } else {
            console.error(result.error);
            showNotification('Error al cargar usuarios', 'error');
        }
    } catch (e) {
        console.error("Error cargando usuarios:", e);
    }
}

function renderUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    users.forEach(user => {
        const tr = document.createElement('tr');

        let roleLabel = user.role;
        if (roleLabel === 'admin') roleLabel = 'Administrador';
        if (roleLabel === 'supervisor') roleLabel = 'Supervisor';
        if (roleLabel === 'cashier') roleLabel = 'Cajero';

        const statusClass = user.active ? 'tag-success' : 'tag-danger';
        const statusText = user.active ? 'Activo' : 'Inactivo';

        // Escapar comillas para el JSON
        const userJson = JSON.stringify(user).replace(/'/g, "&apos;").replace(/"/g, "&quot;");

        tr.innerHTML = `
            <td><strong>${user.username}</strong></td>
            <td><span class="badge badge-info">${roleLabel}</span></td>
            <td>${user.full_name || '-'}</td>
            <td><span class="tag ${statusClass}">${statusText}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon" onclick='editUser(${userJson})' title="Editar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    ${user.username !== 'admin' ? `
                    <button class="btn-icon danger" onclick="deleteUser(${user.id})" title="Eliminar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path></svg>
                    </button>` : ''}
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.openUserModal = function () {
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';
    document.getElementById('userModalTitle').textContent = 'Nuevo Usuario';
    document.getElementById('userUsername').readOnly = false;
    document.getElementById('userRole').value = 'cashier';
    document.getElementById('userActive').checked = true;

    renderPermissionsCheckboxes({});
    // Preseleccionar permisos por defecto para cajero
    updatePermissionsUI();

    openModal('userModal');
}

window.editUser = function (user) {
    document.getElementById('userId').value = user.id;
    document.getElementById('userModalTitle').textContent = 'Editar Usuario';
    document.getElementById('userUsername').value = user.username;
    // Opcional: readOnly username
    document.getElementById('userPassword').value = '';
    document.getElementById('userFullName').value = user.full_name || '';
    document.getElementById('userRole').value = user.role;
    document.getElementById('userActive').checked = user.active == 1;
    document.getElementById('userPin').value = user.pin || '';

    renderPermissionsCheckboxes(user.permissions || {});
    openModal('userModal');
}

function renderPermissionsCheckboxes(userPermissions) {
    const container = document.getElementById('permissionsContainer');
    if (!container) return;
    container.innerHTML = '';

    SYSTEM_MODULES.forEach(mod => {
        const isChecked = userPermissions[mod.id] === true;

        const div = document.createElement('div');
        div.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 5px;';

        div.innerHTML = `
            <input type="checkbox" id="perm_${mod.id}" ${isChecked ? 'checked' : ''}>
            <label for="perm_${mod.id}" style="cursor:pointer; user-select:none; font-size:0.9rem; color: var(--gray-300);">${mod.name}</label>
        `;
        container.appendChild(div);
    });
}

window.updatePermissionsUI = function () {
    const role = document.getElementById('userRole').value;
    const isNew = document.getElementById('userId').value === '';

    if (!isNew) return; // No modificar si editamos un usuario existente

    SYSTEM_MODULES.forEach(mod => {
        let active = false;
        if (role === 'admin') active = true;
        else if (role === 'supervisor' && (mod.role === 'supervisor' || mod.role === 'cashier' || mod.role === 'all')) active = true;
        else if (role === 'cashier' && (mod.role === 'cashier' || mod.role === 'all')) active = true;

        const checkbox = document.getElementById(`perm_${mod.id}`);
        if (checkbox) checkbox.checked = active;
    });
}

window.saveUser = async function () {
    const id = document.getElementById('userId').value;
    const username = document.getElementById('userUsername').value.trim();
    const password = document.getElementById('userPassword').value;
    const fullName = document.getElementById('userFullName').value.trim();
    const role = document.getElementById('userRole').value;
    const active = document.getElementById('userActive').checked ? 1 : 0;
    const pin = document.getElementById('userPin').value.trim();

    if (!username || !role) {
        showNotification('Usuario y Rol son obligatorios', 'error');
        return;
    }

    if (!id && !password) {
        showNotification('La contraseña es obligatoria para nuevos usuarios', 'error');
        return;
    }

    const permissions = {};
    SYSTEM_MODULES.forEach(mod => {
        const cb = document.getElementById(`perm_${mod.id}`);
        if (cb) permissions[mod.id] = cb.checked;
    });

    const userData = {
        id: id ? parseInt(id) : null,
        username,
        role,
        full_name: fullName,
        active,
        permissions,
        pin: pin || undefined
    };

    if (password) userData.password = password;

    try {
        const result = await eel.save_user(userData)();
        if (result.success) {
            showNotification('Usuario guardado correctamente', 'success');
            closeModal('userModal');
            loadUsers();
        } else {
            showNotification(result.error, 'error');
        }
    } catch (e) {
        showNotification('Error guardando usuario: ' + e, 'error');
    }
}

window.deleteUser = async function (id) {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    try {
        const result = await eel.delete_user(id)();
        if (result.success) {
            showNotification('Usuario eliminado', 'success');
            loadUsers();
        } else {
            showNotification(result.error, 'error');
        }
    } catch (e) {
        showNotification('Error eliminando usuario: ' + e, 'error');
    }
}
