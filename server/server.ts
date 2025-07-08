import { Bot, InlineKeyboard, Keyboard } from 'grammy'
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import axios from 'axios'
import crypto from 'crypto'
import mongoose from 'mongoose'
import Balance from './models/Balance.js'
import Withdrawal from './models/Withdrawal.js'
import { WithdrawalService } from './services/withdrawalService.js'
import type { BankInfo } from './services/withdrawalService.js'

dotenv.config()

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const CHAPA_AUTH_KEY = process.env.CHAPA_AUTH_KEY
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET
const CALLBACK_URL = process.env.CALLBACK_URL
const MONGODB_URL = process.env.MONGODB_URL
const BOT_RETURN_URL = process.env.BOT_RETURN_URL
const PORT = process.env.PORT || 5000

if (!TELEGRAM_BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN is required')
}

mongoose
  .connect(MONGODB_URL || 'mongodb://localhost:27017/chapa-payments')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.log('❌ MongoDB connection error:', err))

const app = express()

app.use(cors())

app.use(express.json())

app.get('/', (req, res) => {
  console.log('✅ GET / - Root endpoint hit')
  res.json({ message: 'Chapa Payment Server with Telegram Bot' })
})

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

// Verify withdrawal endpoint
app.get('/withdrawal/verify/:reference', async (req, res) => {
  try {
    const { reference } = req.params
    console.log('🔍 Verifying withdrawal:', reference)

    const result = await WithdrawalService.verifyWithdrawal(reference)

    res.status(200).json({
      message: 'Withdrawal verification successful',
      data: result,
    })
  } catch (error: any) {
    console.log('❌ Withdrawal verification error:', error.message)
    res.status(400).json({
      message: 'Withdrawal verification failed',
      error: error.message,
    })
  }
})

// Get withdrawal history endpoint
app.get('/withdrawal/history/:userId?', async (req, res) => {
  try {
    const userId = req.params.userId || 'default-user'
    console.log('📋 Fetching withdrawal history for:', userId)

    const withdrawals = await WithdrawalService.getWithdrawalHistory(userId)

    res.status(200).json({
      message: 'Withdrawal history retrieved successfully',
      data: withdrawals,
    })
  } catch (error: any) {
    console.log('❌ Withdrawal history error:', error.message)
    res.status(400).json({
      message: 'Failed to fetch withdrawal history',
      error: error.message,
    })
  }
})

// Get available banks endpoint
app.get('/banks', async (req, res) => {
  try {
    console.log('🏦 Fetching available banks')

    const banks = await WithdrawalService.getBanks()

    res.status(200).json({
      message: 'Banks retrieved successfully',
      data: banks,
    })
  } catch (error: any) {
    console.log('❌ Banks fetch error:', error.message)
    res.status(400).json({
      message: 'Failed to fetch banks',
      error: error.message,
    })
  }
})

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

// Store withdrawal data
const userWithdrawalData = new Map<
  number,
  {
    amount: string
    accountName: string
    accountNumber: string
    bankCode: number
    bankName: string
  }
>()

// Cache for banks
let banksCache: BankInfo[] = []
let banksCacheTime = 0
const BANKS_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Main menu keyboard
const mainMenu = new Keyboard()
  .text('💰 Make Payment')
  .text('💳 Check Balance')
  .row()
  .text('🏦 Withdraw Funds')
  .text('📋 Withdrawal History')
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
    let balance = await Balance.findOne({ userId: 'default-user' })
    if (!balance) {
      balance = new Balance({ userId: 'default-user' })
    }
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

3. 🏦 Withdraw Funds
   • Enter withdrawal amount
   • Select bank from list
   • Enter account details
   • Confirm withdrawal

4. 📋 Withdrawal History
   • View recent withdrawals

Payment Process:
• Your payment will be automatically confirmed via webhook
• Balance will be updated automatically after successful payment
• No manual confirmation needed

Withdrawal Process:
• Withdrawals are processed automatically
• Funds are sent directly to your bank account
• Processing time: 1-3 business days

