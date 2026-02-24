// Backend password verification — password is never exposed to the frontend
const ADMIN_PASSWORD = 'Mipos123'

export async function onRequestPost(context) {
    try {
        const body = await context.request.json()
        const { password } = body

        if (!password) {
            return new Response(JSON.stringify({ success: false, error: 'Password required' }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            })
        }

        if (password === ADMIN_PASSWORD) {
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
