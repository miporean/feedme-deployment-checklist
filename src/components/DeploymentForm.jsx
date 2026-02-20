import { useState } from 'react'

const INITIAL_FORM = {
    merchant_name: '',
    device_type: '',
    wifi_ssid: '',
    static_ip: '',
    anydesk_id: '',
    printer_ip: '',
    windows_firewall_off: false,
    sunmi_remote_assistance: false,
    device_serial_number: '',
    check_socket_server_ip: false,
    check_printer_connection: false,
    check_payment_method: false,
    check_custom_item: false,
    check_pax: false,
    check_customer_display: false,
    check_qr_order: false,
    check_close_counter: false,
}

function getSteps(deviceType) {
    const steps = [{ key: 'info', label: 'Info' }]
    if (deviceType === 'Window') steps.push({ key: 'windows', label: 'Windows' })
    if (deviceType === 'Sunmi Device') steps.push({ key: 'sunmi', label: 'Sunmi' })
    steps.push({ key: 'device', label: 'Device' })
    steps.push({ key: 'feedme', label: 'FeedMe' })
    steps.push({ key: 'photos', label: 'Photos' })
    return steps
}

function compressImage(file, maxSize = 800, quality = 0.5) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            const img = new Image()
            img.onload = () => {
                const canvas = document.createElement('canvas')
                let { width, height } = img
                // Scale down if larger than maxSize
                if (width > maxSize || height > maxSize) {
                    if (width > height) {
                        height = Math.round((height * maxSize) / width)
                        width = maxSize
                    } else {
                        width = Math.round((width * maxSize) / height)
                        height = maxSize
                    }
                }
                canvas.width = width
                canvas.height = height
                const ctx = canvas.getContext('2d')
                ctx.drawImage(img, 0, 0, width, height)
                const compressed = canvas.toDataURL('image/jpeg', quality)
                resolve(compressed)
            }
            img.onerror = reject
            img.src = e.target.result
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

function PhotoUpload({ label, photos, maxPhotos, onAdd, onRemove }) {
    const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

    const handleFiles = async (e) => {
        const files = Array.from(e.target.files)
        const remaining = maxPhotos - photos.length
        const toProcess = files.slice(0, remaining)

        for (const file of toProcess) {
            if (file.size > MAX_FILE_SIZE) {
                alert(`"${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 50MB.`)
                continue
            }
            const compressed = await compressImage(file)
            onAdd({ filename: file.name, data: compressed, preview: compressed })
        }
        e.target.value = ''
    }


    return (
        <div className="form-group">
            <label className="form-group__label">{label} ({photos.length}/{maxPhotos})</label>
            <div className="photo-grid">
                {photos.map((photo, i) => (
                    <div key={i} className="photo-thumb">
                        <img src={photo.preview} alt={photo.filename} />
                        <button className="photo-thumb__remove" onClick={() => onRemove(i)} type="button">✕</button>
                    </div>
                ))}
                {photos.length < maxPhotos && (
                    <label className="photo-add">
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleFiles}
                            style={{ display: 'none' }}
                        />
                        <span className="photo-add__icon">📷</span>
                        <span className="photo-add__text">Add Photo</span>
                    </label>
                )}
            </div>
        </div>
    )
}

