// Serve individual photo data
export async function onRequestGet(context) {
    const { env } = context;

    try {
        const url = new URL(context.request.url);
        const id = url.searchParams.get('id');

        if (!id) {
            return new Response(JSON.stringify({ success: false, error: 'Missing photo id' }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            });
        }

        const photo = await env.DB.prepare(
            'SELECT data, filename FROM deployment_photos WHERE id = ?'
        ).bind(id).first();

        if (!photo) {
            return new Response(JSON.stringify({ success: false, error: 'Photo not found' }), {
                status: 404, headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ success: true, data: photo }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        });
    }
}
