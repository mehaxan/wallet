# Security Architecture

## Threat Model

Financial applications are high-value targets. Key threats and mitigations:

| Threat | Mitigation |
|---|---|
| **Account takeover** | Strong passwords, bcrypt hashing, rate limiting, optional 2FA |
| **Unauthorized data access** | JWT auth on every request, row-level ownership checks |
| **XSS (Cross-Site Scripting)** | httpOnly cookies, CSP headers, React escapes by default |
| **CSRF** | SameSite cookies, CSRF tokens on state-changing requests |
| **SQL injection** | Drizzle ORM parameterized queries (no raw SQL with user input) |
| **Mass assignment** | Explicit Zod schema validation — only allowed fields accepted |
| **Sensitive data exposure** | HTTPS everywhere, no secrets in logs, encryption for PII |
| **DDoS** | Cloudflare WAF + rate limiting at edge |
| **Insecure file uploads** | MIME type validation, max size limit, virus scan consideration |

---

## Authentication Security

```typescript
// Password hashing
import bcrypt from 'bcrypt';
const SALT_ROUNDS = 12;
const hash = await bcrypt.hash(password, SALT_ROUNDS);

// JWT configuration
const JWT_CONFIG = {
  algorithm: 'HS256',
  expiresIn: '30d',
  issuer: 'wallet.mehaxan.com',
};

// Cookie configuration
const COOKIE_CONFIG = {
  httpOnly: true,       // not accessible by JavaScript
  secure: true,         // HTTPS only
  sameSite: 'strict',   // CSRF protection
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  path: '/',
};
```

---

## Authorization (Row-Level Security)

Every API query filters by the authenticated user's ownership:

```typescript
// Example: Get transactions (enforced ownership)
async function getTransactions(userId: string, householdId: string | null, query: QueryParams) {
  return prisma.transaction.findMany({
    where: {
      OR: [
        { userId },  // own transactions
        {
          householdId,            // household shared transactions
          visibility: 'HOUSEHOLD',
        },
      ],
      ...buildDateFilter(query),
    },
  });
}
```

---

## HTTP Security Headers

Configured in Next.js `next.config.js` and Fastify:

```typescript
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), microphone=(), geolocation=()',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",  // Next.js requires unsafe-eval
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: *.cloudflare.com",
      "font-src 'self'",
      "connect-src 'self' api.wallet.mehaxan.com wss://api.wallet.mehaxan.com",
      "frame-ancestors 'none'",
    ].join('; '),
  },
];
```

---

## Rate Limiting

```typescript
// Redis-backed rate limiting with sliding window
const RATE_LIMITS = {
  default:          { max: 100,  windowMs: 60_000 },  // 100 req/min
  auth:             { max: 10,   windowMs: 60_000 },  // 10 auth attempts/min
  upload:           { max: 20,   windowMs: 60_000 },  // 20 uploads/min
  reportGenerate:   { max: 5,    windowMs: 3600_000 }, // 5 reports/hour
};
```

---

## File Upload Security

```typescript
const UPLOAD_CONFIG = {
  maxFileSizeBytes: 10 * 1024 * 1024,  // 10MB
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'application/pdf',
  ],
};

// Validate on server (never trust client)
function validateUpload(file: MultipartFile) {
  if (file.file.bytesRead > UPLOAD_CONFIG.maxFileSizeBytes) {
    throw new Error('File too large');
  }
  if (!UPLOAD_CONFIG.allowedMimeTypes.includes(file.mimetype)) {
    throw new Error('Invalid file type');
  }
  // Check magic bytes (don't trust Content-Type header alone)
  const magic = await getMagicBytes(file);
  if (!isValidImageMagic(magic)) {
    throw new Error('File content mismatch');
  }
}
```

---

## Data Privacy

- **No PII in logs:** Never log email, password, financial amounts in application logs
- **Encryption at rest:** Neon PostgreSQL and Cloudflare R2 both encrypt data at rest
- **TIN number:** Stored but not indexed (query by userId only)
- **Phone numbers in debts:** Stored as-is, not shared with any 3rd party
- **Gemini API calls:** Only OCR text (no user PII) is sent to Gemini API

---

## Environment Secrets Management

Never commit secrets to git. Use Railway's secret management:

```
# Required environment variables (Railway secrets)
DATABASE_URL=                    # Railway Postgres (use ${{Postgres.DATABASE_URL}})
UPSTASH_REDIS_REST_URL=          # Upstash Redis REST URL
UPSTASH_REDIS_REST_TOKEN=        # Upstash Redis REST token
JWT_SECRET=                      # 256-bit random secret (openssl rand -hex 32)
GEMINI_API_KEY=                  # Google Gemini Flash (aistudio.google.com)
R2_ACCOUNT_ID=                   # Cloudflare R2
R2_ACCESS_KEY_ID=                # Cloudflare R2
R2_SECRET_ACCESS_KEY=            # Cloudflare R2
R2_BUCKET=                       # Cloudflare R2 bucket name
NEXT_PUBLIC_APP_URL=             # https://wallet.mehaxan.com
RESEND_API_KEY=           # Email service
```

---

## Cloudflare WAF Rules

Enable these Cloudflare WAF rules for additional protection:
1. **OWASP Core Rule Set** — blocks common web attacks
2. **Bot Fight Mode** — blocks malicious bots
3. **Rate Limiting Rule** — 100 req/min per IP at edge (before Railway)
4. **Country blocking** — optional, if only expecting BD traffic
