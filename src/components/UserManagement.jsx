import { useState, useEffect } from 'react'

export default function UserManagement({ showToast }) {
    const [users, setUsers] = useState([])
    const [roles, setRoles] = useState([])
    const [loading, setLoading] = useState(true)
    const [editingUser, setEditingUser] = useState(null)
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({ name: '', pin: '', role_id: '' })
    const [saving, setSaving] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState(null)

    // Role management state
    const [showRoleForm, setShowRoleForm] = useState(false)
    const [editingRole, setEditingRole] = useState(null)
    const [roleName, setRoleName] = useState('')
    const [savingRole, setSavingRole] = useState(false)
    const [deleteRoleConfirm, setDeleteRoleConfirm] = useState(null)

    const fetchRoles = async () => {
        try {
            const res = await fetch('/api/roles')
            const json = await res.json()
            if (json.success) setRoles(json.data || [])
        } catch (e) {
            console.error('Failed to fetch roles:', e)
        }
    }

    const fetchUsers = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/users')
            const json = await res.json()
            if (json.success) setUsers(json.data || [])
        } catch (e) {
            console.error('Failed to fetch users:', e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchRoles().then(() => fetchUsers())
    }, [])

    // --- User CRUD ---
    const openAdd = () => {
        setEditingUser(null)
        const defaultRole = roles.find(r => !r.is_admin) || roles[0]
        setForm({ name: '', pin: '', role_id: defaultRole ? defaultRole.id : '' })
        setShowForm(true)
    }

    const openEdit = (user) => {
        setEditingUser(user)
        setForm({ name: user.name, pin: user.pin, role_id: user.role_id })
        setShowForm(true)
    }

    const closeForm = () => {
        setShowForm(false)
        setEditingUser(null)
        setForm({ name: '', pin: '', role_id: '' })
    }

    const handleSave = async () => {
        if (!form.name.trim() || !form.pin.trim()) {
            showToast('Name and PIN are required', 'error')
            return
        }
        if (form.pin.length !== 4 || !/^\d{4}$/.test(form.pin)) {
            showToast('PIN must be exactly 4 digits', 'error')
            return
        }
        if (!form.role_id) {
            showToast('Please select a role', 'error')
            return
        }
        setSaving(true)
        try {
            const method = editingUser ? 'PUT' : 'POST'
            const body = editingUser ? { ...form, id: editingUser.id } : form
            const res = await fetch('/api/users', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            const json = await res.json()
            if (json.success) {
                showToast(editingUser ? 'User updated' : 'User added')
                closeForm()
                fetchUsers()
            } else {
                showToast(json.error || 'Failed to save', 'error')
            }
        } catch (e) {
            showToast('Network error', 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id) => {
        try {
            const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' })
            const json = await res.json()
            if (json.success) {
                showToast('User deleted')
                setDeleteConfirm(null)
                fetchUsers()
            } else {
                showToast(json.error || 'Failed to delete', 'error')
            }
        } catch (e) {
            showToast('Network error', 'error')
        }
    }

    // --- Role CRUD ---
    const openAddRole = () => {
        setEditingRole(null)
        setRoleName('')
        setShowRoleForm(true)
    }

    const openEditRole = (role) => {
        setEditingRole(role)
        setRoleName(role.name)
        setShowRoleForm(true)
    }

    const closeRoleForm = () => {
        setShowRoleForm(false)
        setEditingRole(null)
        setRoleName('')
    }

    const handleSaveRole = async () => {
        if (!roleName.trim()) {
            showToast('Role name is required', 'error')
            return
        }
        setSavingRole(true)
        try {
            const method = editingRole ? 'PUT' : 'POST'
            const body = editingRole ? { id: editingRole.id, name: roleName.trim() } : { name: roleName.trim() }
            const res = await fetch('/api/roles', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            const json = await res.json()
            if (json.success) {
                showToast(editingRole ? 'Role updated' : 'Role created')
                closeRoleForm()
                fetchRoles()
                fetchUsers() // refresh user role names
            } else {
                showToast(json.error || 'Failed to save role', 'error')
            }
        } catch (e) {
            showToast('Network error', 'error')
        } finally {
            setSavingRole(false)
        }
    }

    const handleDeleteRole = async (id) => {
        try {
            const res = await fetch(`/api/roles?id=${id}`, { method: 'DELETE' })
            const json = await res.json()
            if (json.success) {
                showToast('Role deleted')
                setDeleteRoleConfirm(null)
                fetchRoles()
            } else {
                showToast(json.error || 'Failed to delete role', 'error')
            }
        } catch (e) {
            showToast('Network error', 'error')
        }
    }

    // Group users by role
    const groupedUsers = roles.map(role => ({
        ...role,
        users: users.filter(u => u.role_id === role.id)
    }))

    return (
        <div>
            {/* Roles Management Section */}
            <div className="card">
                <div className="card__header">
                    <div className="card__icon card__icon--orange">🏷️</div>
                    <div style={{ flex: 1 }}>
                        <div className="card__title">Roles</div>
                        <div className="card__subtitle">Manage user roles — users in the same role can view each other's deployments</div>
                    </div>
                    <button className="btn btn--primary btn--sm" onClick={openAddRole}>
                        ➕ Add Role
                    </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {roles.map(role => (
                        <div key={role.id} style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '8px 12px', background: 'var(--bg-input)',
                            border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                        }}>
                            <span style={{ fontSize: 16 }}>{role.is_admin ? '👑' : '🏷️'}</span>
                            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{role.name}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '1px 6px', borderRadius: 'var(--radius-sm)' }}>
                                {users.filter(u => u.role_id === role.id).length} user(s)
                            </span>
                            {!role.is_admin && (
                                <div style={{ display: 'flex', gap: 4, marginLeft: 4 }}>
                                    <button className="btn btn--secondary btn--sm" onClick={() => openEditRole(role)} title="Rename" style={{ padding: '2px 6px', fontSize: 11 }}>✏️</button>
                                    <button className="btn btn--danger btn--sm" onClick={() => setDeleteRoleConfirm(role)} title="Delete" style={{ padding: '2px 6px', fontSize: 11 }}>🗑️</button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Users Section */}
            <div className="card">
                <div className="card__header">
                    <div className="card__icon card__icon--orange">👥</div>
                    <div style={{ flex: 1 }}>
                        <div className="card__title">PIN Code Users</div>
                        <div className="card__subtitle">Manage login PIN codes</div>
                    </div>
                    <button className="btn btn--primary btn--sm" onClick={openAdd}>
                        ➕ Add User
                    </button>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>Loading...</div>
                ) : users.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No users found</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {groupedUsers.map(group => group.users.length > 0 && (
                            <div key={group.id}>
                                <div style={{
                                    fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
                                    marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6,
                                    textTransform: 'uppercase', letterSpacing: '0.5px'
                                }}>
                                    {group.is_admin ? '👑' : '🏷️'} {group.name}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {group.users.map(user => (
                                        <div key={user.id} style={{
                                            display: 'flex', alignItems: 'center', gap: 12,
                                            padding: '12px 14px', background: 'var(--bg-input)',
                                            border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                                        }}>
                                            <span style={{ fontSize: 20 }}>{user.is_admin ? '👑' : '👤'}</span>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{user.name}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                    PIN: {user.pin} · {user.role_name || 'No role'}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button className="btn btn--secondary btn--sm" onClick={() => openEdit(user)} title="Edit">✏️</button>
                                                <button className="btn btn--danger btn--sm" onClick={() => setDeleteConfirm(user)} title="Delete">🗑️</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add/Edit User Modal */}
            {showForm && (
                <div className="modal-overlay" style={{ zIndex: 60 }} onClick={closeForm}>
                    <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
                        <div className="modal__header">
                            <h3 className="modal__title">{editingUser ? '✏️ Edit User' : '➕ Add User'}</h3>
                            <button className="modal__close" onClick={closeForm}>✕</button>
                        </div>
                        <div className="form-group">
                            <label className="form-group__label form-group__label--required">Name</label>
                            <input className="input" type="text" placeholder="Enter name" value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                        </div>
                        <div className="form-group">
                            <label className="form-group__label form-group__label--required">PIN Code (4 digits)</label>
                            <input className="input" type="text" inputMode="numeric" maxLength={4}
                                placeholder="e.g. 1234" value={form.pin}
                                onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }))} />
                        </div>
                        <div className="form-group">
                            <label className="form-group__label form-group__label--required">Role</label>
                            <select className="input" value={form.role_id}
                                onChange={e => setForm(f => ({ ...f, role_id: parseInt(e.target.value) }))}>
                                <option value="">— Select a role —</option>
                                {roles.map(r => (
                                    <option key={r.id} value={r.id}>
                                        {r.is_admin ? '👑 ' : ''}{r.name}
                                    </option>
                                ))}
                            </select>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                {form.role_id && roles.find(r => r.id === form.role_id)?.is_admin
                                    ? 'Admin role — can view all deployments & manage users'
                                    : 'Users in the same role can view each other\'s deployments'}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
                            <button className="btn btn--secondary" onClick={closeForm}>Cancel</button>
                            <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
                                {saving ? 'Saving...' : editingUser ? '💾 Save' : '➕ Add'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Role Modal */}
            {showRoleForm && (
                <div className="modal-overlay" style={{ zIndex: 60 }} onClick={closeRoleForm}>
                    <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
                        <div className="modal__header">
                            <h3 className="modal__title">{editingRole ? '✏️ Rename Role' : '➕ Add Role'}</h3>
                            <button className="modal__close" onClick={closeRoleForm}>✕</button>
                        </div>
                        <div className="form-group">
                            <label className="form-group__label form-group__label--required">Role Name</label>
                            <input className="input" type="text" placeholder="e.g. Team Alpha" value={roleName}
                                onChange={e => setRoleName(e.target.value)} autoFocus />
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                Users assigned to this role will see each other's deployment submissions.
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
                            <button className="btn btn--secondary" onClick={closeRoleForm}>Cancel</button>
                            <button className="btn btn--primary" onClick={handleSaveRole} disabled={savingRole}>
                                {savingRole ? 'Saving...' : editingRole ? '💾 Save' : '➕ Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete User Confirm Modal */}
            {deleteConfirm && (
                <div className="modal-overlay" style={{ zIndex: 60 }} onClick={() => setDeleteConfirm(null)}>
                    <div className="modal" style={{ maxWidth: 380, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
                        <h3 style={{ marginBottom: 8 }}>Delete User</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }}>
                            Are you sure you want to delete <strong>{deleteConfirm.name}</strong> (PIN: {deleteConfirm.pin})?
                        </p>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                            <button className="btn btn--danger" onClick={() => handleDelete(deleteConfirm.id)}>🗑️ Delete</button>
                            <button className="btn btn--secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Role Confirm Modal */}
            {deleteRoleConfirm && (
                <div className="modal-overlay" style={{ zIndex: 60 }} onClick={() => setDeleteRoleConfirm(null)}>
                    <div className="modal" style={{ maxWidth: 380, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
                        <h3 style={{ marginBottom: 8 }}>Delete Role</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }}>
                            Are you sure you want to delete the role <strong>{deleteRoleConfirm.name}</strong>?
                            {users.filter(u => u.role_id === deleteRoleConfirm.id).length > 0 &&
                                <><br /><span style={{ color: 'var(--error)' }}>This role has assigned users and cannot be deleted.</span></>
                            }
                        </p>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                            <button className="btn btn--danger" onClick={() => handleDeleteRole(deleteRoleConfirm.id)}>🗑️ Delete</button>
                            <button className="btn btn--secondary" onClick={() => setDeleteRoleConfirm(null)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
