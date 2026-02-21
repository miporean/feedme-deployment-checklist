import { useState, useRef, useEffect } from 'react'

const PRESETS = [
    { label: 'Today', get: () => { const d = fmt(new Date()); return [d, d] } },
    { label: 'Yesterday', get: () => { const d = new Date(); d.setDate(d.getDate() - 1); const s = fmt(d); return [s, s] } },
    { label: 'This week', get: () => { const d = new Date(); const day = d.getDay() || 7; const mon = new Date(d); mon.setDate(d.getDate() - day + 1); return [fmt(mon), fmt(d)] } },
    { label: 'Last week', get: () => { const d = new Date(); const day = d.getDay() || 7; const mon = new Date(d); mon.setDate(d.getDate() - day - 6); const sun = new Date(mon); sun.setDate(mon.getDate() + 6); return [fmt(mon), fmt(sun)] } },
    { label: 'Last 7 days', get: () => { const d = new Date(); const s = new Date(d); s.setDate(d.getDate() - 6); return [fmt(s), fmt(d)] } },
    { label: 'This month', get: () => { const d = new Date(); return [fmt(new Date(d.getFullYear(), d.getMonth(), 1)), fmt(d)] } },
    { label: 'Last month', get: () => { const d = new Date(); const s = new Date(d.getFullYear(), d.getMonth() - 1, 1); const e = new Date(d.getFullYear(), d.getMonth(), 0); return [fmt(s), fmt(e)] } },
]

function fmt(d) {
    return d.toISOString().slice(0, 10)
}

