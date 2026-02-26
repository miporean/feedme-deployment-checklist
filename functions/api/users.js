// Users CRUD API — admin only
export async function onRequestGet(context) {
    const { env } = context
    try {
        const { results } = await env.DB.prepare(
            'SELECT id, name, pin, role FROM users ORDER BY id'
        ).all()
        return new Response(JSON.stringify({ success: true, data: results }), {
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        })
    }
}

export async function onRequestPost(context) {
    const { env } = context
    try {
        const { name, pin, role } = await context.request.json()
        if (!name || !pin || !role) {
            return new Response(JSON.stringify({ success: false, error: 'Name, PIN and role are required' }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            })
        }
        if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
            return new Response(JSON.stringify({ success: false, error: 'PIN must be exactly 4 digits' }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            })
        }
        if (!['admin', 'partner'].includes(role)) {
            return new Response(JSON.stringify({ success: false, error: 'Role must be admin or partner' }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            })
        }
        // Check for duplicate PIN
        const existing = await env.DB.prepare('SELECT id FROM users WHERE pin = ?').bind(pin).first()
        if (existing) {
            return new Response(JSON.stringify({ success: false, error: 'This PIN is already in use' }), {
                status: 409, headers: { 'Content-Type': 'application/json' },
            })
        }
        await env.DB.prepare('INSERT INTO users (name, pin, role) VALUES (?, ?, ?)').bind(name, pin, role).run()
        return new Response(JSON.stringify({ success: true }), {
            status: 201, headers: { 'Content-Type': 'application/json' },
        })
    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        })
    }
}

export async function onRequestPut(context) {
    const { env } = context
    try {
        const { id, name, pin, role } = await context.request.json()
        if (!id || !name || !pin || !role) {
            return new Response(JSON.stringify({ success: false, error: 'All fields are required' }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            })
        }
        if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
            return new Response(JSON.stringify({ success: false, error: 'PIN must be exactly 4 digits' }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            })
        }
        // Check for duplicate PIN (exclude self)
        const existing = await env.DB.prepare('SELECT id FROM users WHERE pin = ? AND id != ?').bind(pin, id).first()
        if (existing) {
            return new Response(JSON.stringify({ success: false, error: 'This PIN is already in use' }), {
                status: 409, headers: { 'Content-Type': 'application/json' },
            })
        }
        await env.DB.prepare('UPDATE users SET name = ?, pin = ?, role = ? WHERE id = ?').bind(name, pin, role, id).run()
        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        })
    }
}

export async function onRequestDelete(context) {
    const { env } = context
    try {
        const url = new URL(context.request.url)
        const id = url.searchParams.get('id')
        if (!id) {
            return new Response(JSON.stringify({ success: false, error: 'Missing user ID' }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            })
        }
        // Don't let admin delete themselves
        const user = await env.DB.prepare('SELECT role FROM users WHERE id = ?').bind(id).first()
        if (!user) {
            return new Response(JSON.stringify({ success: false, error: 'User not found' }), {
                status: 404, headers: { 'Content-Type': 'application/json' },
            })
        }
        await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run()
        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        })
    }
}
