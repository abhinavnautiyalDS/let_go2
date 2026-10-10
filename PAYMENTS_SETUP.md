# LET GO payments setup

This branch adds server-created hosted checkout for the ₹5 keepsake and optional support. It deliberately does not include live credentials. Payments stay disabled until the provider accounts and secrets below are configured.

## Provider routing

- Cloudflare's `CF-IPCountry` request header is used to choose the India flow. If the visitor is not identified as India, the international flow is used.
- India: Razorpay Payment Links (INR, UPI/card methods enabled on your Razorpay account).
- Outside India: Stripe Checkout (USD). Stripe account availability and international payment acceptance depend on your business/account eligibility.
- The server accepts only fixed allow-listed amounts. It never accepts a client-supplied arbitrary price.
- Secret keys are read only by server routes. Never put provider secret keys in `NEXT_PUBLIC_*` variables or commit them to Git.

## Configure secrets in Cloudflare

For the deployed Worker, add these as Worker secrets/environment variables using the Cloudflare dashboard or Wrangler secret commands for the actual Worker:

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_SITE_URL` = `https://let-go2.abhinavnautiyal96.workers.dev`

Use Razorpay test credentials and Stripe test secret keys first. Test successful payments, cancelled payments, mobile UPI, and international cards before enabling live credentials. Keep test and live keys separate.

## Provider account setup

1. Create a Razorpay account at https://razorpay.com/ and complete identity/business verification. Enable Payment Links and the payment methods you want to accept. International payments may require additional activation.
2. Create a Stripe account at https://stripe.com/ if eligible for your business/country. Complete onboarding and enable Checkout. Stripe availability for Indian businesses can be restricted or subject to invitation/eligibility, so do not assume account creation is guaranteed.
3. Add test keys to Cloudflare secrets, deploy this branch to a preview Worker, and run test payments.
4. Only after end-to-end verification, configure live keys.

## Prices currently allow-listed

- Keepsake card: ₹5 for visitors identified in India; $1 USD internationally.
- Optional support (India): ₹99, ₹199, ₹499.
- Optional support (international): $3, $5, $10.

Review these prices and the exact legal/tax disclosures before going live.

## Important production hardening still required

The hosted checkout creation and server-side verification endpoints are a starting integration, not a complete production payment ledger. Before accepting live money, add provider webhooks with signature verification and durable order records/idempotency, ensure the app only reveals a paid keepsake after a verified paid result, and test Cloudflare runtime compatibility. Never trust a success query parameter alone.