export default function DeploymentForm({ onSuccess }) {
    const [form, setForm] = useState(INITIAL_FORM)
    const [devicePhotos, setDevicePhotos] = useState([])
    const [printerPhotos, setPrinterPhotos] = useState([])
    const [currentStep, setCurrentStep] = useState(0)
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [errors, setErrors] = useState({})

    const steps = getSteps(form.device_type)
    const step = steps[currentStep]

    const set = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }))
        setErrors(prev => ({ ...prev, [field]: undefined }))
    }

    const validateStep = () => {
        const errs = {}
        if (step.key === 'info') {
            if (!form.merchant_name.trim()) errs.merchant_name = true
            if (!form.device_type) errs.device_type = true
        }
        if (step.key === 'device') {
            if (!form.wifi_ssid.trim()) errs.wifi_ssid = true
            if (!form.static_ip.trim()) errs.static_ip = true
            if (!form.anydesk_id.trim()) errs.anydesk_id = true
            if (!form.printer_ip.trim()) errs.printer_ip = true
        }
        if (step.key === 'sunmi') {
            if (!form.device_serial_number.trim()) errs.device_serial_number = true
        }
        setErrors(errs)
        return Object.keys(errs).length === 0
    }

    const next = () => {
        if (!validateStep()) return
        if (currentStep < steps.length - 1) setCurrentStep(prev => prev + 1)
    }

    const prev = () => {
        if (currentStep > 0) setCurrentStep(prev => prev - 1)
    }

    const submit = async () => {
        if (!validateStep()) return
        setSubmitting(true)
        try {
            const payload = {
                ...form,
                device_photos: devicePhotos.map(p => ({ filename: p.filename, data: p.data })),
                printer_photos: printerPhotos.map(p => ({ filename: p.filename, data: p.data })),
            }
            const res = await fetch('/api/deployments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const data = await res.json()
            if (data.success) {
                if (data.warning) {
                    alert(data.warning)
                }
                setSubmitted(true)
                onSuccess?.()
            } else {
                alert('Error: ' + (data.error || 'Unknown error'))
            }
        } catch (e) {
            alert('Network error: ' + e.message)
        } finally {
            setSubmitting(false)
        }
    }

    const reset = () => {
        setForm(INITIAL_FORM)
        setDevicePhotos([])
        setPrinterPhotos([])
        setCurrentStep(0)
        setSubmitted(false)
        setErrors({})
    }

    if (submitted) {
        return (
            <div className="card">
                <div className="success-screen">
                    <div className="success-screen__icon">✅</div>
                    <h2 className="success-screen__title">Deployment Submitted!</h2>
                    <p className="success-screen__text">
                        Deployment for <strong>{form.merchant_name}</strong> ({form.device_type}) has been recorded
                        {devicePhotos.length + printerPhotos.length > 0 &&
                            ` with ${devicePhotos.length + printerPhotos.length} photo(s)`
                        }.
                    </p>
                    <button className="btn btn--primary" onClick={reset}>
                        ➕ Submit Another
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div>
            {/* Stepper */}
            <div className="stepper">
                {steps.map((s, i) => (
                    <div key={s.key} style={{ display: 'flex', alignItems: 'center' }}>
                        <div className="stepper__step">
                            <div className={`stepper__circle ${i === currentStep ? 'stepper__circle--active' : i < currentStep ? 'stepper__circle--done' : ''}`}>
                                {i < currentStep ? '✓' : i + 1}
                            </div>
                            <span className={`stepper__label ${i === currentStep ? 'stepper__label--active' : ''}`}>{s.label}</span>
                        </div>
                        {i < steps.length - 1 && <div className={`stepper__line ${i < currentStep ? 'stepper__line--done' : ''}`} />}
                    </div>
                ))}
            </div>

            {/* Step: Basic Info */}
            {step.key === 'info' && (
                <div className="card">
                    <div className="card__header">
                        <div className="card__icon card__icon--orange">📋</div>
                        <div>
                            <div className="card__title">Deployment Checklist</div>
                            <div className="card__subtitle">Section 1 — Basic Information</div>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-group__label form-group__label--required">Merchant Name</label>
                        <input className={`input ${errors.merchant_name ? 'input--error' : ''}`} type="text" placeholder="Enter merchant name" value={form.merchant_name} onChange={e => set('merchant_name', e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-group__label form-group__label--required">Device</label>
                        <div className="radio-group">
                            {['Sunmi Device', 'Window', 'Other'].map(opt => (
                                <label key={opt} className={`radio-option ${form.device_type === opt ? 'radio-option--selected' : ''}`}>
                                    <input type="radio" name="device_type" checked={form.device_type === opt} onChange={() => { set('device_type', opt); setCurrentStep(0); }} />
                                    <span className="radio-option__label">{opt}</span>
                                </label>
                            ))}
                        </div>
                        {errors.device_type && <div className="form-group__hint" style={{ color: 'var(--error)' }}>Please select a device type</div>}
                    </div>
                </div>
            )}

            {/* Step: Windows */}
            {step.key === 'windows' && (
                <div className="card">
                    <div className="card__header">
                        <div className="card__icon card__icon--blue">🪟</div>
                        <div><div className="card__title">Window Device</div><div className="card__subtitle">Install AnyDesk and turn off Firewall.</div></div>
                    </div>
                    <div className="form-group">
                        <label className="form-group__label">Windows Setup Checklist</label>
                        <div className="checkbox-group">
                            <label className={`checkbox-option ${form.windows_firewall_off ? 'checkbox-option--checked' : ''}`}>
                                <input type="checkbox" checked={form.windows_firewall_off} onChange={e => set('windows_firewall_off', e.target.checked)} />
                                <span className="checkbox-option__label">Turn off Firewall</span>
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {/* Step: Sunmi */}
            {step.key === 'sunmi' && (
                <div className="card">
                    <div className="card__header">
                        <div className="card__icon card__icon--orange">📱</div>
                        <div><div className="card__title">Sunmi Device</div><div className="card__subtitle">Enter serial number and enable Remote Assistance.</div></div>
                    </div>
                    <div className="form-group">
                        <label className="form-group__label">Sunmi Setup Checklist</label>
                        <div className="checkbox-group">
                            <label className={`checkbox-option ${form.sunmi_remote_assistance ? 'checkbox-option--checked' : ''}`}>
                                <input type="checkbox" checked={form.sunmi_remote_assistance} onChange={e => set('sunmi_remote_assistance', e.target.checked)} />
                                <span className="checkbox-option__label">Enable Remote Assistance</span>
                            </label>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-group__label form-group__label--required">Device Serial Number</label>
                        <input className={`input ${errors.device_serial_number ? 'input--error' : ''}`} type="text" placeholder="Enter device S/N" value={form.device_serial_number} onChange={e => set('device_serial_number', e.target.value)} />
                    </div>
                </div>
            )}

            {/* Step: Device Setup */}
            {step.key === 'device' && (
                <>
                    <div className="card">
                        <div className="card__header">
                            <div className="card__icon card__icon--blue">📡</div>
                            <div><div className="card__title">Wi-Fi Settings</div><div className="card__subtitle">Section 2 — Device Setup</div></div>
                        </div>
                        <div className="info-box">
                            <strong>Notes:</strong>
                            <ol>
                                <li>Device must connect to <strong>one Wi-Fi network only</strong>.</li>
                                <li>Wi-Fi must be on <strong>2.4GHz</strong> (not 5GHz).</li>
                                <li><strong>Static IP</strong> setup is required.</li>
                            </ol>
                        </div>
                        <div className="guideline-box">
                            <strong>📘 Setup Static IP Guideline:</strong><br />
                            Android: <a href="https://scribehow.com/viewer/Android_Setup_Static_IP__qY__eucCT9-f3yjM00xY9Q?referrer=workspace" target="_blank" rel="noopener noreferrer">Android Setup Static IP</a><br />
                            iOS: <a href="https://scribehow.com/viewer/IOS_Setup_Static_IP__HFreYm1RRJCvWmThD3YUiA" target="_blank" rel="noopener noreferrer">iOS Setup Static IP</a><br />
                            Windows: <a href="https://scribehow.com/viewer/Window_Setup_Static_IP__Wd5Qr3AHSwq_s6C4JLbH1Q" target="_blank" rel="noopener noreferrer">Window Setup Static IP</a>
                        </div>
                        <div className="form-group">
                            <label className="form-group__label form-group__label--required">Wi-Fi Name (SSID)</label>
                            <input className={`input ${errors.wifi_ssid ? 'input--error' : ''}`} type="text" placeholder="Enter Wi-Fi SSID" value={form.wifi_ssid} onChange={e => set('wifi_ssid', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-group__label form-group__label--required">Static IP for Device</label>
                            <input className={`input ${errors.static_ip ? 'input--error' : ''}`} type="text" placeholder="e.g., 192.168.1.50" value={form.static_ip} onChange={e => set('static_ip', e.target.value)} />
                        </div>
                    </div>

                    <div className="card">
                        <div className="card__header">
                            <div className="card__icon card__icon--green">🔗</div>
                            <div><div className="card__title">Anydesk Settings</div><div className="card__subtitle">Remote access configuration</div></div>
                        </div>
                        <div className="info-box">
                            <strong>Notes:</strong>
                            <ol>
                                <li><strong>Install Anydesk</strong> on the Device.</li>
                                <li>Ensure <strong>Anydesk Setup ALL</strong> are activated.</li>
                                <li>Interactive Access select <strong>Always show incoming session request</strong>.</li>
                            </ol>
                        </div>
                        <div className="form-group">
                            <label className="form-group__label form-group__label--required">Anydesk ID</label>
                            <input className={`input ${errors.anydesk_id ? 'input--error' : ''}`} type="text" placeholder="Enter Anydesk ID" value={form.anydesk_id} onChange={e => set('anydesk_id', e.target.value)} />
                        </div>
                    </div>

                    <div className="card">
                        <div className="card__header">
                            <div className="card__icon card__icon--red">🖨️</div>
                            <div><div className="card__title">Printer Settings</div><div className="card__subtitle">Printer IP configuration</div></div>
                        </div>
                        <div className="info-box">
                            <strong>Notes:</strong>
                            <ol>
                                <li>For <strong>LAN/Wi-Fi printers</strong>, set a Static IP and connect on <strong>2.4GHz</strong>.</li>
                                <li>For <strong>Built-in printers</strong>, please make sure <strong>Bluetooth</strong> is enabled.</li>
                                <li>For <strong>Windows devices</strong>, please install the correct <strong>printer driver</strong>.</li>
                            </ol>
                        </div>
                        <div className="guideline-box">
                            <strong>📘 Printer Static IP Guideline:</strong><br />
                            LAN:<br />
                            1. <a href="https://scribehow.com/viewer/Using_Tool_to_Set_LAN_Printer__TfoZi3-cTCinKkN8cziNWg?referrer=documents" target="_blank" rel="noopener noreferrer">Using Tool</a><br />
                            2. <a href="https://scribehow.com/viewer/Configure_Ethernet_WebConfig_Settings__qvQUjKQhSrisXuBQaapJAw" target="_blank" rel="noopener noreferrer">Using Website</a><br />
                            Wi-Fi: <a href="https://scribehow.com/viewer/Wi-Fi_Printer_Setup__D9w5jd3IRg2kxasU5w9BnQ?referrer=documents" target="_blank" rel="noopener noreferrer">Wi-Fi Printer Setup</a>
                        </div>
                        <div className="form-group">
                            <label className="form-group__label form-group__label--required">Printer IP</label>
                            <div className="form-group__hint" style={{ marginBottom: '6px', marginTop: 0 }}>
                                Example: Kitchen Printer (192.168.1.100)
                            </div>
                            <textarea className={`input ${errors.printer_ip ? 'input--error' : ''}`} placeholder="Enter printer name and IP..." value={form.printer_ip} onChange={e => set('printer_ip', e.target.value)} />
                        </div>
                    </div>
                </>
            )}

            {/* Step: FeedMe Checklist */}
            {step.key === 'feedme' && (
                <div className="card">
                    <div className="card__header">
                        <div className="card__icon card__icon--green">✅</div>
                        <div><div className="card__title">FeedMe Checklist</div><div className="card__subtitle">Section 5 — Complete the settings below</div></div>
                    </div>
                    <div className="form-group">
                        <label className="form-group__label">Settings Checklist</label>
                        <div className="checkbox-group">
                            {[
                                { key: 'check_socket_server_ip', label: 'Socket Server IP' },
                                { key: 'check_printer_connection', label: 'Printer Connection' },
                                { key: 'check_payment_method', label: 'Configure Payment Method' },
                                { key: 'check_custom_item', label: 'Configure Custom Item' },
                                { key: 'check_pax', label: 'Configure Pax' },
                                { key: 'check_customer_display', label: 'Customer Display' },
                                { key: 'check_qr_order', label: 'Enable QR Order / Delivery Platform' },
                                { key: 'check_close_counter', label: 'Close Counter (Report)' },
                            ].map(item => (
                                <label key={item.key} className={`checkbox-option ${form[item.key] ? 'checkbox-option--checked' : ''}`}>
                                    <input type="checkbox" checked={form[item.key]} onChange={e => set(item.key, e.target.checked)} />
                                    <span className="checkbox-option__label">{item.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Step: Photos */}
            {step.key === 'photos' && (
                <div className="card">
                    <div className="card__header">
                        <div className="card__icon card__icon--purple">📸</div>
                        <div><div className="card__title">Upload Photos</div><div className="card__subtitle">Section 6 — Device & printer test photos</div></div>
                    </div>

                    <PhotoUpload
                        label="Device Photos"
                        photos={devicePhotos}
                        maxPhotos={10}
                        onAdd={(photo) => setDevicePhotos(prev => [...prev, photo])}
                        onRemove={(i) => setDevicePhotos(prev => prev.filter((_, idx) => idx !== i))}
                    />

                    <PhotoUpload
                        label="Test Printer Photos"
                        photos={printerPhotos}
                        maxPhotos={5}
                        onAdd={(photo) => setPrinterPhotos(prev => [...prev, photo])}
                        onRemove={(i) => setPrinterPhotos(prev => prev.filter((_, idx) => idx !== i))}
                    />
                </div>
            )}

            {/* Navigation */}
            <div className="form-actions">
                <button className="btn btn--secondary" onClick={prev} disabled={currentStep === 0}>← Back</button>
                {currentStep < steps.length - 1 ? (
                    <button className="btn btn--primary" onClick={next}>Next →</button>
                ) : (
                    <button className="btn btn--primary" onClick={submit} disabled={submitting}>
                        {submitting ? <><span className="spinner" /> Submitting...</> : '🚀 Submit Deployment'}
                    </button>
                )}
            </div>
        </div>
    )
}
