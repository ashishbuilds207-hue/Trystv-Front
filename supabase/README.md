# TRYST Supabase Setup

Project URL: `https://oilpchbgufjtbxhpzula.supabase.co`

## 1. Run the database script

1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/oilpchbgufjtbxhpzula/sql)
2. Paste and run [`setup.sql`](./setup.sql) (full schema, RLS, RPCs, Storage policies, Realtime, dummy data)

## Auth (magic link)

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

### OTP table (store + match → token → next screen)

1. **Re-run** [`otp_table.sql`](./otp_table.sql) in Supabase SQL Editor (adds `consume_email_otp`)  
2. Auth → Providers → Email → **Confirm email = OFF**  
3. **Required for returning users:** Dashboard → Settings → API → copy **service_role** into `.env.local` as `SUPABASE_SERVICE_ROLE_KEY=` then restart `npm run dev`  
4. Flow: send → `store_email_otp` + Resend code → verify → `match_email_otp` → Supabase session tokens → client `setSession` → `/tonight` or `/register`  

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
