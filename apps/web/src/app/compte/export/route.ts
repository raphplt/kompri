import { z } from '@kompri/shared';
import { api, ApiRequestError } from '../../../lib/api';
import { getToken } from '../../../lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const token = await getToken();
  if (!token) return new Response(null, { status: 401 });
  try {
    const data = await api('/me/export', z.unknown(), { token });
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': 'attachment; filename="kompri-mes-donnees.json"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return new Response(null, {
      status: error instanceof ApiRequestError ? error.status : 500,
    });
  }
}
