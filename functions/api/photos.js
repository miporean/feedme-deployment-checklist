// Serve individual photo from R2
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

        // Get the R2 key from D1 metadata
        const photo = await env.DB.prepare(
            'SELECT r2_key, filename, data FROM deployment_photos WHERE id = ?'
        ).bind(id).first();

        if (!photo) {
            return new Response(JSON.stringify({ success: false, error: 'Photo not found' }), {
                status: 404, headers: { 'Content-Type': 'application/json' },
            });
        }

        // Try R2 first (new photos)
        if (photo.r2_key) {
            const r2Object = await env.PHOTOS.get(photo.r2_key);
            if (r2Object) {
                // Convert R2 binary back to base64 data URL for frontend compatibility
                const arrayBuffer = await r2Object.arrayBuffer();
                const uint8 = new Uint8Array(arrayBuffer);
                let binary = '';
                for (let i = 0; i < uint8.length; i++) {
                    binary += String.fromCharCode(uint8[i]);
                }
                const base64 = btoa(binary);
                const contentType = r2Object.httpMetadata?.contentType || 'image/jpeg';
                const dataUrl = `data:${contentType};base64,${base64}`;

                return new Response(JSON.stringify({
                    success: true,
                    data: { data: dataUrl, filename: photo.filename }
                }), {
                    headers: { 'Content-Type': 'application/json' },
                });
            }
        }

        // Fallback: serve from D1 (legacy photos stored before R2 migration)
        if (photo.data) {
            return new Response(JSON.stringify({
                success: true,
                data: { data: photo.data, filename: photo.filename }
            }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ success: false, error: 'Photo data not found' }), {
            status: 404, headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        });
    }
}
