# Telegram Gaming Payment Server

A production-ready Telegram bot for handling payments and withdrawals in gaming applications.

## Features

- **Payment Processing**: Handle user deposits via Chapa payment gateway
- **Withdrawal Management**: Process withdrawal requests to user bank accounts
- **Balance Tracking**: Real-time balance management for each user
- **Webhook Verification**: Secure webhook handling with signature verification
- **Session Management**: Efficient user session handling for Telegram interactions

## Quick Start

1. **Install dependencies**:

   ```bash
   bun install
   ```

2. **Set up environment variables**:

   ```env
   TELEGRAM_BOT_TOKEN=your_bot_token
   CHAPA_AUTH_KEY=your_chapa_key
   MONGODB_URL=your_mongodb_url
   WEBHOOK_SECRET=your_webhook_secret
   CALLBACK_URL=https://your-domain.com/callback
   ```

3. **Start the server**:
   ```bash
   bun run app.ts
   ```

## API Endpoints

- `GET /` - Health check
- `POST /callback` - Webhook endpoint for payment notifications
- `POST /api/payments/initialize` - Initialize payment
- `POST /api/payments/callback` - Payment webhook (alternative)
- `GET /api/payments/status/:tx_ref` - Check payment status
- `POST /api/withdrawals/initiate` - Initiate withdrawal
- `GET /api/withdrawals/verify/:reference` - Verify withdrawal
- `GET /api/balance/:userId` - Get user balance

## Webhook Setup

Configure your Chapa webhook URL to point to:

```
https://your-domain.com/callback
```

The webhook will automatically:

- Verify the signature using your `WEBHOOK_SECRET`
- Update user balances on successful payments
- Log all transaction details