For support, contact: @your_support_handle
  `
  await ctx.reply(helpMessage, {
    reply_markup: mainMenu,
  })
})

// Withdrawal handlers
bot.hears('🏦 Withdraw Funds', async (ctx) => {
  try {
    // Check current balance
    const balance =
      (await Balance.findOne({ userId: 'default-user' })) ||
      new Balance({ userId: 'default-user' })

    if (balance.balance <= 0) {
      await ctx.reply(
        '❌ Insufficient balance for withdrawal. Please add funds first.',
        {
          reply_markup: mainMenu,
        },
      )
      return
    }

    userStates.set(ctx.from!.id, 'awaiting_withdrawal_amount')
    await ctx.reply(
      `💰 Current Balance: ${balance.balance} ETB\n\n💳 Enter the withdrawal amount (e.g., 100):`,
    )
  } catch (error: any) {
    console.log('❌ Withdrawal setup error:', error.message)
    await ctx.reply('❌ Failed to setup withdrawal. Please try again.', {
      reply_markup: mainMenu,
    })
  }
})

bot.hears('📋 Withdrawal History', async (ctx) => {
  try {
    const withdrawals = await WithdrawalService.getWithdrawalHistory(
      'default-user',
    )

    if (withdrawals.length === 0) {
      await ctx.reply('📋 No withdrawal history found.', {
        reply_markup: mainMenu,
      })
      return
    }

    let historyMessage = '📋 Recent Withdrawals:\n\n'

    withdrawals.slice(0, 5).forEach((withdrawal, index) => {
      let statusEmoji = '❓'
      if (withdrawal.status === 'pending') statusEmoji = '⏳'
      else if (withdrawal.status === 'processing') statusEmoji = '🔄'
      else if (withdrawal.status === 'completed') statusEmoji = '✅'
      else if (withdrawal.status === 'failed') statusEmoji = '❌'
      else if (withdrawal.status === 'reverted') statusEmoji = '↩️'

      historyMessage += `${index + 1}. ${statusEmoji} ${
        withdrawal.amount
      } ETB\n`
      historyMessage += `   Bank: ${withdrawal.bankName}\n`
      historyMessage += `   Account: ${withdrawal.accountNumber}\n`
      historyMessage += `   Status: ${withdrawal.status}\n`
      historyMessage += `   Date: ${withdrawal.createdAt.toLocaleDateString()}\n\n`
    })

    await ctx.reply(historyMessage, {
      reply_markup: mainMenu,
    })
  } catch (error: any) {
    console.log('❌ Withdrawal history error:', error.message)
    await ctx.reply(
      '❌ Failed to fetch withdrawal history. Please try again.',
      {
        reply_markup: mainMenu,
      },
    )
  }
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

    case 'awaiting_withdrawal_amount':
      const withdrawalAmount = parseFloat(text)
      if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
        await ctx.reply('❌ Please enter a valid amount (e.g., 100):')
        return
      }

      // Check if user has sufficient balance
      const balance =
        (await Balance.findOne({ userId: 'default-user' })) ||
        new Balance({ userId: 'default-user' })
      if (withdrawalAmount > balance.balance) {
        await ctx.reply(
          `❌ Insufficient balance. Available: ${balance.balance} ETB`,
        )
        return
      }

      userWithdrawalData.set(userId, {
        amount: text,
        accountName: '',
        accountNumber: '',
        bankCode: 0,
        bankName: '',
      })

      userStates.set(userId, 'awaiting_account_name')
      await ctx.reply('👤 Enter the account holder name:')
      break

    case 'awaiting_account_name':
      userWithdrawalData.get(userId)!.accountName = text
      userStates.set(userId, 'awaiting_account_number')
      await ctx.reply('🏦 Enter the account number:')
      break

    case 'awaiting_account_number':
      userWithdrawalData.get(userId)!.accountNumber = text
      userStates.set(userId, 'awaiting_bank_selection')

      // Get banks and show selection
      await showBankSelection(ctx)
      break

    case 'awaiting_bank_confirmation':
      if (text.toLowerCase() === 'yes' || text.toLowerCase() === 'y') {
        await processWithdrawal(ctx, userId)
      } else {
        await ctx.reply('❌ Withdrawal cancelled.', {
          reply_markup: mainMenu,
        })
        userStates.delete(userId)
        userWithdrawalData.delete(userId)
      }
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

// Show bank selection
async function showBankSelection(ctx: any) {
  try {
    await ctx.reply('🔄 Loading banks...')

    // Check cache first
    const now = Date.now()
    if (
      now - banksCacheTime > BANKS_CACHE_DURATION ||
      banksCache.length === 0
    ) {
      banksCache = await WithdrawalService.getBanks()
      banksCacheTime = now
    }

    if (banksCache.length === 0) {
      await ctx.reply('❌ Failed to load banks. Please try again.', {
        reply_markup: mainMenu,
      })
      return
    }

    // Create bank selection keyboard (show first 10 banks)
    const bankKeyboard = new Keyboard()
    const banksToShow = banksCache.slice(0, 10)

    banksToShow.forEach((bank, index) => {
      bankKeyboard.text(`${index + 1}. ${bank.name}`)
      if ((index + 1) % 2 === 0) bankKeyboard.row()
    })

    bankKeyboard.row().text('❌ Cancel')

    await ctx.reply(
      `🏦 Select your bank (1-${banksToShow.length}):\n\n${banksToShow
        .map((bank, index) => `${index + 1}. ${bank.name}`)
        .join('\n')}`,
      { reply_markup: bankKeyboard },
    )

    userStates.set(ctx.from!.id, 'awaiting_bank_choice')
  } catch (error: any) {
    console.log('❌ Bank selection error:', error.message)
    await ctx.reply('❌ Failed to load banks. Please try again.', {
      reply_markup: mainMenu,
    })
  }
}

// Process withdrawal function
async function processWithdrawal(ctx: any, userId: number) {
  const withdrawalData = userWithdrawalData.get(userId)

  if (!withdrawalData) {
    await ctx.reply('❌ Withdrawal data not found. Please start over.')
    return
  }

  try {
    await ctx.reply('🔄 Processing your withdrawal...')

    const withdrawal = await WithdrawalService.initiateWithdrawal({
      amount: parseFloat(withdrawalData.amount),
      accountName: withdrawalData.accountName,
      accountNumber: withdrawalData.accountNumber,
      bankCode: withdrawalData.bankCode,
      bankName: withdrawalData.bankName,
      userId: 'default-user',
    })

    await ctx.reply(
      `✅ Withdrawal initiated successfully!\n\n💰 Amount: ${withdrawalData.amount} ETB\n🏦 Bank: ${withdrawalData.bankName}\n📝 Account: ${withdrawalData.accountNumber}\n🔗 Reference: ${withdrawal.reference}\n\nStatus: ${withdrawal.status}\n\n💡 Your withdrawal will be processed within 1-3 business days.`,
      { reply_markup: mainMenu },
    )

    // Clear user state
    userStates.delete(userId)
    userWithdrawalData.delete(userId)
  } catch (error: any) {
    console.log('❌ Withdrawal error:', error.message)
    await ctx.reply(`❌ Withdrawal failed: ${error.message}`, {
      reply_markup: mainMenu,
    })
    userStates.delete(userId)
    userWithdrawalData.delete(userId)
  }
}

// Handle bank selection
bot.hears(/^\d+\.\s/, async (ctx) => {
  const userId = ctx.from!.id
  const state = userStates.get(userId)

  if (state !== 'awaiting_bank_choice') return

  const text = ctx.message?.text
  if (!text) return

  const bankIndex = parseInt(text?.split('.')[0] || '0') - 1

  if (bankIndex >= 0 && bankIndex < banksCache.length) {
    const selectedBank = banksCache[bankIndex]
    if (!selectedBank) return

    const withdrawalData = userWithdrawalData.get(userId)

    if (withdrawalData) {
      withdrawalData.bankCode = selectedBank.id
      withdrawalData.bankName = selectedBank.name

      const confirmationMessage = `
