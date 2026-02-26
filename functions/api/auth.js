// Backend password verification — role-based passwords
// Admin and Partner have different edit/delete passwords
const PASSWORDS = {
    admin: {
        edit: 'Mipos123',
        delete: '123456',
    },
    partner: {
        edit: 'Partner123',
        delete: 'Delete123',
    },
}

// Simple in-memory rate limiter (per IP, resets on worker restart)
const attempts = new Map()
const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 5 * 60 * 1000 // 5 minutes

function checkRateLimit(ip) {
    const now = Date.now()
    const record = attempts.get(ip)

    if (!record) {
        attempts.set(ip, { count: 1, firstAttempt: now })
        return true
    }

    // Reset if lockout period has passed
    if (now - record.firstAttempt > LOCKOUT_MS) {
        attempts.set(ip, { count: 1, firstAttempt: now })
        return true
    }

    if (record.count >= MAX_ATTEMPTS) {
        return false // locked out
    }

    record.count++
    return true
}

function clearRateLimit(ip) {
    attempts.delete(ip)
}

export async function onRequestPost(context) {
    try {
        const ip = context.request.headers.get('CF-Connecting-IP') || 'unknown'

        // Rate limit check
        if (!checkRateLimit(ip)) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Too many failed attempts. Please try again in 5 minutes.'
            }), {
                status: 429,
                headers: { 'Content-Type': 'application/json' },
            })
        }

        const body = await context.request.json()
        const { password, action, role } = body

        if (!password) {
            return new Response(JSON.stringify({ success: false, error: 'Password required' }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            })
        }

        if (!action || !['edit', 'delete'].includes(action)) {
            return new Response(JSON.stringify({ success: false, error: 'Valid action required (edit or delete)' }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            })
        }

        // Use role-based passwords, fallback to admin passwords if role not specified
        const userRole = role && PASSWORDS[role] ? role : 'admin'
        const expectedPassword = PASSWORDS[userRole][action]

        if (password === expectedPassword) {
            clearRateLimit(ip) // Reset on success
            return new Response(JSON.stringify({ success: true }), {
                headers: { 'Content-Type': 'application/json' },
            })
        } else {
            return new Response(JSON.stringify({ success: false, error: 'Incorrect password' }), {
                status: 401, headers: { 'Content-Type': 'application/json' },
            })
        }
    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        })
    }
}
