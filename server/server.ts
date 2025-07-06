import { Bot, InlineKeyboard, Keyboard } from 'grammy'
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import axios from 'axios'
import crypto from 'crypto'
import mongoose from 'mongoose'
import Balance from './models/Balance.js'

dotenv.config()

// Environment variables
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const CHAPA_AUTH_KEY = process.env.CHAPA_AUTH_KEY //Put Your Chapa Secret Key
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET // Webhook secret for signature verification
const CALLBACK_URL = process.env.CALLBACK_URL // Callback URL
const MONGODB_URL = process.env.MONGODB_URL // MongoDB connection URL
const BOT_RETURN_URL = process.env.BOT_RETURN_URL // Bot return URL
const PORT = process.env.PORT || 5000

if (!TELEGRAM_BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN is required')
}

// Connect to MongoDB
mongoose
  .connect(MONGODB_URL || 'mongodb://localhost:27017/chapa-payments')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.log('❌ MongoDB connection error:', err))

// Create Express app
const app = express()

// Enable CORS from everywhere
app.use(cors())

// Parse JSON bodies for all routes except webhook
app.use((req, res, next) => {
  if (req.path === '/payment-callback') {
    // For webhook, use raw body parsing
    express.raw({ type: 'application/json' })(req, res, next)
  } else {
    // For other routes, use JSON parsing
    express.json()(req, res, next)
  }
})

// Basic routes
app.get('/', (req, res) => {
  console.log('✅ GET / - Root endpoint hit')
  res.json({ message: 'Chapa Payment Server with Telegram Bot' })
})

