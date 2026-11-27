import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { z } from '@kompri/shared';

/** Errors exposed to clients carry a stable code and a French-free message. */
export class ApiException extends HttpException {
  constructor(
    status: HttpStatus,
    readonly code: string,
    message: string,
  ) {
    super({ statusCode: status, code, message }, status);
  }
}

export const notFound = (what: string) =>
  new ApiException(HttpStatus.NOT_FOUND, 'not_found', `${what} not found`);
export const conflict = (code: string, message: string) =>
  new ApiException(HttpStatus.CONFLICT, code, message);
export const forbidden = (code: string, message: string) =>
  new ApiException(HttpStatus.FORBIDDEN, code, message);
export const unauthorized = (
  code = 'unauthenticated',
  message = 'Authentication required',
) => new ApiException(HttpStatus.UNAUTHORIZED, code, message);

export function parseInput<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    // Paths only: request values may contain passwords or personal data.
    throw new ApiException(
      HttpStatus.BAD_REQUEST,
      'invalid_input',
      `Invalid fields: ${[...new Set(result.error.issues.map((i) => i.path.join('.') || '(root)'))].join(', ')}`,
    );
  return result.data;
}

@Catch()
export class ErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger('Api');
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host
      .switchToHttp()
      .getResponse<{ status(code: number): { json(body: unknown): void } }>();
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const code =
        exception instanceof ApiException
          ? exception.code
          : (HttpStatus[status]?.toLowerCase() ?? 'error');
      const message =
        typeof body === 'object' && body && 'message' in body
          ? String((body as { message: unknown }).message)
          : exception.message;
      response.status(status).json({ statusCode: status, code, message });
      return;
    }
    if (
      exception instanceof Error &&
      exception.name === 'PasswordHashingBusyError'
    ) {
      response.status(503).json({
        statusCode: 503,
        code: 'busy',
        message: 'The service is busy, try again shortly',
      });
      return;
    }
    // Never echo internal errors to the client: they may contain SQL, provider
    // or personal data. The log keeps the route and the stack, never the input.
    const request = host
      .switchToHttp()
      .getRequest<{ method?: string; route?: { path?: string } }>();
    this.logger.error(
      JSON.stringify({
        msg: 'internal_error',
        method: request?.method,
        route: request?.route?.path ?? 'unmatched',
        error: exception instanceof Error ? exception.name : 'Unknown error',
        stack:
          exception instanceof Error
            ? exception.stack?.split('\n').slice(1, 6).join('\n')
            : undefined,
      }),
    );
    response.status(500).json({
      statusCode: 500,
      code: 'internal_error',
      message: 'Internal server error',
    });
  }
}

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 'P2002'
  );
}
