# Webhook Setup Guide

## Overview

Your server now has both:

1. **Express Server** (Port 5000) - Handles webhooks and API endpoints
2. **Telegram Bot** - Handles user interactions

## Setup Steps

### 1. Install ngrok

```bash
# Using npm
npm install -g ngrok

# Using snap (Ubuntu)
sudo snap install ngrok

# Using wget
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
tar xvzf ngrok-v3-stable-linux-amd64.tgz
sudo mv ngrok /usr/local/bin
```

### 2. Start your server

```bash
cd server
bun run server.ts
```

You should see:

```
🚀 Express server running on port 5000
🌐 Webhook URL: http://localhost:5000/payment-callback
🤖 Starting Telegram bot...
```

### 3. Expose with ngrok

In a new terminal:

```bash
ngrok http 5000
```

You'll get output like:

```
Forwarding    https://abc123.ngrok.io -> http://localhost:5000
```

### 4. Update Chapa Webhook URL

Copy the ngrok URL and update your Chapa webhook settings:

**Webhook URL:** `https://abc123.ngrok.io/payment-callback`

### 5. Test the setup

#### Test Express Server:

```bash
curl http://localhost:5000/test
```

#### Test Webhook (simulate Chapa callback):

```bash
curl -X POST http://localhost:5000/payment-callback \
  -H "Content-Type: application/json" \
  -d '{
    "event": "charge.success",
    "tx_ref": "test-123",
    "amount": "100.00",
    "currency": "ETB",
    "status": "success"
  }'
```

## Available Endpoints

| Endpoint            | Method | Description            |
| ------------------- | ------ | ---------------------- |
| `/`                 | GET    | Server status          |
| `/test`             | GET    | Health check           |
| `/payment-callback` | POST   | Chapa webhook          |
| `/accept-payment`   | POST   | Payment initialization |
| `/balance`          | GET    | Get current balance    |

## Environment Variables

Make sure these are set in your `.env` file:

```env
TELEGRAM_BOT_TOKEN=your_bot_token
CHAPA_AUTH_KEY=your_chapa_key
MONGODB_URL=your_mongodb_url
PORT=5000
```

## Troubleshooting

### Port already in use

```bash
# Check what's using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>
```

### ngrok not working

- Make sure ngrok is authenticated: `ngrok authtoken YOUR_TOKEN`
- Check if port 5000 is accessible locally first

### Webhook not receiving calls

- Verify ngrok URL is correct
- Check server logs for incoming requests
- Ensure Chapa webhook URL is updated

## Production Deployment

For production, replace ngrok with:

- **Vercel** - Easy deployment
- **Railway** - Simple hosting
- **Heroku** - Traditional hosting
- **DigitalOcean** - VPS hosting

The webhook URL would be: `https://your-domain.com/payment-callback`
