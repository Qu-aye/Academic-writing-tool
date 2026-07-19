# SewornaAI - Setup Guide

This guide walks you through setting up the development environment for SewornaAI.

## Prerequisites

- Node.js 18+ (tested with Node.js 24)
- npm or yarn
- MongoDB (local or Atlas)
- Firebase project
- Paystack account (for subscription features)

## 1. MongoDB Setup

### Option A: MongoDB Atlas (Recommended for cloud)

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. In Database Access, create a database user with read/write permissions
4. In Network Access, add your IP address or allow access from anywhere (0.0.0.0/0) for development
5. Get your connection string:
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string, replace `<password>` with your database user's password
   - Example: `mongodb+srv://username:password@cluster.mongodb.net/`

### Option B: Local MongoDB

Install MongoDB locally (https://www.mongodb.com/try/download/community) and use:
```
mongodb://localhost:27017
```

## 2. Firebase Setup

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Enable **Authentication**:
   - Go to Authentication → Sign-in method
   - Enable **Google** provider
4. Create a service account key:
   - Go to Project Settings → Service accounts
   - Click "Generate new private key"
   - Save the JSON file securely
5. Get your Firebase config:
   - Go to Project Settings → General
   - Scroll to "Your apps" section
   - If you don't have a web app, register one
   - Copy the Firebase configuration object (apiKey, authDomain, projectId, appId)

## 3. Paystack Setup (for subscriptions)

1. Create an account at [Paystack](https://paystack.com/)
2. Get your secret key:
   - Go to Settings → API Keys & Webhooks
   - Copy the "Secret Key" (starts with `sk_live_` or `sk_test_`)
3. Set up a webhook:
   - In the same section, add a new webhook endpoint
   - URL: `https://your-domain.com/api/webhooks/paystack` (or `http://localhost:4000/api/webhooks/paystack` for development)
   - Select events: `charge.success`, `subscription.disable`
   - Copy the "Webhook Secret" (this is the same as your secret key for Paystack)

**Note**: For local development, use a tool like [ngrok](https://ngrok.com/) to expose your localhost server to the internet so Paystack can send webhooks.

## 4. SMTP Setup (for contact form)

You can use any SMTP service:
- Gmail (requires app password if 2FA enabled)
- SendGrid
- Mailgun
- AWS SES
- Or your own mail server

Required settings:
- SMTP_HOST
- SMTP_PORT (usually 587 for TLS, 465 for SSL)
- SMTP_USER (email or username)
- SMTP_PASS (password or app password)
- CONTACT_FROM_EMAIL (the "from" address)
- CONTACT_TO_EMAIL (where contact form submissions are sent)

If you don't set these up, the contact form will fail silently (or return an error).

## 5. Environment Configuration

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and fill in all required values:

   **Server (.env in project root):**
   ```bash
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sewornaai
   MONGODB_DB_NAME=sewornaai
   FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}
   CLIENT_ORIGIN=http://localhost:5173
   PAYSTACK_SECRET_KEY=sk_test_...
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   CONTACT_FROM_EMAIL=your-email@gmail.com
   CONTACT_TO_EMAIL=admin@example.com
   ```

   **Client (apps/client/.env.development or apps/client/.env):**
   ```bash
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_APP_ID=your-app-id
   ```

   **Note**: Vite client environment variables must start with `VITE_` to be exposed to the client.

3. Create the client .env file:
   ```bash
   # From project root:
   cat > apps/client/.env.development << 'EOF'
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_APP_ID=your-app-id
   EOF
   ```

   Or you can set these in your shell before running the dev server.

## 6. Install Dependencies

From the project root:
```bash
npm install
```

This installs dependencies for both client and server (using workspaces).

## 7. Run the Application

Start both client and server in development mode:
```bash
npm run dev
```

This runs:
- Client: Vite dev server at http://localhost:5173
- Server: Express with tsx watch at http://localhost:4000

## 8. Verify Setup

1. Open http://localhost:5173 in your browser
2. Click "Sign in with Google" (or your auth button)
3. If authentication succeeds, you should see the editor interface
4. Try creating a document, searching for sources, and exporting

### Test Subscription Flow (Optional)

1. In the app, go to the Subscription page
2. Click "Upgrade to Premium"
3. You'll be redirected to Paystack (use test mode with test card numbers)
4. After payment, Paystack sends a webhook to update your subscription
5. Your subscription status should update in the app

**Note**: Webhooks require your server to be publicly accessible. Use ngrok for local testing:
```bash
ngrok http 4000
```
Then set your Paystack webhook URL to the ngrok URL.

## 9. Common Issues

### "MONGODB_URI is required for persistence"
- Ensure `.env` file exists in the project root
- Verify MONGODB_URI is set correctly
- Restart the dev server after adding environment variables

### "Firebase: No Firebase App '[DEFAULT]' has been created"
- Ensure client .env.development (or .env) has all VITE_FIREBASE_* variables
- Check that the Firebase config values are correct
- Restart the Vite dev server (it reads env vars at startup)

### "Invalid webhook signature" (Paystack)
- Ensure PAYSTACK_SECRET_KEY matches the webhook secret in Paystack dashboard
- Check that the webhook URL is correct and reachable from the internet
- Verify the webhook events are configured correctly

### "Network error when searching"
- Check that the server is running on http://localhost:4000
- Verify CORS: CLIENT_ORIGIN should match the client URL
- Check browser console and server logs for details

### "Cannot find module '...'"
- Run `npm install` again
- Delete `node_modules` and `package-lock.json` and run `npm install` again

## 10. Production Deployment

For production deployment (e.g., on Render.com):

1. Set all environment variables in the Render dashboard
2. Build command: `npm run build`
3. Start command: `node dist/server/index.js` (or use the build script output)
4. Ensure MongoDB, Firebase, and Paystack are configured for production URLs
5. Set CLIENT_ORIGIN to your production frontend URL
6. Update Paystack webhook URL to your production server endpoint

See `render.yaml` for service configuration.

## 11. Additional Resources

- [Tiptap Documentation](https://tiptap.dev/)
- [Citation.js Documentation](https://citation.js.org/)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Paystack Webhooks](https://paystack.com/docs/payments/webhooks)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