// Callback endpoint for Chapa webhook
app.post('/payment-callback', async (req, res) => {
  try {
    // Parse the raw body for webhook verification
    const rawBody = req.body.toString('utf8')
    const webhookData = JSON.parse(rawBody)

    console.log(
      '🔔 Payment callback received:',
      webhookData.event || 'unknown event',
    )

    // Verify webhook signature
    const chapaSignature = req.headers['chapa-signature'] as string
    const xChapaSignature = req.headers['x-chapa-signature'] as string

    if (WEBHOOK_SECRET) {
      const expectedHash = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(rawBody)
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

    const { tx_ref, status, currency, amount, event } = webhookData

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

    // Increment balance on successful payment
    if (status === 'success' && event === 'charge.success') {
      try {
        const balance = (await Balance.findOne()) || new Balance()
        balance.balance += parseFloat(amount)
        balance.lastUpdated = new Date()
        await balance.save()
        console.log('💰 Balance incremented by:', amount, currency)
      } catch (error: any) {
        console.log('❌ Balance increment error:', error.message)
      }
    }

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

// Start Express server
app.listen(PORT, () => {
  console.log(`🚀 Express server running on port ${PORT}`)
  console.log(`🌐 Webhook URL: ${CALLBACK_URL}`)
})

// Create a new bot instance
const bot = new Bot(TELEGRAM_BOT_TOKEN)

// Store user states and payment data
const userStates = new Map<number, string>()
const userPaymentData = new Map<
  number,
  {
    amount: string
    mobile: string
  }
>()

// Main menu keyboard
const mainMenu = new Keyboard()
  .text('💰 Make Payment')
  .text('💳 Check Balance')
  .row()
  .text('❓ Help')

// Start command
bot.command('start', async (ctx) => {
  const welcomeMessage = `
🎉 Welcome to Chapa Payment Bot!

I can help you:
• 💰 Make payments securely
• 💳 Check current balance
• ❓ Get help

Choose an option from the menu below:
  `

  await ctx.reply(welcomeMessage, {
    reply_markup: mainMenu,
  })
})

// Handle menu buttons
bot.hears('💰 Make Payment', async (ctx) => {
  userStates.set(ctx.from!.id, 'awaiting_amount')
  await ctx.reply('💳 Enter the payment amount (e.g., 100):')
})

bot.hears('💳 Check Balance', async (ctx) => {
  try {
    const balance = (await Balance.findOne()) || new Balance()
    const balanceMessage = `
💰 Current Balance:

Amount: ${balance.balance} ${balance.currency}
Last Updated: ${balance.lastUpdated.toLocaleString()}
    `
    await ctx.reply(balanceMessage, {
      reply_markup: mainMenu,
    })
  } catch (error: any) {
    console.log('❌ Balance fetch error:', error.message)
    await ctx.reply('❌ Failed to fetch balance. Please try again.', {
      reply_markup: mainMenu,
    })
  }
})

bot.hears('❓ Help', async (ctx) => {
  const helpMessage = `
❓ How to use this bot:

1. 💰 Make Payment
   • Enter the amount
   • Enter your phone number
   • Get payment link

2. 💳 Check Balance
   • View current balance

Payment Process:
• Your payment will be automatically confirmed via webhook
• Balance will be updated automatically after successful payment
• No manual confirmation needed

For support, contact: @your_support_handle
  `
  await ctx.reply(helpMessage, {
    reply_markup: mainMenu,
  })
})

// Handle text input for payment details
bot.on('message:text', async (ctx) => {
  const userId = ctx.from!.id
  const state = userStates.get(userId)
  const text = ctx.message.text

  if (!state) return

  switch (state) {
    case 'awaiting_amount':
      const amount = parseFloat(text)
      if (isNaN(amount) || amount <= 0) {
        await ctx.reply('❌ Please enter a valid amount (e.g., 100):')
        return
      }

      userPaymentData.set(userId, {
        amount: text,
        mobile: '',
      })

      userStates.set(userId, 'awaiting_mobile')
      await ctx.reply(
        '📱 Enter your phone number (with country code, e.g., +251900000000):',
      )
      break

    case 'awaiting_mobile':
      userPaymentData.get(userId)!.mobile = text

      // Process payment immediately
      await processPayment(ctx, userId)
      break
  }
})

// Process payment function
async function processPayment(ctx: any, userId: number) {
  const paymentData = userPaymentData.get(userId)

  if (!paymentData) {
    await ctx.reply('❌ Payment data not found. Please start over.')
    return
  }

  try {
    await ctx.reply('🔄 Processing your payment...')

    const tx_ref = `telegram-${userId}-${Date.now()}`
    const requestPayload = {
      amount: paymentData.amount,
      currency: 'ETB',
      email: `user${userId}@telegram.com`,
      first_name: 'Telegram',
      last_name: 'User',
      phone_number: paymentData.mobile,
      tx_ref: tx_ref,
      return_url: BOT_RETURN_URL,
      callback_url: CALLBACK_URL, // Webhook callback URL
      'customization[title]': 'Payment for My App',
      'customization[description]': 'Thank you for your payment',
      'meta[hide_receipt]': 'false',
    }

    console.log('📤 Sending request to Chapa:', requestPayload)

    const response = await axios.post(
      'https://api.chapa.co/v1/transaction/initialize',
      requestPayload,
      {
        headers: {
          Authorization: `Bearer ${CHAPA_AUTH_KEY}`,
          'Content-Type': 'application/json',
        },
      },
    )

    console.log('✅ Chapa API response:', response.data)

    if (response.data.data?.checkout_url) {
      const paymentUrl = response.data.data.checkout_url
      const successKeyboard = new InlineKeyboard()
        .url('💳 Pay Now', paymentUrl)
        .text('🏠 Main Menu', 'main_menu')

      await ctx.reply(
        `✅ Payment initialized successfully!\n\n💰 Amount: ${paymentData.amount} ETB\n🔗 Transaction ID: ${tx_ref}\n\nClick the button below to complete your payment:\n\n💡 Your payment will be automatically confirmed after completion.`,
        { reply_markup: successKeyboard },
      )
    } else {
      await ctx.reply('❌ No payment URL received from Chapa API')
    }

    // Clear user state
    userStates.delete(userId)
    userPaymentData.delete(userId)
  } catch (error: any) {
    console.log('❌ Payment error:', error.message)
    console.log('🔍 Error details:', error.response?.data || error)
    await ctx.reply('❌ Payment failed. Please try again.')
    userStates.delete(userId)
    userPaymentData.delete(userId)
  }
}

// Handle inline keyboard callbacks
bot.callbackQuery('main_menu', async (ctx) => {
  await ctx.editMessageText('🏠 Main Menu')
  await ctx.reply('Choose an option:', {
    reply_markup: mainMenu,
  })
})

// Error handling
bot.catch((err) => {
  console.log('❌ Bot error:', err)
})

// Start the bot
console.log('🤖 Starting Telegram bot...')
bot.start()

export default bot