function parseDateLocal(str) {
    const [y, m, d] = str.split('-').map(Number)
    return new Date(y, m - 1, d)
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function Calendar({ year, month, onChangeMonth, rangeStart, rangeEnd, onDayClick, hoverDate, onDayHover }) {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const today = fmt(new Date())

    const weeks = []
    let week = Array(firstDay).fill(null)

    for (let d = 1; d <= daysInMonth; d++) {
        week.push(d)
        if (week.length === 7) {
            weeks.push(week)
            week = []
        }
    }
    if (week.length > 0) {
        while (week.length < 7) week.push(null)
        weeks.push(week)
    }

    const dateStr = (d) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

    const isInRange = (d) => {
        if (!d || !rangeStart) return false
        const ds = dateStr(d)
        const end = rangeEnd || hoverDate
        if (!end) return ds === rangeStart
        const lo = rangeStart < end ? rangeStart : end
        const hi = rangeStart < end ? end : rangeStart
        return ds >= lo && ds <= hi
    }

    const isStart = (d) => d && dateStr(d) === rangeStart
    const isEnd = (d) => d && dateStr(d) === (rangeEnd || hoverDate)

    return (
        <div style={{ minWidth: 240 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <button onClick={() => onChangeMonth(-1)} style={navBtn}>‹</button>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{MONTHS[month]} {year}</span>
                <button onClick={() => onChangeMonth(1)} style={navBtn}>›</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr>
                        {DAYS.map(d => (
                            <th key={d} style={{ fontSize: 10, color: 'var(--text-muted)', padding: '4px 0', fontWeight: 500, textAlign: 'center' }}>{d}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {weeks.map((w, wi) => (
                        <tr key={wi}>
                            {w.map((d, di) => {
                                if (!d) return <td key={di} />
                                const ds = dateStr(d)
                                const inRange = isInRange(d)
                                const start = isStart(d)
                                const end = isEnd(d)
                                const isToday = ds === today
                                return (
                                    <td key={di}
                                        onClick={() => onDayClick(ds)}
                                        onMouseEnter={() => onDayHover(ds)}
                                        style={{
                                            textAlign: 'center', padding: 0, cursor: 'pointer',
                                        }}
                                    >
                                        <div style={{
                                            width: 30, height: 30, lineHeight: '30px', margin: '1px auto',
                                            borderRadius: (start || end) ? '50%' : 0,
                                            background: (start || end) ? 'var(--accent-primary)'
                                                : inRange ? 'rgba(249,115,22,0.15)' : 'transparent',
                                            color: (start || end) ? '#fff'
                                                : isToday ? 'var(--accent-primary)' : 'var(--text-primary)',
                                            fontWeight: isToday ? 700 : 400,
                                            fontSize: 12,
                                            transition: 'all 0.15s',
                                        }}>
                                            {d}
                                        </div>
                                    </td>
                                )
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

const navBtn = {
    background: 'transparent', border: 'none', color: 'var(--text-primary)',
    fontSize: 18, cursor: 'pointer', padding: '2px 8px', borderRadius: 'var(--radius-sm)',
}

export default function DateRangePicker({ dateFrom, dateTo, onChange, renderTrigger }) {
    const [open, setOpen] = useState(false)
    const [tempFrom, setTempFrom] = useState(dateFrom)
    const [tempTo, setTempTo] = useState(dateTo)
    const [selecting, setSelecting] = useState(false) // false = not started, true = picked start waiting for end
    const [hoverDate, setHoverDate] = useState('')
    const [activePreset, setActivePreset] = useState('')
    const ref = useRef(null)

    // Two calendar months
    const now = new Date()
    const [leftMonth, setLeftMonth] = useState(now.getMonth())
    const [leftYear, setLeftYear] = useState(now.getFullYear())

    // Right calendar is always leftMonth + 1
    const rightMonth = leftMonth === 11 ? 0 : leftMonth + 1
    const rightYear = leftMonth === 11 ? leftYear + 1 : leftYear

    useEffect(() => {
        const handleClick = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false)
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    const handleOpen = () => {
        setTempFrom(dateFrom)
        setTempTo(dateTo)
        setSelecting(false)
        setActivePreset('')
        // Set calendar to show the from date month or current month
        if (dateFrom) {
            const d = parseDateLocal(dateFrom)
            setLeftYear(d.getFullYear())
            setLeftMonth(d.getMonth())
        } else {
            setLeftYear(now.getFullYear())
            setLeftMonth(now.getMonth() === 0 ? 11 : now.getMonth() - 1)
        }
        setOpen(true)
    }

    const handleDayClick = (ds) => {
        if (!selecting) {
            setTempFrom(ds)
            setTempTo('')
            setSelecting(true)
            setActivePreset('')
        } else {
            // Second click: set the range
            if (ds < tempFrom) {
                setTempTo(tempFrom)
                setTempFrom(ds)
            } else {
                setTempTo(ds)
            }
            setSelecting(false)
            setActivePreset('')
        }
    }

    const handlePreset = (preset) => {
        const [f, t] = preset.get()
        setTempFrom(f)
        setTempTo(t)
        setSelecting(false)
        setActivePreset(preset.label)
        // Navigate calendar to show the from date
        const d = parseDateLocal(f)
        setLeftYear(d.getFullYear())
        setLeftMonth(d.getMonth())
    }

    const apply = () => {
        onChange(tempFrom, tempTo || tempFrom)
        setOpen(false)
    }

    const cancel = () => {
        setOpen(false)
    }

    const clear = () => {
        onChange('', '')
        setOpen(false)
    }

    const changeLeftMonth = (delta) => {
        let m = leftMonth + delta
        let y = leftYear
        if (m < 0) { m = 11; y-- }
        if (m > 11) { m = 0; y++ }
        setLeftMonth(m)
        setLeftYear(y)
    }

    // Display label
    const label = dateFrom
        ? `${formatShort(dateFrom)}${dateTo && dateTo !== dateFrom ? ' – ' + formatShort(dateTo) : ''}`
        : 'All Dates'

    return (
        <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
            {renderTrigger ? renderTrigger(handleOpen) : (
                <button onClick={handleOpen} style={{
                    background: dateFrom ? 'rgba(249,115,22,0.12)' : 'transparent',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    color: dateFrom ? 'var(--accent-primary)' : 'var(--text-muted)',
                    fontSize: 11, padding: '4px 8px', cursor: 'pointer',
                    whiteSpace: 'nowrap', fontWeight: dateFrom ? 600 : 400,
                    display: 'flex', alignItems: 'center', gap: 4,
                }}>
                    📅 {label}
                </button>
            )}

            {open && (
                <div style={{
                    position: 'absolute', right: 0, top: '100%', marginTop: 6,
                    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
                    zIndex: 100, display: 'flex', overflow: 'hidden',
                }}>
                    {/* Presets sidebar */}
                    <div style={{
                        borderRight: '1px solid var(--border-color)', padding: '12px 0',
                        minWidth: 120, display: 'flex', flexDirection: 'column',
                    }}>
                        {PRESETS.map(p => (
                            <button key={p.label} onClick={() => handlePreset(p)}
                                style={{
                                    padding: '8px 16px', border: 'none', textAlign: 'left',
                                    background: activePreset === p.label ? 'rgba(249,115,22,0.1)' : 'transparent',
                                    color: activePreset === p.label ? 'var(--accent-primary)' : 'var(--text-primary)',
                                    fontWeight: activePreset === p.label ? 600 : 400,
                                    fontSize: 12, cursor: 'pointer',
                                }}
                                onMouseEnter={e => { if (activePreset !== p.label) e.target.style.background = 'var(--bg-hover)' }}
                                onMouseLeave={e => { if (activePreset !== p.label) e.target.style.background = 'transparent' }}
                            >
                                {p.label}
                            </button>
                        ))}
                        <div style={{ marginTop: 'auto', padding: '8px 16px' }}>
                            <button onClick={clear} style={{
                                width: '100%', padding: '6px 0', border: 'none',
                                background: 'transparent', color: 'var(--text-muted)',
                                fontSize: 11, cursor: 'pointer', textDecoration: 'underline',
                            }}>Clear dates</button>
                        </div>
                    </div>

                    {/* Calendars */}
                    <div style={{ padding: 16 }}>
                        <div style={{ display: 'flex', gap: 20, marginBottom: 12 }}>
                            <Calendar
                                year={leftYear} month={leftMonth}
                                onChangeMonth={changeLeftMonth}
                                rangeStart={tempFrom} rangeEnd={tempTo}
                                onDayClick={handleDayClick}
                                hoverDate={selecting ? hoverDate : ''}
                                onDayHover={setHoverDate}
                            />
                            <Calendar
                                year={rightYear} month={rightMonth}
                                onChangeMonth={changeLeftMonth}
                                rangeStart={tempFrom} rangeEnd={tempTo}
                                onDayClick={handleDayClick}
                                hoverDate={selecting ? hoverDate : ''}
                                onDayHover={setHoverDate}
                            />
                        </div>

                        {/* Selected range display */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 12 }}>
                            <span style={{
                                padding: '4px 10px', borderRadius: 'var(--radius-sm)',
                                background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                                color: tempFrom ? 'var(--text-primary)' : 'var(--text-muted)',
                            }}>
                                {tempFrom ? formatShort(tempFrom) : 'Start date'}
                            </span>
                            <span style={{ color: 'var(--text-muted)' }}>→</span>
                            <span style={{
                                padding: '4px 10px', borderRadius: 'var(--radius-sm)',
                                background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                                color: tempTo ? 'var(--text-primary)' : 'var(--text-muted)',
                            }}>
                                {tempTo ? formatShort(tempTo) : 'End date'}
                            </span>
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button onClick={cancel} style={{
                                padding: '8px 20px', border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-md)', background: 'transparent',
                                color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer',
                            }}>Cancel</button>
                            <button onClick={apply} disabled={!tempFrom} style={{
                                padding: '8px 20px', border: 'none',
                                borderRadius: 'var(--radius-md)',
                                background: tempFrom ? 'var(--accent-primary)' : 'var(--border-color)',
                                color: '#fff', fontSize: 13, fontWeight: 600, cursor: tempFrom ? 'pointer' : 'not-allowed',
                            }}>Apply</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function formatShort(dateStr) {
    if (!dateStr) return ''
    const d = parseDateLocal(dateStr)
    return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}
