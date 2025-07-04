import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import axios from 'axios'
import crypto from 'crypto'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000
const CHAPA_AUTH_KEY = process.env.CHAPA_AUTH_KEY //Put Your Chapa Secret Key
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET // Webhook secret for signature verification
const CALLBACK_URL = process.env.CALLBACK_URL // Callback URL
// Enable CORS
app.use(cors())

// Parse JSON bodies
app.use(express.json())

// Your routes and API implementations go here

app.get('/', (req, res) => {
  console.log('✅ GET / - Root endpoint hit')
  res.send('Hello from Express with dotenv and cors!')
})

app.get('/test', (req, res) => {
  console.log('✅ GET /test - Test endpoint hit')
  res.json({
    message: 'Backend is working!',
    timestamp: new Date().toISOString(),
    status: 'success',
  })
})

app.post('/accept-payment', async (req, res) => {
  console.log('✅ Payment request:', req.body.amount, req.body.currency)

  const {
    amount,
    currency,
    email,
    first_name,
    last_name,
    phone_number,
    tx_ref,
  } = req.body
  try {
    const header = {
      headers: {
        Authorization: `Bearer ${CHAPA_AUTH_KEY}`,
        'Content-Type': 'application/json',
      },
    }
    const body = {
      amount: amount,
      currency: currency,
      email: email,
      first_name: first_name,
      last_name: last_name,
      phone_number: phone_number,
      tx_ref: tx_ref,
      return_url: 'http://localhost:5173/', // Set your return URL
      callback_url: CALLBACK_URL, // Webhook callback URL
      'customization[title]': 'Payment for My App',
      'customization[description]': 'Thank you for your payment',
      'meta[hide_receipt]': 'false',
    }

    const response = await axios.post(
      'https://api.chapa.co/v1/transaction/initialize',
      body,
      header,
    )

    console.log('✅ Payment initialized:', tx_ref)
    res.status(200).json(response.data)
  } catch (e: any) {
    console.log('❌ Payment error:', e.message)
    res.status(400).json({
      error_code: e.code,
      message: e.message,
    })
  }
})

// Callback endpoint for Chapa webhook
app.post('/payment-callback', async (req, res) => {
  console.log(
    '🔔 Payment callback received:',
    req.body.event || 'unknown event',
  )

  // Verify webhook signature
  const chapaSignature = req.headers['chapa-signature'] as string
  const xChapaSignature = req.headers['x-chapa-signature'] as string

  if (WEBHOOK_SECRET) {
    const payload = JSON.stringify(req.body)
    const expectedHash = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(payload)
      .digest('hex')

    const isChapaSignatureValid = chapaSignature === expectedHash
    const isXChapaSignatureValid = xChapaSignature === expectedHash

    if (!isChapaSignatureValid && !isXChapaSignatureValid) {
      console.log('❌ Invalid webhook signature')
      res.status(401).json({
        error: 'Invalid webhook signature',
        message: 'Webhook verification failed',
      })
      return
    }
    console.log('✅ Webhook signature verified')
  }

  try {
    const { tx_ref, status, currency, amount, event } = req.body

    // Verify the transaction with Chapa
    const verificationResponse = await axios.get(
      `https://api.chapa.co/v1/transaction/verify/${tx_ref}`,
      {
        headers: {
          Authorization: `Bearer ${CHAPA_AUTH_KEY}`,
          'Content-Type': 'application/json',
        },
      },
    )

    console.log('✅ Verification response:', verificationResponse.data)

    console.log('✅ Transaction verified:', tx_ref, status, event)

    // Here you can add your business logic
    // e.g., update database, send confirmation email, etc.

    res.status(200).json({
      message: 'Callback processed successfully',
      tx_ref,
      status,
      event,
      verified: true,
    })
  } catch (error: any) {
    console.log('❌ Callback error:', error.message)
    res.status(400).json({
      message: 'Callback processing failed',
      error: error.message,
    })
  }
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
