// PIN Login endpoint — verifies a 4-digit PIN and returns user info with role
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
    if (now - record.firstAttempt > LOCKOUT_MS) {
        attempts.set(ip, { count: 1, firstAttempt: now })
        return true
    }
    if (record.count >= MAX_ATTEMPTS) return false
    record.count++
    return true
}

function clearRateLimit(ip) {
    attempts.delete(ip)
}

export async function onRequestPost(context) {
    try {
        const ip = context.request.headers.get('CF-Connecting-IP') || 'unknown'

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
        const { pin } = body

        if (!pin || pin.length !== 4) {
            return new Response(JSON.stringify({ success: false, error: 'Invalid PIN' }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            })
        }

        const user = await context.env.DB.prepare(
            `SELECT u.id, u.name, u.role_id, r.name as role_name, r.is_admin
             FROM users u
             LEFT JOIN roles r ON u.role_id = r.id
             WHERE u.pin = ?`
        ).bind(pin).first()

        if (user) {
            clearRateLimit(ip)
            return new Response(JSON.stringify({
                success: true,
                user: {
                    id: user.id,
                    name: user.name,
                    role_id: user.role_id,
                    role_name: user.role_name,
                    is_admin: user.is_admin === 1
                }
            }), {
                headers: { 'Content-Type': 'application/json' },
            })
        } else {
            return new Response(JSON.stringify({ success: false, error: 'Invalid PIN code' }), {
                status: 401, headers: { 'Content-Type': 'application/json' },
            })
        }
    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        })
    }
}
