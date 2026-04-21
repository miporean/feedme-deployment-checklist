// Roles CRUD API — admin only
export async function onRequestGet(context) {
    const { env } = context
    try {
        const { results } = await env.DB.prepare(
            'SELECT id, name, is_admin FROM roles ORDER BY is_admin DESC, name ASC'
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
        const { name } = await context.request.json()
        if (!name || !name.trim()) {
            return new Response(JSON.stringify({ success: false, error: 'Role name is required' }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            })
        }
        // Check for duplicate name
        const existing = await env.DB.prepare('SELECT id FROM roles WHERE name = ?').bind(name.trim()).first()
        if (existing) {
            return new Response(JSON.stringify({ success: false, error: 'A role with this name already exists' }), {
                status: 409, headers: { 'Content-Type': 'application/json' },
            })
        }
        await env.DB.prepare('INSERT INTO roles (name, is_admin) VALUES (?, 0)').bind(name.trim()).run()
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
        const { id, name } = await context.request.json()
        if (!id || !name || !name.trim()) {
            return new Response(JSON.stringify({ success: false, error: 'ID and name are required' }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            })
        }
        // Don't allow renaming admin role
        const role = await env.DB.prepare('SELECT is_admin FROM roles WHERE id = ?').bind(id).first()
        if (role && role.is_admin) {
            return new Response(JSON.stringify({ success: false, error: 'Cannot rename the admin role' }), {
                status: 403, headers: { 'Content-Type': 'application/json' },
            })
        }
        // Check for duplicate name (exclude self)
        const existing = await env.DB.prepare('SELECT id FROM roles WHERE name = ? AND id != ?').bind(name.trim(), id).first()
        if (existing) {
            return new Response(JSON.stringify({ success: false, error: 'A role with this name already exists' }), {
                status: 409, headers: { 'Content-Type': 'application/json' },
            })
        }
        await env.DB.prepare('UPDATE roles SET name = ? WHERE id = ?').bind(name.trim(), id).run()
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
            return new Response(JSON.stringify({ success: false, error: 'Missing role ID' }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            })
        }
        // Don't allow deleting admin role
        const role = await env.DB.prepare('SELECT is_admin FROM roles WHERE id = ?').bind(id).first()
        if (!role) {
            return new Response(JSON.stringify({ success: false, error: 'Role not found' }), {
                status: 404, headers: { 'Content-Type': 'application/json' },
            })
        }
        if (role.is_admin) {
            return new Response(JSON.stringify({ success: false, error: 'Cannot delete the admin role' }), {
                status: 403, headers: { 'Content-Type': 'application/json' },
            })
        }
        // Check if any users are assigned to this role
        const userCount = await env.DB.prepare('SELECT COUNT(*) as count FROM users WHERE role_id = ?').bind(id).first()
        if (userCount && userCount.count > 0) {
            return new Response(JSON.stringify({ success: false, error: `Cannot delete: ${userCount.count} user(s) are assigned to this role` }), {
                status: 409, headers: { 'Content-Type': 'application/json' },
            })
        }
        await env.DB.prepare('DELETE FROM roles WHERE id = ?').bind(id).run()
        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        })
    }
}
