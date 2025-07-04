# API Testing Guide

This guide shows you how to test each endpoint using Postman or any API tester.

## Base URL

```
http://localhost:5000
```

## 1. Test Root Endpoint

**Method:** GET
**URL:** `http://localhost:5000/`

**Expected Response:**

```json
"Hello from Express with dotenv and cors!"
```

---

## 2. Test Health Check

**Method:** GET
**URL:** `http://localhost:5000/test`

**Expected Response:**

```json
{
  "message": "Backend is working!",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "status": "success"
}
```

---

## 3. Test Payment Initialization

**Method:** POST
**URL:** `http://localhost:5000/accept-payment`
**Headers:**

```
Content-Type: application/json
```

**Request Body:**

```json
{
  "amount": "100",
  "currency": "ETB",
  "email": "test@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "phone_number": "251900000000",
  "tx_ref": "test-payment-123"
}
```

**Expected Response:**

```json
{
  "status": "success",
  "message": "Hosted Link",
  "data": {
    "checkout_url": "https://checkout.chapa.co/checkout/payment/...",
    "reference": "test-payment-123",
    "amount": "100",
    "currency": "ETB"
  }
}
```

---

## 4. Test Webhook Callback (Simulation)

**Method:** POST
**URL:** `http://localhost:5000/payment-callback`
**Headers:**

```
Content-Type: application/json
```

**Request Body (Success Event):**

```json
{
  "event": "charge.success",
  "first_name": "John",
  "last_name": "Doe",
  "email": "test@example.com",
  "mobile": "251900000000",
  "currency": "ETB",
  "amount": "100.00",
  "charge": "3.00",
  "status": "success",
  "mode": "live",
  "reference": "test-payment-123",
  "tx_ref": "test-payment-123",
  "payment_method": "telebirr",
  "created_at": "2024-01-15T10:30:00.000000Z",
  "updated_at": "2024-01-15T10:35:00.000000Z",
  "type": "API"
}
```

**Request Body (Failed Event):**

```json
{
  "event": "charge.failed",
  "first_name": "John",
  "last_name": "Doe",
  "email": "test@example.com",
  "mobile": "251900000000",
  "currency": "ETB",
  "amount": "100.00",
  "charge": "3.00",
  "status": "failed",
  "mode": "live",
  "reference": "test-payment-123",
  "tx_ref": "test-payment-123",
  "payment_method": "telebirr",
  "created_at": "2024-01-15T10:30:00.000000Z",
  "updated_at": "2024-01-15T10:35:00.000000Z",
  "type": "API"
}
```

**Expected Response:**

```json
{
  "message": "Callback processed successfully",
  "tx_ref": "test-payment-123",
  "status": "success",
  "verified": true
}
```

---

## Testing with Postman

### Step 1: Create a Collection

1. Open Postman
2. Click "New" → "Collection"
3. Name it "Chapa Payment API"

### Step 2: Add Environment Variables

1. Click "Environments" → "New"
2. Name it "Local Development"
3. Add these variables:
   - `base_url`: `http://localhost:5000`
   - `chapa_key`: Your Chapa API key

### Step 3: Create Requests

#### Request 1: Health Check

- Method: GET
- URL: `{{base_url}}/test`

#### Request 2: Payment Request

- Method: POST
- URL: `{{base_url}}/accept-payment`
- Headers: `Content-Type: application/json`
- Body (raw JSON):

```json
{
  "amount": "100",
  "currency": "ETB",
  "email": "test@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "phone_number": "251900000000",
  "tx_ref": "test-{{$timestamp}}"
}
```

#### Request 3: Webhook Simulation

- Method: POST
- URL: `{{base_url}}/payment-callback`
- Headers: `Content-Type: application/json`
- Body (raw JSON): Use the webhook payload examples above

---

## Testing with cURL

### Test Root Endpoint

```bash
curl -X GET http://localhost:5000/
```

### Test Health Check

```bash
curl -X GET http://localhost:5000/test
```

### Test Payment Request

```bash
curl -X POST http://localhost:5000/accept-payment \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "100",
    "currency": "ETB",
    "email": "test@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "phone_number": "251900000000",
    "tx_ref": "test-payment-123"
  }'
```

### Test Webhook Callback

```bash
curl -X POST http://localhost:5000/payment-callback \
  -H "Content-Type: application/json" \
  -d '{
    "event": "charge.success",
    "first_name": "John",
    "last_name": "Doe",
    "email": "test@example.com",
    "mobile": "251900000000",
    "currency": "ETB",
    "amount": "100.00",
    "status": "success",
    "reference": "test-payment-123",
    "tx_ref": "test-payment-123",
    "type": "API"
  }'
```

---

## Testing Checklist

- [ ] Server is running (`bun run server.ts`)
- [ ] Root endpoint returns welcome message
- [ ] Health check returns success status
- [ ] Payment request creates checkout URL
- [ ] Webhook callback processes events
- [ ] Error handling works for invalid requests

## Common Issues

1. **CORS Error**: Make sure the server is running and CORS is enabled
2. **Connection Refused**: Check if the server is running on port 5000
3. **Invalid JSON**: Ensure request body is valid JSON
4. **Missing Headers**: Add `Content-Type: application/json` for POST requests
