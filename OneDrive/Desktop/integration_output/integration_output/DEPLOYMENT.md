# Eduzyra — Production Deployment Checklist

**Last updated:** 2026-08-01

This document covers everything you need to deploy Eduzyra to production.

---

## Prerequisites

- A server (VPS, EC2, or equivalent) with:
  - Node.js 20+ installed (or Docker)
  - MongoDB 7+ (or MongoDB Atlas connection string)
  - A domain name with DNS pointing to your server
  - SSL certificate (use Let's Encrypt / Certbot for free SSL)
- Accounts with:
  - Razorpay (for payments) — get LIVE keys
  - Cloudinary (for file uploads) — free tier is sufficient
  - An SMTP provider (Gmail App Password or Brevo) — for transactional emails

---

## Environment Variables (Backend `.env`)

Before deploying, set ALL of these in `eduzyra-backend/.env`:

### Critical (must change from defaults)

| Variable | Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Enables Winston file logging, Helmet CSP, etc. |
| `JWT_SECRET` | 64-char random hex | Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `MONGO_URI` | `mongodb+srv://...` | MongoDB Atlas connection string |
| `CLIENT_ORIGIN` | `https://yourdomain.com` | Your production frontend URL. Comma-separate multiple origins. |

### Razorpay (use LIVE keys, not test keys)

| Variable | Value |
|---|---|
| `RAZORPAY_KEY_ID` | `rzp_live_xxxxx` |
| `RAZORPAY_KEY_SECRET` | (from Razorpay dashboard) |
| `RAZORPAY_WEBHOOK_SECRET` | (from Razorpay dashboard → Webhooks) |

### Email (SMTP)

| Variable | Value |
|---|---|
| `SMTP_HOST` | `smtp.gmail.com` or `smtp-relay.brevo.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | your email address |
| `SMTP_PASS` | app password / SMTP key |
| `EMAIL_FROM_NAME` | `Eduzyra` |
| `EMAIL_FROM_ADDRESS` | `noreply@yourdomain.com` |

### Cloudinary

| Variable | Value |
|---|---|
| `CLOUDINARY_CLOUD_NAME` | (from Cloudinary dashboard) |
| `CLOUDINARY_API_KEY` | (from Cloudinary dashboard) |
| `CLOUDINARY_API_SECRET` | (from Cloudinary dashboard) |

---

## Environment Variables (Frontend `.env`)

| Variable | Value |
|---|---|
| `VITE_RAZORPAY_KEY_ID` | Same `RAZORPAY_KEY_ID` as backend (public key, safe for browser) |

---

## Deployment Steps

### Option A: Docker Compose (Recommended)

```bash
# 1. Clone the repo
git clone <your-repo-url> eduzyra
cd eduzyra

# 2. Configure backend env
cp eduzyra-backend/.env.example eduzyra-backend/.env
nano eduzyra-backend/.env  # fill in all variables

# 3. Configure frontend env
cp Eduzyra-By-Althexus-frontend/.env.example Eduzyra-By-Althexus-frontend/.env
nano Eduzyra-By-Althexus-frontend/.env  # set VITE_RAZORPAY_KEY_ID

# 4. Build and start all services
docker-compose up -d --build

# 5. Run the seed (once, after first deploy)
docker-compose exec backend npm run seed

# 6. Change the admin password immediately
# Log in as admin@eduzyra.dev / ChangeMe123! and change it via Profile page
```

### Option B: PM2 + Nginx (Manual)

```bash
# Backend
cd eduzyra-backend
npm ci --only=production
npm run seed  # once
npm run start:prod  # PM2 cluster mode

# Frontend
cd ../Eduzyra-By-Althexus-frontend
npm ci
npm run build
# Serve dist/ via Nginx (see nginx.conf for config)
```

---

## Post-Deployment Checklist

- [ ] `NODE_ENV=production` is set
- [ ] `JWT_SECRET` is a 64-character random string (not the default)
- [ ] `MONGO_URI` points to MongoDB Atlas (not localhost)
- [ ] `CLIENT_ORIGIN` is set to your production domain
- [ ] Razorpay LIVE keys are configured (not test keys)
- [ ] Razorpay webhook URL is set to `https://yourdomain.com/api/payments/webhook`
- [ ] Razorpay webhook events subscribed: `payment.captured`, `payment.failed`, `refund.processed`
- [ ] SMTP variables are set and password reset emails are received
- [ ] Cloudinary variables are set and avatar upload works
- [ ] `npm run seed` has been run once (creates courses, coupons, admin user)
- [ ] Admin password changed from `ChangeMe123!` immediately after first login
- [ ] SSL certificate is installed (HTTPS working)
- [ ] `GET /api/health` returns `{ status: 'ok', db: 'connected' }`
- [ ] Test a real payment end-to-end with a small amount
- [ ] Test the webhook by completing a payment and confirming enrollment
- [ ] Test password reset flow end-to-end
- [ ] Test certificate download (PDF with QR code)

---

## Monitoring

- **Health check:** `GET /api/health` returns DB state, uptime, timestamp
- **Logs:** `eduzyra-backend/logs/error.log` (errors only) and `logs/combined.log` (all)
- **PM2:** `pm2 status`, `pm2 logs eduzyra-api`
- **Docker:** `docker-compose logs -f backend`

---

## Security Reminders

1. **Never commit `.env` to git.** It's in `.gitignore` — verify before pushing.
2. **Rotate the JWT secret** if it was ever committed to git history.
3. **Change the admin password** from `ChangeMe123!` immediately after first login.
4. **Use HTTPS only.** Configure HSTS in Nginx.
5. **Rate limit aggressively.** The backend has rate limiters, but consider Cloudflare for DDoS protection.
6. **Monitor logs** for suspicious activity (failed login spikes, webhook signature failures).