🏦 Withdrawal Confirmation:

💰 Amount: ${withdrawalData.amount} ETB
👤 Account Name: ${withdrawalData.accountName}
🏦 Bank: ${selectedBank.name}
📝 Account Number: ${withdrawalData.accountNumber}

Please confirm this withdrawal by typing "yes" or "no":
      `

      userStates.set(userId, 'awaiting_bank_confirmation')
      await ctx.reply(confirmationMessage, {
        reply_markup: new Keyboard()
          .text('Yes')
          .text('No')
          .row()
          .text('❌ Cancel'),
      })
    }
  }
})

// Handle withdrawal confirmation
bot.hears('Yes', async (ctx) => {
  const userId = ctx.from!.id
  const state = userStates.get(userId)

  if (state === 'awaiting_bank_confirmation') {
    await processWithdrawal(ctx, userId)
  }
})

bot.hears('No', async (ctx) => {
  const userId = ctx.from!.id
  const state = userStates.get(userId)

  if (state === 'awaiting_bank_confirmation') {
    await ctx.reply('❌ Withdrawal cancelled.', {
      reply_markup: mainMenu,
    })
    userStates.delete(userId)
    userWithdrawalData.delete(userId)
  }
})

bot.hears('❌ Cancel', async (ctx) => {
  const userId = ctx.from!.id
  userStates.delete(userId)
  userPaymentData.delete(userId)
  userWithdrawalData.delete(userId)

  await ctx.reply('❌ Operation cancelled. Returning to main menu.', {
    reply_markup: mainMenu,
  })
})

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
