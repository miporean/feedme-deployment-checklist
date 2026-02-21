import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import DateRangePicker from './DateRangePicker'

const CHECKLIST_ITEMS = [
    { key: 'check_socket_server_ip', label: 'Socket Server IP' },
    { key: 'check_printer_connection', label: 'Printer Connection' },
    { key: 'check_payment_method', label: 'Configure Payment Method' },
    { key: 'check_custom_item', label: 'Configure Custom Item' },
    { key: 'check_pax', label: 'Configure Pax' },
    { key: 'check_customer_display', label: 'Customer Display' },
    { key: 'check_qr_order', label: 'Enable QR Order / Delivery Platform' },
    { key: 'check_close_counter', label: 'Close Counter (Report)' },
]

export default function DeploymentHistory({ showToast }) {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [selected, setSelected] = useState(null)
    const [photos, setPhotos] = useState([])
    const [loadingPhotos, setLoadingPhotos] = useState(false)
    const [editing, setEditing] = useState(false)
    const [editForm, setEditForm] = useState(null)
    const [saving, setSaving] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [expandedPhoto, setExpandedPhoto] = useState(null)
    const [sortField, setSortField] = useState('created_at')
    const [sortDir, setSortDir] = useState('desc')
    const [showPasswordPrompt, setShowPasswordPrompt] = useState(false)
    const [passwordInput, setPasswordInput] = useState('')
    const [passwordError, setPasswordError] = useState('')
    const [pendingAction, setPendingAction] = useState(null)
    const [deviceFilter, setDeviceFilter] = useState('')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [showExportMenu, setShowExportMenu] = useState(false)
    const [showDeviceMenu, setShowDeviceMenu] = useState(false)
    const [deviceMenuPos, setDeviceMenuPos] = useState({ top: 0, left: 0 })
    const [expandedRow, setExpandedRow] = useState(null)
    const [currentPage, setCurrentPage] = useState(1)
    const ITEMS_PER_PAGE = 10
    const deviceMenuRef = useRef(null)
    const deviceArrowRef = useRef(null)

    // Close device menu on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (showDeviceMenu &&
                deviceMenuRef.current && !deviceMenuRef.current.contains(e.target) &&
                deviceArrowRef.current && !deviceArrowRef.current.contains(e.target)) {
                setShowDeviceMenu(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [showDeviceMenu])

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const params = search ? `?search=${encodeURIComponent(search)}` : ''
            const res = await fetch(`/api/deployments${params}`)
            const json = await res.json()
            if (json.success) setData(json.data || [])
        } catch (e) {
            console.error('Failed to fetch:', e)
        } finally {
            setLoading(false)
        }
    }, [search])

    useEffect(() => { fetchData() }, [fetchData])

    // Fetch photos when a deployment is selected
    const openDetail = async (row) => {
        setSelected(row)
        setEditing(false)
        setEditForm(null)
        setPhotos([])
        setLoadingPhotos(true)
        try {
            const res = await fetch(`/api/deployments?id=${row.id}`)
            const json = await res.json()
            if (json.success && json.data.photos) {
                // Fetch actual photo data for each photo
                const photoPromises = json.data.photos.map(async (p) => {
                    const pRes = await fetch(`/api/photos?id=${p.id}`)
                    const pJson = await pRes.json()
                    if (pJson.success) {
                        return { ...p, data: pJson.data.data }
                    }
                    return p
                })
                const loadedPhotos = await Promise.all(photoPromises)
                setPhotos(loadedPhotos)
            }
        } catch (e) {
            console.error('Failed to fetch photos:', e)
        } finally {
            setLoadingPhotos(false)
        }
    }

    const closeModal = () => {
        setSelected(null)
        setPhotos([])
        setEditing(false)
        setEditForm(null)
        setShowConfirm(false)
        setExpandedPhoto(null)
    }

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this deployment record?')) return
        try {
            const res = await fetch(`/api/deployments?id=${id}`, { method: 'DELETE' })
            const json = await res.json()
            if (json.success) {
                showToast('Record deleted successfully')
                fetchData()
                closeModal()
            }
        } catch (e) {
            showToast('Failed to delete: ' + e.message, 'error')
        }
    }

    // Password-protected actions
    const requestPassword = (action) => {
        setPendingAction(() => action)
        setPasswordInput('')
        setPasswordError('')
        setShowPasswordPrompt(true)
    }

    const verifyPassword = () => {
        if (passwordInput === 'Mipos123') {
            setShowPasswordPrompt(false)
            setPasswordInput('')
            setPasswordError('')
            if (pendingAction) pendingAction()
            setPendingAction(null)
        } else {
            setPasswordError('Incorrect password')
        }
    }

    const startEdit = (row) => {
        setEditing(true)
        setEditForm({ ...row })
    }

    const cancelEdit = () => {
        setEditing(false)
        setEditForm(null)
        setShowConfirm(false)
    }

    const handleSaveClick = () => setShowConfirm(true)

    const confirmSave = async () => {
        setSaving(true)
        try {
            const res = await fetch('/api/deployments', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm),
            })
            const json = await res.json()
            if (json.success) {
                showToast('Record updated successfully')
                setSelected(editForm)
                setEditing(false)
                setEditForm(null)
                setShowConfirm(false)
                fetchData()
            } else {
                showToast('Failed to update: ' + (json.error || 'Unknown error'), 'error')
            }
        } catch (e) {
            showToast('Failed to update: ' + e.message, 'error')
        } finally {
            setSaving(false)
        }
    }

    const setField = (field, value) => {
        setEditForm(prev => ({ ...prev, [field]: value }))
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return '—'
        const d = new Date(dateStr + (dateStr.includes('Z') || dateStr.includes('+') ? '' : 'Z'))
        return d.toLocaleDateString('en-MY', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
            timeZone: 'Asia/Kuala_Lumpur'
        })
    }

    // Sorting
    const handleSort = (field) => {
        if (sortField === field) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortDir(field === 'created_at' ? 'desc' : 'asc')
        }
    }

    const SortIcon = ({ field }) => {
        if (sortField !== field) return <span style={{ opacity: 0.3, marginLeft: 4, fontSize: 11 }}>⇅</span>
        return <span style={{ marginLeft: 4, fontSize: 11 }}>{sortDir === 'asc' ? '▲' : '▼'}</span>
    }

    const sortedData = [...data].sort((a, b) => {
        let valA, valB
        if (sortField === 'merchant_name') {
            valA = (a.merchant_name || '').toLowerCase()
            valB = (b.merchant_name || '').toLowerCase()
        } else if (sortField === 'device_type') {
            valA = (a.device_type || '').toLowerCase()
            valB = (b.device_type || '').toLowerCase()
        } else if (sortField === 'created_at') {
            valA = a.created_at || ''
            valB = b.created_at || ''
        } else {
            valA = a[sortField] || ''
            valB = b[sortField] || ''
        }
        if (valA < valB) return sortDir === 'asc' ? -1 : 1
        if (valA > valB) return sortDir === 'asc' ? 1 : -1
        return 0
    })

    // Get unique device types for filter dropdown
    const deviceTypes = useMemo(() => {
        const types = [...new Set(data.map(d => d.device_type).filter(Boolean))]
        return types.sort()
    }, [data])

    // Apply filters (device type + date range) on top of sorted data
    const filteredSortedData = useMemo(() => {
        return sortedData.filter(row => {
            // Device filter
            if (deviceFilter && row.device_type !== deviceFilter) return false
            // Date range filter
            if (dateFrom || dateTo) {
                const rowDate = row.created_at ? row.created_at.slice(0, 10) : ''
                if (dateFrom && rowDate < dateFrom) return false
                if (dateTo && rowDate > dateTo) return false
            }
            return true
        })
    }, [sortedData, deviceFilter, dateFrom, dateTo])

    const hasActiveFilters = deviceFilter || dateFrom || dateTo

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filteredSortedData.length / ITEMS_PER_PAGE))
    const paginatedData = filteredSortedData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

    // Reset to page 1 when filters change
    useEffect(() => { setCurrentPage(1) }, [deviceFilter, dateFrom, dateTo, search])

    const clearFilters = () => {
        setDeviceFilter('')
        setDateFrom('')
        setDateTo('')
    }

    // Export functions
    const exportToExcel = () => {
        const rows = filteredSortedData.map((row, i) => ({
            '#': i + 1,
            'Merchant': row.merchant_name,
            'Device': row.device_type,
            'Wi-Fi SSID': row.wifi_ssid,
            'Static IP': row.static_ip,
            'Anydesk ID': row.anydesk_id,
            'Printer IP': row.printer_ip,
            'Serial Number': row.device_serial_number || '',
            ...Object.fromEntries(CHECKLIST_ITEMS.map(item => [item.label, row[item.key] ? '✓' : '—'])),
            'Checklist': `${countChecks(row)}/8`,
            'Date': formatDate(row.created_at),
        }))
        const ws = XLSX.utils.json_to_sheet(rows)
        // Auto-width columns
        const colWidths = Object.keys(rows[0] || {}).map(key => ({
            wch: Math.max(key.length, ...rows.map(r => String(r[key] || '').length)) + 2
        }))
        ws['!cols'] = colWidths
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Deployments')
        XLSX.writeFile(wb, `deployments_${new Date().toISOString().slice(0, 10)}.xlsx`)
        setShowExportMenu(false)
    }

    const exportToPDF = () => {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
        doc.setFontSize(16)
        doc.text('Deployment Report', 14, 15)
        doc.setFontSize(9)
        doc.setTextColor(120)
        const subtitle = [
            deviceFilter ? `Device: ${deviceFilter}` : '',
            dateFrom ? `From: ${dateFrom}` : '',
            dateTo ? `To: ${dateTo}` : '',
            search ? `Search: "${search}"` : '',
        ].filter(Boolean).join('  |  ')
        if (subtitle) doc.text(subtitle, 14, 21)
        doc.text(`Generated: ${new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}`, 14, subtitle ? 26 : 21)

        const tableData = filteredSortedData.map((row, i) => [
            i + 1,
            row.merchant_name,
            row.device_type,
            row.wifi_ssid,
            row.static_ip,
            row.anydesk_id,
            (row.printer_ip || '').replace(/\n/g, ', '),
            `${countChecks(row)}/8`,
            formatDate(row.created_at),
        ])

        doc.autoTable({
            startY: subtitle ? 30 : 25,
            head: [['#', 'Merchant', 'Device', 'Wi-Fi', 'Static IP', 'Anydesk', 'Printer IP', 'Checklist', 'Date']],
            body: tableData,
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [249, 115, 22], fontSize: 8, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            columnStyles: {
                0: { cellWidth: 8 },
                7: { cellWidth: 16, halign: 'center' },
            },
        })

        doc.save(`deployments_${new Date().toISOString().slice(0, 10)}.pdf`)
        setShowExportMenu(false)
    }

    const CheckMark = ({ value }) => (
        value ? <span className="check-icon">✓</span> : <span className="cross-icon">—</span>
    )

    const DeviceBadge = ({ type }) => {
        const cls = type === 'Sunmi Device' ? 'badge--sunmi' : type === 'Window' ? 'badge--window' : 'badge--other'
        return <span className={`badge ${cls}`}>{type}</span>
    }

    const countChecks = (row) => CHECKLIST_ITEMS.filter(item => row[item.key]).length

    const EditableField = ({ label, field, type = 'text' }) => {
        if (!editing) {
            return (
                <div className="modal__field">
                    <span className="modal__field-label">{label}</span>
                    <span className="modal__field-value" style={field === 'printer_ip' ? { whiteSpace: 'pre-line' } : {}}>
                        {selected[field] || '—'}
                    </span>
                </div>
            )
        }
        return (
            <div className="modal__field" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
                <span className="modal__field-label">{label}</span>
                {type === 'textarea' ? (
                    <textarea className="input" style={{ minHeight: 60, fontSize: 13 }} value={editForm[field] || ''} onChange={e => setField(field, e.target.value)} />
                ) : (
                    <input className="input" style={{ fontSize: 13 }} type="text" value={editForm[field] || ''} onChange={e => setField(field, e.target.value)} />
                )}
            </div>
        )
    }

    const EditableCheck = ({ label, field }) => {
        if (!editing) {
            return (
                <div className="modal__field">
                    <span className="modal__field-label">{label}</span>
                    <span className="modal__field-value"><CheckMark value={selected[field]} /></span>
                </div>
            )
        }
        return (
            <div className="modal__field" style={{ cursor: 'pointer' }} onClick={() => setField(field, editForm[field] ? 0 : 1)}>
                <span className="modal__field-label">{label}</span>
                <span className="modal__field-value"><CheckMark value={editForm[field]} /></span>
            </div>
        )
    }

    const currentData = editing ? editForm : selected

    const devicePhotos = photos.filter(p => p.category === 'device')
    const printerPhotos = photos.filter(p => p.category === 'printer')

    return (
        <div>
            {/* Search & Export Bar */}
            <div className="search-bar">
                <input className="input" type="text" placeholder="🔍 Search by merchant name..."
                    value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 2 }} />
                {hasActiveFilters && (
                    <button className="btn btn--secondary btn--sm" onClick={clearFilters}
                        style={{ fontSize: 12 }}>✕ Clear Filters</button>
                )}
                <div style={{ position: 'relative' }}>
                    <button className="btn btn--primary btn--sm" onClick={() => setShowExportMenu(prev => !prev)}
                        style={{ fontSize: 13 }}>📥 Export ({filteredSortedData.length})</button>
                    {showExportMenu && (
                        <div style={{
                            position: 'absolute', right: 0, top: '100%', marginTop: 4,
                            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
                            zIndex: 20, overflow: 'hidden', minWidth: 160
                        }}>
                            <button onClick={exportToExcel} style={{
                                display: 'block', width: '100%', padding: '10px 16px', border: 'none',
                                background: 'transparent', color: 'var(--text-primary)', fontSize: 13,
                                cursor: 'pointer', textAlign: 'left'
                            }}
                                onMouseEnter={e => e.target.style.background = 'var(--bg-hover)'}
                                onMouseLeave={e => e.target.style.background = 'transparent'}
                            >📊 Export as Excel (.xlsx)</button>
                            <button onClick={exportToPDF} style={{
                                display: 'block', width: '100%', padding: '10px 16px', border: 'none',
                                background: 'transparent', color: 'var(--text-primary)', fontSize: 13,
                                cursor: 'pointer', textAlign: 'left'
                            }}
                                onMouseEnter={e => e.target.style.background = 'var(--bg-hover)'}
                                onMouseLeave={e => e.target.style.background = 'transparent'}
                            >📄 Export as PDF (.pdf)</button>
                        </div>
                    )}
                </div>
                <button className="btn btn--secondary" onClick={fetchData}>🔄</button>
            </div>

            {loading ? (
                <div className="empty-state">
                    <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3, borderColor: 'var(--border-color)', borderTopColor: 'var(--accent-primary)' }} />
                    <p style={{ marginTop: 16, color: 'var(--text-muted)' }}>Loading deployments...</p>
                </div>
            ) : filteredSortedData.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state__icon">📭</div>
                    <h3 className="empty-state__title">No deployments found</h3>
                    <p className="empty-state__text">
                        {(search || hasActiveFilters) ? 'No results match your filters.' : 'Submit your first deployment to get started.'}
                    </p>
                    {hasActiveFilters && (
                        <button className="btn btn--secondary" onClick={clearFilters} style={{ marginTop: 12 }}>Clear Filters</button>
                    )}
                </div>
            ) : (
                <div className="table-wrapper">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th onClick={() => handleSort('merchant_name')} style={{ cursor: 'pointer', userSelect: 'none' }}>Merchant<SortIcon field="merchant_name" /></th>
                                <th style={{ position: 'relative', userSelect: 'none' }}>
                                    <span onClick={() => handleSort('device_type')} style={{ cursor: 'pointer' }}>Device</span>
                                    <span
                                        ref={deviceArrowRef}
                                        onClick={e => {
                                            e.stopPropagation();
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            setDeviceMenuPos({ top: rect.bottom + 4, left: rect.left });
                                            setShowDeviceMenu(prev => !prev);
                                        }}
                                        style={{
                                            cursor: 'pointer', marginLeft: 4, fontSize: 10,
                                            color: deviceFilter ? 'var(--accent-primary)' : 'var(--text-muted)',
                                            padding: '2px 4px', borderRadius: 'var(--radius-sm)',
                                            background: deviceFilter ? 'rgba(249,115,22,0.12)' : 'transparent',
                                        }}
                                        title="Filter by device"
                                    >▼</span>
                                    {showDeviceMenu && (
                                        <div ref={deviceMenuRef} style={{
                                            position: 'fixed', top: deviceMenuPos.top, left: deviceMenuPos.left,
                                            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                            borderRadius: 'var(--radius-md)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                                            zIndex: 1000, overflow: 'hidden', minWidth: 140,
                                        }}>
                                            <button onClick={() => { setDeviceFilter(''); setShowDeviceMenu(false) }}
                                                style={{
                                                    display: 'block', width: '100%', padding: '8px 14px', border: 'none',
                                                    background: !deviceFilter ? 'rgba(249,115,22,0.1)' : 'transparent',
                                                    color: !deviceFilter ? 'var(--accent-primary)' : 'var(--text-primary)',
                                                    fontWeight: !deviceFilter ? 600 : 400,
                                                    fontSize: 12, cursor: 'pointer', textAlign: 'left',
                                                }}
                                                onMouseEnter={e => { if (deviceFilter) e.target.style.background = 'var(--bg-hover)' }}
                                                onMouseLeave={e => { if (deviceFilter) e.target.style.background = 'transparent' }}
                                            >All Devices</button>
                                            {deviceTypes.map(t => (
                                                <button key={t} onClick={() => { setDeviceFilter(t); setShowDeviceMenu(false) }}
                                                    style={{
                                                        display: 'block', width: '100%', padding: '8px 14px', border: 'none',
                                                        background: deviceFilter === t ? 'rgba(249,115,22,0.1)' : 'transparent',
                                                        color: deviceFilter === t ? 'var(--accent-primary)' : 'var(--text-primary)',
                                                        fontWeight: deviceFilter === t ? 600 : 400,
                                                        fontSize: 12, cursor: 'pointer', textAlign: 'left',
                                                    }}
                                                    onMouseEnter={e => { if (deviceFilter !== t) e.target.style.background = 'var(--bg-hover)' }}
                                                    onMouseLeave={e => { if (deviceFilter !== t) e.target.style.background = 'transparent' }}
                                                >{t}</button>
                                            ))}
                                        </div>
                                    )}
                                </th>
                                <th>Wi-Fi / IP</th>
                                <th>Anydesk</th><th>Checklist</th>
                                <th style={{ position: 'relative', userSelect: 'none' }}>
                                    <span onClick={() => handleSort('created_at')} style={{ cursor: 'pointer' }}>Date</span>
                                    <DateRangePicker
                                        dateFrom={dateFrom}
                                        dateTo={dateTo}
                                        onChange={(f, t) => { setDateFrom(f); setDateTo(t) }}
                                        renderTrigger={(onOpen) => (
                                            <span onClick={e => { e.stopPropagation(); onOpen() }}
                                                style={{
                                                    cursor: 'pointer', marginLeft: 4, fontSize: 10,
                                                    color: dateFrom ? 'var(--accent-primary)' : 'var(--text-muted)',
                                                    padding: '2px 4px', borderRadius: 'var(--radius-sm)',
                                                    background: dateFrom ? 'rgba(249,115,22,0.12)' : 'transparent',
                                                }}
                                                title="Filter by date"
                                            >▼</span>
                                        )}
                                    />
                                </th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((row, i) => {
                                const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + i + 1
                                const isExpanded = expandedRow === row.id
                                return (
                                    <>
                                        <tr key={row.id} style={{ cursor: 'pointer' }} onClick={() => setExpandedRow(isExpanded ? null : row.id)}>
                                            <td>{globalIndex}</td>
                                            <td><strong>{row.merchant_name}</strong></td>
                                            <td><DeviceBadge type={row.device_type} /></td>
                                            <td>
                                                <div style={{ fontSize: 12 }}>
                                                    <div>📡 {row.wifi_ssid}</div>
                                                    <div style={{ color: 'var(--text-muted)' }}>🌐 {row.static_ip}</div>
                                                </div>
                                            </td>
                                            <td style={{ fontSize: 12 }}>{row.anydesk_id}</td>
                                            <td>
                                                <span style={{ color: countChecks(row) === 8 ? 'var(--success)' : 'var(--warning)', fontWeight: 600, fontSize: 13 }}>
                                                    {countChecks(row)}/8
                                                </span>
                                            </td>
                                            <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDate(row.created_at)}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <button className="btn btn--secondary btn--sm" onClick={e => { e.stopPropagation(); setExpandedRow(isExpanded ? null : row.id) }} title={isExpanded ? 'Collapse' : 'View'}>
                                                        {isExpanded ? '🔽' : '👁️'}
                                                    </button>
                                                    <button className="btn btn--danger btn--sm" onClick={e => { e.stopPropagation(); requestPassword(() => handleDelete(row.id)) }} title="Delete">🗑️</button>
                                                </div>
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr key={row.id + '-detail'} style={{ background: 'var(--bg-hover)' }}>
                                                <td colSpan={9} style={{ padding: 0 }}>
                                                    <div style={{ padding: '14px 20px', fontSize: 12, lineHeight: 1.6 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                                            <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>📋 {row.merchant_name}</strong>
                                                            <div style={{ display: 'flex', gap: 6 }}>
                                                                <button className="btn btn--secondary btn--sm"
                                                                    onClick={e => { e.stopPropagation(); requestPassword(() => { openDetail(row); setTimeout(() => startEdit(row), 300); }) }}
                                                                    title="Edit"
                                                                    style={{ background: 'rgba(249,115,22,0.08)', borderColor: 'rgba(249,115,22,0.2)' }}
                                                                >✏️ Edit</button>
                                                                <button className="btn btn--secondary btn--sm"
                                                                    onClick={e => { e.stopPropagation(); openDetail(row) }}
                                                                    title="Full details"
                                                                >📄 Full Details</button>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px 24px' }}>
                                                            <div><span style={{ color: 'var(--text-muted)' }}>Device:</span> {row.device_type}</div>
                                                            <div><span style={{ color: 'var(--text-muted)' }}>Wi-Fi:</span> {row.wifi_ssid}</div>
                                                            <div><span style={{ color: 'var(--text-muted)' }}>Static IP:</span> {row.static_ip}</div>
                                                            <div><span style={{ color: 'var(--text-muted)' }}>Anydesk:</span> {row.anydesk_id}</div>
                                                            <div><span style={{ color: 'var(--text-muted)' }}>Printer IP:</span> {row.printer_ip || '—'}</div>
                                                            <div><span style={{ color: 'var(--text-muted)' }}>Serial No:</span> {row.device_serial_number || '—'}</div>
                                                            <div><span style={{ color: 'var(--text-muted)' }}>Date:</span> {formatDate(row.created_at)}</div>
                                                        </div>
                                                        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                            {CHECKLIST_ITEMS.map(item => (
                                                                <span key={item.key} style={{
                                                                    padding: '3px 8px', borderRadius: 'var(--radius-sm)', fontSize: 11,
                                                                    background: row[item.key] ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.08)',
                                                                    color: row[item.key] ? 'var(--success)' : 'var(--text-muted)',
                                                                    fontWeight: row[item.key] ? 600 : 400,
                                                                }}>{row[item.key] ? '✓' : '✗'} {item.label}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                )
                            })}
                        </tbody>
                    </table>
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 16px', borderTop: '1px solid var(--border-color)',
                        fontSize: 12, color: 'var(--text-muted)',
                    }}>
                        <span>
                            Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredSortedData.length)}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredSortedData.length)} of {filteredSortedData.length} results
                            {hasActiveFilters ? ' (filtered)' : ''}
                        </span>
                        {totalPages > 1 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    style={{
                                        padding: '4px 10px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
                                        background: currentPage === 1 ? 'transparent' : 'var(--bg-card)',
                                        color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: 12,
                                    }}
                                >‹ Prev</button>
                                <span style={{ padding: '0 8px', fontSize: 12 }}>Page {currentPage} of {totalPages}</span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    style={{
                                        padding: '4px 10px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
                                        background: currentPage === totalPages ? 'transparent' : 'var(--bg-card)',
                                        color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: 12,
                                    }}
                                >Next ›</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Detail / Edit Modal */}
            {selected && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal__header">
                            <h2 className="modal__title">
                                {editing ? '✏️ Edit: ' : ''}{currentData.merchant_name}
                            </h2>
                            <button className="modal__close" onClick={closeModal}>✕</button>
                        </div>

                        <div className="modal__section">
                            <div className="modal__section-title">Basic Info</div>
                            <EditableField label="Merchant Name" field="merchant_name" />
                            <div className="modal__field">
                                <span className="modal__field-label">Device Type</span>
                                <span className="modal__field-value">
                                    {editing ? (
                                        <select className="input" style={{ fontSize: 13, padding: '6px 10px', width: 'auto' }}
                                            value={editForm.device_type} onChange={e => setField('device_type', e.target.value)}>
                                            <option value="Sunmi Device">Sunmi Device</option>
                                            <option value="Window">Window</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    ) : (
                                        <DeviceBadge type={selected.device_type} />
                                    )}
                                </span>
                            </div>
                            <div className="modal__field">
                                <span className="modal__field-label">Date</span>
                                <span className="modal__field-value">{formatDate(selected.created_at)}</span>
                            </div>
                        </div>

                        {currentData.device_type === 'Window' && (
                            <div className="modal__section">
                                <div className="modal__section-title">Windows Setup</div>
                                <EditableCheck label="Firewall Off" field="windows_firewall_off" />
                            </div>
                        )}

                        {currentData.device_type === 'Sunmi Device' && (
                            <div className="modal__section">
                                <div className="modal__section-title">Sunmi Setup</div>
                                <EditableCheck label="Remote Assistance" field="sunmi_remote_assistance" />
                                <EditableField label="Serial Number" field="device_serial_number" />
                            </div>
                        )}

                        <div className="modal__section">
                            <div className="modal__section-title">Device Setup</div>
                            <EditableField label="Wi-Fi SSID" field="wifi_ssid" />
                            <EditableField label="Static IP" field="static_ip" />
                            <EditableField label="Anydesk ID" field="anydesk_id" />
                            <EditableField label="Printer IP" field="printer_ip" type="textarea" />
                        </div>

                        <div className="modal__section">
                            <div className="modal__section-title">FeedMe Checklist ({countChecks(currentData)}/8)</div>
                            {CHECKLIST_ITEMS.map(item => (
                                <EditableCheck key={item.key} label={item.label} field={item.key} />
                            ))}
                        </div>

                        {/* Photos Section */}
                        <div className="modal__section">
                            <div className="modal__section-title">
                                Photos {loadingPhotos ? '(Loading...)' : `(${photos.length})`}
                            </div>
                            {loadingPhotos ? (
                                <div style={{ textAlign: 'center', padding: 16 }}>
                                    <div className="spinner" />
                                </div>
                            ) : photos.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No photos uploaded</p>
                            ) : (
                                <>
                                    {devicePhotos.length > 0 && (
                                        <div style={{ marginBottom: 16 }}>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                                                📷 Device Photos ({devicePhotos.length})
                                            </div>
                                            <div className="modal__photos">
                                                {devicePhotos.map(photo => (
                                                    <div key={photo.id} className="modal__photo" onClick={() => setExpandedPhoto(photo)}>
                                                        <img src={photo.data} alt={photo.filename} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {printerPhotos.length > 0 && (
                                        <div>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                                                🖨️ Test Printer Photos ({printerPhotos.length})
                                            </div>
                                            <div className="modal__photos">
                                                {printerPhotos.map(photo => (
                                                    <div key={photo.id} className="modal__photo" onClick={() => setExpandedPhoto(photo)}>
                                                        <img src={photo.data} alt={photo.filename} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                            {editing ? (
                                <>
                                    <button className="btn btn--primary" onClick={handleSaveClick} disabled={saving}>
                                        {saving ? <><span className="spinner" /> Saving...</> : '💾 Save Changes'}
                                    </button>
                                    <button className="btn btn--secondary" onClick={cancelEdit}>Cancel</button>
                                </>
                            ) : (
                                <>
                                    <button className="btn btn--primary" onClick={() => requestPassword(() => startEdit(selected))}>✏️ Edit</button>
                                    <button className="btn btn--danger" onClick={() => requestPassword(() => handleDelete(selected.id))}>🗑️ Delete Record</button>
                                    <button className="btn btn--secondary" onClick={closeModal}>Close</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Expanded Photo Viewer */}
            {expandedPhoto && (
                <div className="modal-overlay" style={{ zIndex: 60 }} onClick={() => setExpandedPhoto(null)}>
                    <div style={{ maxWidth: '90vw', maxHeight: '90vh', position: 'relative' }} onClick={e => e.stopPropagation()}>
                        <button className="modal__close" style={{ position: 'absolute', top: -12, right: -12, zIndex: 10, background: 'var(--bg-card)' }}
                            onClick={() => setExpandedPhoto(null)}>✕</button>
                        <img src={expandedPhoto.data} alt={expandedPhoto.filename}
                            style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 'var(--radius-lg)', objectFit: 'contain', boxShadow: 'var(--shadow-lg)' }} />
                        <div style={{ textAlign: 'center', marginTop: 8, color: 'white', fontSize: 13, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
                            {expandedPhoto.filename}
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Save Dialog */}
            {showConfirm && (
                <div className="modal-overlay" style={{ zIndex: 60 }} onClick={() => setShowConfirm(false)}>
                    <div className="modal" style={{ maxWidth: 400, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
                        <h3 style={{ marginBottom: 8 }}>Confirm Edit</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }}>
                            Are you sure you want to save the changes to <strong>{editForm?.merchant_name}</strong>?
                        </p>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                            <button className="btn btn--primary" onClick={confirmSave} disabled={saving}>
                                {saving ? <><span className="spinner" /> Saving...</> : '✅ Yes, Save'}
                            </button>
                            <button className="btn btn--secondary" onClick={() => setShowConfirm(false)}>❌ No, Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Password Prompt Dialog */}
            {showPasswordPrompt && (
                <div className="modal-overlay" style={{ zIndex: 70 }} onClick={() => setShowPasswordPrompt(false)}>
                    <div className="modal" style={{ maxWidth: 380, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
                        <h3 style={{ marginBottom: 6 }}>Password Required</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: 13 }}>
                            Enter password to continue
                        </p>
                        <input
                            className="input"
                            type="password"
                            placeholder="Enter password"
                            value={passwordInput}
                            onChange={e => { setPasswordInput(e.target.value); setPasswordError('') }}
                            onKeyDown={e => e.key === 'Enter' && verifyPassword()}
                            autoFocus
                            style={{ marginBottom: 8, textAlign: 'center', fontSize: 15 }}
                        />
                        {passwordError && (
                            <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 8 }}>{passwordError}</p>
                        )}
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
                            <button className="btn btn--primary" onClick={verifyPassword}>✅ Confirm</button>
                            <button className="btn btn--secondary" onClick={() => setShowPasswordPrompt(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
