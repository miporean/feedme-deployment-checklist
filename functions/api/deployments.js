export async function onRequestGet(context) {
    const { env } = context;

    try {
        const url = new URL(context.request.url);
        const search = url.searchParams.get('search') || '';
        const id = url.searchParams.get('id');

        // Get single deployment with photos
        if (id) {
            const deployment = await env.DB.prepare('SELECT * FROM deployments WHERE id = ?').bind(id).first();
            if (!deployment) {
                return new Response(JSON.stringify({ success: false, error: 'Not found' }), {
                    status: 404, headers: { 'Content-Type': 'application/json' },
                });
            }
            const { results: photos } = await env.DB.prepare(
                'SELECT id, category, filename, created_at FROM deployment_photos WHERE deployment_id = ?'
            ).bind(id).all();
            return new Response(JSON.stringify({ success: true, data: { ...deployment, photos } }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }

        let query = 'SELECT * FROM deployments ORDER BY created_at DESC';
        let params = [];

        if (search) {
            query = 'SELECT * FROM deployments WHERE merchant_name LIKE ? OR device_type LIKE ? ORDER BY created_at DESC';
            params = [`%${search}%`, `%${search}%`];
        }

        const { results } = await env.DB.prepare(query).bind(...params).all();

        // Get photo counts for each deployment
        for (const row of results) {
            const { results: photoCounts } = await env.DB.prepare(
                'SELECT category, COUNT(*) as count FROM deployment_photos WHERE deployment_id = ? GROUP BY category'
            ).bind(row.id).all();
            row.photo_counts = {};
            for (const pc of photoCounts) {
                row.photo_counts[pc.category] = pc.count;
            }
        }

        return new Response(JSON.stringify({ success: true, data: results }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        });
    }
}

export async function onRequestPost(context) {
    const { env, request } = context;

    try {
        const body = await request.json();

        const {
            merchant_name, device_type,
            wifi_ssid, static_ip, anydesk_id, printer_ip,
            windows_firewall_off, sunmi_remote_assistance, device_serial_number,
            check_socket_server_ip, check_printer_connection, check_payment_method,
            check_custom_item, check_pax, check_customer_display,
            check_qr_order, check_close_counter,
            device_photos, printer_photos,
        } = body;

        if (!merchant_name || !device_type || !wifi_ssid || !static_ip || !anydesk_id || !printer_ip) {
            return new Response(
                JSON.stringify({ success: false, error: 'Missing required fields' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Malaysia timezone (UTC+8) computed in JavaScript
        const now = new Date(Date.now() + 8 * 60 * 60 * 1000);
        const myt = now.toISOString().replace('T', ' ').slice(0, 19);

        // Step 1: Insert deployment record (no photos)
        const result = await env.DB.prepare(`
            INSERT INTO deployments (
                merchant_name, device_type,
                wifi_ssid, static_ip, anydesk_id, printer_ip,
                windows_firewall_off,
                sunmi_remote_assistance, device_serial_number,
                check_socket_server_ip, check_printer_connection,
                check_payment_method, check_custom_item,
                check_pax, check_customer_display,
                check_qr_order, check_close_counter,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            merchant_name, device_type,
            wifi_ssid, static_ip, anydesk_id, printer_ip,
            windows_firewall_off ? 1 : 0,
            sunmi_remote_assistance ? 1 : 0,
            device_serial_number || '',
            check_socket_server_ip ? 1 : 0,
            check_printer_connection ? 1 : 0,
            check_payment_method ? 1 : 0,
            check_custom_item ? 1 : 0,
            check_pax ? 1 : 0,
            check_customer_display ? 1 : 0,
            check_qr_order ? 1 : 0,
            check_close_counter ? 1 : 0,
            myt
        ).run();

        const deploymentId = result.meta.last_row_id;

        // Step 2: Filter and insert photos (each in its own try/catch)
        const MAX_PHOTO_SIZE = 500000; // 500KB max per photo base64 string
        const allPhotos = [
            ...(device_photos || []).map(p => ({ ...p, category: 'device' })),
            ...(printer_photos || []).map(p => ({ ...p, category: 'printer' })),
        ];

        let photosSaved = 0;
        let photosSkipped = 0;

        for (const photo of allPhotos) {
            // Skip photos without data or with oversized data
            if (!photo.data || photo.data.length > MAX_PHOTO_SIZE) {
                photosSkipped++;
                continue;
            }
            try {
                await env.DB.prepare(
                    'INSERT INTO deployment_photos (deployment_id, category, filename, data, created_at) VALUES (?, ?, ?, ?, ?)'
                ).bind(deploymentId, photo.category, photo.filename, photo.data, myt).run();
                photosSaved++;
            } catch (photoErr) {
                photosSkipped++;
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                id: deploymentId,
                photos_saved: photosSaved,
                photos_skipped: photosSkipped,
                warning: photosSkipped > 0 ? `${photosSkipped} photo(s) were too large and skipped. Please clear browser cache and try again.` : undefined
            }),
            { status: 201, headers: { 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

export async function onRequestPut(context) {
    const { env, request } = context;

    try {
        const body = await request.json();
        const { id, ...fields } = body;

        if (!id) {
            return new Response(
                JSON.stringify({ success: false, error: 'Missing deployment ID' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const {
            merchant_name, device_type,
            wifi_ssid, static_ip, anydesk_id, printer_ip,
            windows_firewall_off, sunmi_remote_assistance, device_serial_number,
            check_socket_server_ip, check_printer_connection, check_payment_method,
            check_custom_item, check_pax, check_customer_display,
            check_qr_order, check_close_counter,
        } = fields;

        await env.DB.prepare(`
            UPDATE deployments SET
                merchant_name = ?, device_type = ?,
                wifi_ssid = ?, static_ip = ?, anydesk_id = ?, printer_ip = ?,
                windows_firewall_off = ?,
                sunmi_remote_assistance = ?, device_serial_number = ?,
                check_socket_server_ip = ?, check_printer_connection = ?,
                check_payment_method = ?, check_custom_item = ?,
                check_pax = ?, check_customer_display = ?,
                check_qr_order = ?, check_close_counter = ?
            WHERE id = ?
        `).bind(
            merchant_name, device_type,
            wifi_ssid, static_ip, anydesk_id, printer_ip,
            windows_firewall_off ? 1 : 0,
            sunmi_remote_assistance ? 1 : 0,
            device_serial_number || '',
            check_socket_server_ip ? 1 : 0,
            check_printer_connection ? 1 : 0,
            check_payment_method ? 1 : 0,
            check_custom_item ? 1 : 0,
            check_pax ? 1 : 0,
            check_customer_display ? 1 : 0,
            check_qr_order ? 1 : 0,
            check_close_counter ? 1 : 0,
            id
        ).run();

        return new Response(
            JSON.stringify({ success: true }),
            { headers: { 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

export async function onRequestDelete(context) {
    const { env } = context;

    try {
        const url = new URL(context.request.url);
        const id = url.searchParams.get('id');

        if (!id) {
            return new Response(
                JSON.stringify({ success: false, error: 'Missing deployment ID' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Delete photos first, then deployment
        await env.DB.prepare('DELETE FROM deployment_photos WHERE deployment_id = ?').bind(id).run();
        await env.DB.prepare('DELETE FROM deployments WHERE id = ?').bind(id).run();

        return new Response(
            JSON.stringify({ success: true }),
            { headers: { 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
