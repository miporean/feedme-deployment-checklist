import { useState, useEffect } from 'react'

export default function UserManagement({ showToast }) {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [editingUser, setEditingUser] = useState(null)
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({ name: '', pin: '', role: 'partner' })
    const [saving, setSaving] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState(null)

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

    useEffect(() => { fetchUsers() }, [])

    const openAdd = () => {
        setEditingUser(null)
        setForm({ name: '', pin: '', role: 'partner' })
        setShowForm(true)
    }

    const openEdit = (user) => {
        setEditingUser(user)
        setForm({ name: user.name, pin: user.pin, role: user.role })
        setShowForm(true)
    }

    const closeForm = () => {
        setShowForm(false)
        setEditingUser(null)
        setForm({ name: '', pin: '', role: 'partner' })
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

    return (
        <div>
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {users.map(user => (
                            <div key={user.id} style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: '12px 14px', background: 'var(--bg-input)',
                                border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                            }}>
                                <span style={{ fontSize: 20 }}>{user.role === 'admin' ? '👑' : '👤'}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{user.name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                        PIN: {user.pin} · {user.role}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <button className="btn btn--secondary btn--sm" onClick={() => openEdit(user)} title="Edit">✏️</button>
                                    <button className="btn btn--danger btn--sm" onClick={() => setDeleteConfirm(user)} title="Delete">🗑️</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
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
                            <div className="radio-group">
                                {[{ value: 'admin', label: '👑 Admin', desc: 'Can view all records & manage users' },
                                { value: 'partner', label: '👤 Partner', desc: 'Can only view own submissions' }].map(opt => (
                                    <label key={opt.value} className={`radio-option ${form.role === opt.value ? 'radio-option--selected' : ''}`}>
                                        <input type="radio" name="role" checked={form.role === opt.value}
                                            onChange={() => setForm(f => ({ ...f, role: opt.value }))} />
                                        <div>
                                            <span className="radio-option__label">{opt.label}</span>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{opt.desc}</div>
                                        </div>
                                    </label>
                                ))}
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

            {/* Delete Confirm Modal */}
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
        </div>
    )
}
