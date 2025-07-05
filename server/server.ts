import { Bot, InlineKeyboard, Keyboard } from 'grammy'
import dotenv from 'dotenv'
import axios from 'axios'
import mongoose from 'mongoose'
import Balance from './models/Balance.js'

dotenv.config()

// Environment variables
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const CHAPA_AUTH_KEY = process.env.CHAPA_AUTH_KEY
const MONGODB_URL = process.env.MONGODB_URL

if (!TELEGRAM_BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN is required')
}

// Connect to MongoDB
mongoose
  .connect(MONGODB_URL || 'mongodb://localhost:27017/chapa-payments')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.log('❌ MongoDB connection error:', err))

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
  .text('🔄 Reset Balance')
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

// Confirm payment command
bot.command('confirm', async (ctx) => {
  if (!ctx.message?.text) {
    await ctx.reply('❌ Invalid message format')
    return
  }

  const args = ctx.message.text.split(' ')
  if (args.length < 2) {
    await ctx.reply('❌ Usage: /confirm <transaction_reference>')
    return
  }

  const tx_ref = args[1]
  await ctx.reply('🔄 Confirming payment...')

  const result = await confirmPayment(tx_ref!)

  if (result.success) {
    await ctx.reply(
      `✅ Payment confirmed successfully!\n\n💰 Amount: ${result.amount} ${result.currency}\n💳 Transaction: ${tx_ref}`,
      {
        reply_markup: mainMenu,
      },
    )
  } else {
    await ctx.reply(
      `❌ Payment confirmation failed: ${result.message || result.error}`,
      {
        reply_markup: mainMenu,
      },
    )
  }
})

// Reset balance command (for testing)
bot.command('reset', async (ctx) => {
  try {
    const balance = (await Balance.findOne()) || new Balance()
    balance.balance = 0
    balance.lastUpdated = new Date()
    await balance.save()

    console.log('🔄 Balance reset to 0')
    await ctx.reply('🔄 Balance reset to 0 successfully!', {
      reply_markup: mainMenu,
    })
  } catch (error: any) {
    console.log('❌ Balance reset error:', error.message)
    await ctx.reply('❌ Failed to reset balance.', {
      reply_markup: mainMenu,
    })
  }
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

bot.hears('🔄 Reset Balance', async (ctx) => {
  try {
    const balance = (await Balance.findOne()) || new Balance()
    balance.balance = 0
    balance.lastUpdated = new Date()
    await balance.save()

    console.log('🔄 Balance reset to 0')
    await ctx.reply('🔄 Balance reset to 0 successfully!', {
      reply_markup: mainMenu,
    })
  } catch (error: any) {
    console.log('❌ Balance reset error:', error.message)
    await ctx.reply('❌ Failed to reset balance.', {
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

3. 🔄 Reset Balance
   • Reset balance to 0 (for testing)

Commands:
• /confirm <tx_ref> - Manually confirm a payment
• /reset - Reset balance to 0

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
      mobile: paymentData.mobile,
      tx_ref: tx_ref,
      return_url: 'https://t.me/botterstringbot',
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
        `✅ Payment initialized successfully!\n\n💰 Amount: ${paymentData.amount} ETB\n🔗 Transaction ID: ${tx_ref}\n\nClick the button below to complete your payment:`,
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

// Confirm payment route (similar to server.ts webhook)
async function confirmPayment(tx_ref: string) {
  try {
    console.log('🔔 Payment confirmation for:', tx_ref)

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

    const { status, currency, amount, event } = verificationResponse.data.data

    console.log('✅ Transaction verified:', tx_ref, status, event)

    // Increment balance on successful payment
    if (status === 'success' && event === 'charge.success') {
      try {
        const balance = (await Balance.findOne()) || new Balance()
        balance.balance += parseFloat(amount)
        balance.lastUpdated = new Date()
        await balance.save()
        console.log('💰 Balance incremented by:', amount, currency)
        return { success: true, amount, currency }
      } catch (error: any) {
        console.log('❌ Balance increment error:', error.message)
        return { success: false, error: error.message }
      }
    }

    return { success: false, message: 'Payment not successful' }
  } catch (error: any) {
    console.log('❌ Payment confirmation error:', error.message)
    return { success: false, error: error.message }
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
