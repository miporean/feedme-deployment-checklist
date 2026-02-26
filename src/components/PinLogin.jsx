import { useState, useRef, useEffect } from 'react'

export default function PinLogin({ onLogin }) {
    const [digits, setDigits] = useState(['', '', '', ''])
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [shake, setShake] = useState(false)
    const inputRefs = [useRef(), useRef(), useRef(), useRef()]

    useEffect(() => {
        inputRefs[0].current?.focus()
    }, [])

    const handleChange = (index, value) => {
        // Only allow digits
        const digit = value.replace(/\D/g, '').slice(-1)
        const newDigits = [...digits]
        newDigits[index] = digit
        setDigits(newDigits)
        setError('')

        if (digit && index < 3) {
            inputRefs[index + 1].current?.focus()
        }

        // Auto-submit when all 4 digits entered
        if (digit && index === 3) {
            const pin = newDigits.join('')
            if (pin.length === 4) {
                submitPin(pin)
            }
        }
    }

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !digits[index] && index > 0) {
            inputRefs[index - 1].current?.focus()
        }
    }

    const handlePaste = (e) => {
        e.preventDefault()
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
        if (pasted.length === 4) {
            const newDigits = pasted.split('')
            setDigits(newDigits)
            inputRefs[3].current?.focus()
            submitPin(pasted)
        }
    }

    const submitPin = async (pin) => {
        setLoading(true)
        setError('')
        try {
            const res = await fetch('/api/pin-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin }),
            })
            const data = await res.json()
            if (data.success) {
                onLogin(data.user)
            } else {
                setError(data.error || 'Invalid PIN')
                setShake(true)
                setTimeout(() => {
                    setShake(false)
                    setDigits(['', '', '', ''])
                    inputRefs[0].current?.focus()
                }, 500)
            }
        } catch (e) {
            setError('Network error. Please try again.')
            setShake(true)
            setTimeout(() => {
                setShake(false)
                setDigits(['', '', '', ''])
                inputRefs[0].current?.focus()
            }, 500)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="pin-screen">
            <div className={`pin-card${shake ? ' pin-card--shake' : ''}`}>
                <div className="pin-card__icon">🔐</div>
                <h2 className="pin-card__title">Enter PIN Code</h2>
                <p className="pin-card__subtitle">Enter your 4-digit PIN to continue</p>

                <div className="pin-inputs">
                    {digits.map((digit, i) => (
                        <input
                            key={i}
                            ref={inputRefs[i]}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleChange(i, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(i, e)}
                            onPaste={i === 0 ? handlePaste : undefined}
                            className={`pin-input${digit ? ' pin-input--filled' : ''}${error ? ' pin-input--error' : ''}`}
                            disabled={loading}
                            autoComplete="off"
                        />
                    ))}
                </div>

                {error && <div className="pin-error">{error}</div>}
                {loading && <div className="pin-loading">Verifying...</div>}

                <p className="pin-card__footer">FeedMe Deployment Checklist</p>
            </div>
        </div>
    )
}
