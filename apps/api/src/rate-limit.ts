/** The parts of Express request and response objects this module uses. */
interface Request {
  method: string;
  path: string;
  ip?: string;
  header(name: string): string | undefined;
}
interface Response {
  status(code: number): { json(body: unknown): void };
}
type NextFunction = () => void;

/**
 * Sliding-window limiter kept in memory: enough for a single API process.
 * Several processes would each count separately (stated in docs/deploiement.md).
 */
export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly clock: () => Date,
  ) {}

  /** Records a hit; false when the key already used its quota. */
  hit(key: string): boolean {
    const now = this.clock().getTime();
    const recent = (this.hits.get(key) ?? []).filter(
      (at) => at > now - this.windowMs,
    );
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    // Keep memory bounded under a flood of distinct keys.
    if (this.hits.size > 50_000)
      this.hits.delete(this.hits.keys().next().value!);
    return true;
  }
}

/**
 * The browser never reaches the API: the web server calls it and forwards the
 * visitor's address, as the HTTPS proxy gave it, in this header. The API must
 * therefore never be exposed directly (see compose.prod.yaml).
 */
export const clientAddressHeader = 'x-kompri-client-ip';

export function clientAddress(request: Request) {
  const forwarded = request.header(clientAddressHeader)?.trim();
  return forwarded && forwarded.length <= 64
    ? forwarded
    : (request.ip ?? 'unknown');
}

export interface AuthLimits {
  AUTH_LOGIN_LIMIT: number;
  AUTH_SIGNUP_LIMIT: number;
  AUTH_MAIL_LIMIT: number;
}

/** Per-address limits on the unauthenticated, costly or mail-sending routes. */
export function authRateLimits(limits: AuthLimits, clock: () => Date) {
  const minute = 60_000;
  const rules: [RegExp, RateLimiter][] = [
    [
      /^\/auth\/login$/,
      new RateLimiter(limits.AUTH_LOGIN_LIMIT, 15 * minute, clock),
    ],
    [
      /^\/auth\/register$/,
      new RateLimiter(limits.AUTH_SIGNUP_LIMIT, 60 * minute, clock),
    ],
    [
      /^\/(auth\/password\/forgot|me\/email\/verification)$/,
      new RateLimiter(limits.AUTH_MAIL_LIMIT, 60 * minute, clock),
    ],
    [
      /^\/auth\/(password\/reset|email\/verify)$/,
      new RateLimiter(limits.AUTH_LOGIN_LIMIT, 15 * minute, clock),
    ],
  ];
  return (request: Request, response: Response, next: NextFunction) => {
    if (request.method !== 'POST') return next();
    const rule = rules.find(([pattern]) => pattern.test(request.path));
    if (rule && !rule[1].hit(clientAddress(request))) {
      response.status(429).json({
        code: 'rate_limited',
        message: 'Too many requests, try again later',
      });
      return;
    }
    next();
  };
}
