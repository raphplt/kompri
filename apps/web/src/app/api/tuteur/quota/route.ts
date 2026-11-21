import { tutorQuotaSchema } from '@kompri/shared';
import { api, ApiRequestError } from '../../../../lib/api';
import { getToken } from '../../../../lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const token = await getToken();
  if (!token)
    return Response.json({ code: 'unauthenticated' }, { status: 401 });
  try {
    return Response.json(
      await api('/tutor/quota', tutorQuotaSchema, { token }),
      {
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  } catch (error) {
    return Response.json(
      { code: error instanceof ApiRequestError ? error.code : 'generic' },
      { status: error instanceof ApiRequestError ? error.status : 500 },
    );
  }
}
