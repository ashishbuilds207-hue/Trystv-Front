# TRYST Supabase Setup

Project URL: `https://oilpchbgufjtbxhpzula.supabase.co`

## 1. Run the database script

1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/oilpchbgufjtbxhpzula/sql)
2. Paste and run [`setup.sql`](./setup.sql) (full schema, RLS, RPCs, Storage policies, Realtime, dummy data)

## Auth (email + phone OTP)

1. Run [`auth_phone_and_hide.sql`](./auth_phone_and_hide.sql) in the SQL Editor (phone column, OTP by email/phone, **Hide from** list).
2. Auth → Providers → Email → **Confirm email = OFF**
3. Put `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` (required for OTP session creation).

**Login / register:** user can enter **email only**, **phone only**, or **both**. Same 6-digit OTP is stored for each channel entered. Email via Resend/SendGrid; SMS via Twilio when configured:

```env
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1...   # or TWILIO_MESSAGING_SERVICE_SID=MG...
OTP_DEV_SHOW_CODE=true     # show code on screen while SMS/email is being set up
```

### Hide my profile from (contacts)

On **You → Hide from**, the owner adds unlimited emails/phones to `profile_hide_entries`.

- If a viewer later signs up or logs in with a matching email **or** phone, they **cannot** see the owner’s profile (orbits, discover, likes, profile page).
- Everyone else still sees the owner normally.
- Matching uses RPCs `profile_hidden_from_viewer` and `owners_hidden_from_me`.

## Auth (magic link) — optional alternate

Dashboard → **Authentication** → **URL Configuration**:

- Site URL: `http://localhost:3000`
- Redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/auth/callback?**`
  - production Amplify URL `/auth/callback`

Email uses the **Magic Link** template (“Your sign-in link” / Sign in button). OTP digits are not used.

Flow: email → link in inbox → `/auth/callback?code=…` → session → app (or register if profile incomplete).

### OTP emails (SendGrid)

1. Open [SendGrid API Keys](https://app.sendgrid.com/settings/api_keys) → **Create API Key** (Mail Send)  
2. Verify a sender: [Sender Authentication](https://app.sendgrid.com/settings/sender_auth) (Single Sender or Domain)  
3. Put in `.env.local`:

```env
SENDGRID_API_KEY=SG.xxxx
SENDGRID_FROM_EMAIL=TRYST <you@yourverifieddomain.com>
```

4. Restart `npm run dev`  
If `SENDGRID_API_KEY` is set, OTP uses SendGrid (Resend is fallback only).

### OTP table (legacy email-only)

Prefer [`auth_phone_and_hide.sql`](./auth_phone_and_hide.sql). Older [`otp_table.sql`](./otp_table.sql) only covered email.  
Flow: send → `store_otp` + email/SMS → verify → `match_otp` → Supabase session → `/tonight` or `/register`.

If verify still fails for an old test account without service_role: Authentication → Users → delete that email → request a new code.


## 3. API keys → `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://oilpchbgufjtbxhpzula.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<Dashboard → Settings → API → publishable / anon key>
SUPABASE_SERVICE_ROLE_KEY=<service_role — server only, never commit>
```

## 4. Storage

Buckets `photos` and `echoes` are created by `setup.sql`. Confirm under **Storage**.

## 5. Razorpay webhook

Dashboard Razorpay → Webhooks:

- URL: `https://<your-app>/api/payments/razorpay/webhook`
- Events: `payment.captured`

Env:

```env
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
```

## 7. Realtime (chat, notifications, online)

Supabase Realtime is the socket layer (no separate Socket.IO server).

1. Run [`enable_realtime.sql`](./enable_realtime.sql) in the SQL Editor  
2. Confirm Dashboard → **Database → Publications → supabase_realtime** lists:
   - `messages`, `notifications`, `matches`, `swipes`, `conversations`, `echo_reactions`
3. The app (`useSocket`) then live-updates:
   - **Chat** messages + typing
   - **Notifications** bell + toasts
   - **Likes** when someone swipes you
   - **Matches** when a spark lands
   - **Online / Offline** presence (`tryst-online` channel)

Also already included in [`setup.sql`](./setup.sql) for fresh installs.

## 8. Frontend

```bash
cd TRYSTV1
npm install
npm run dev
```

Flow: **User → Next.js → Razorpay → webhook → Next.js → Supabase DB**.

All product data (auth, profiles, chat, echoes, notifications) goes through Supabase. Only payment secrets stay in Next.js API routes.
