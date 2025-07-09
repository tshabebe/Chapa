import type { Context } from 'grammy'
import { PaymentService } from '../services/PaymentService.js'
import { WithdrawalService } from '../services/withdrawalService.js'
import { BalanceService } from '../services/BalanceService.js'
import { UserService } from '../services/UserService.js'
import { SessionService } from '../services/SessionService.js'
import { logger } from '../utils/logger.js'

export class TelegramBotController {
  private static banksCache: any[] = []
  private static banksCacheTime = 0
  private static readonly BANKS_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  /**
   * Initialize user and session
   */
  private static async initializeUser(
    ctx: Context,
  ): Promise<{ user: any; session: any } | null> {
    try {
      if (!ctx.from) {
        await ctx.reply('❌ Invalid user data. Please try again.')
        return null
      }

      const telegramId = ctx.from.id

      // Check if user is blocked
      const isBlocked = await UserService.isUserBlocked(telegramId)
      if (isBlocked) {
        await ctx.reply(
          '❌ Your account has been blocked. Please contact support.',
        )
        return null
      }

      // Get or create user
      const user = await UserService.getOrCreateUser(ctx.from)

      // Get or create session
      const session = await SessionService.getOrCreateSession(telegramId)

      // Update user activity
      await UserService.updateUserActivity(telegramId)

      return { user, session }
    } catch (error) {
      logger.error('Error initializing user:', error)
      await ctx.reply('❌ Failed to initialize user session. Please try again.')
      return null
    }
  }

  /**
   * Handle start command
   */
  static async handleStart(ctx: Context): Promise<void> {
    try {
      const userData = await this.initializeUser(ctx)
      if (!userData) return

      const { user, session } = userData
      const telegramId = ctx.from!.id

      // Clear any existing session
      await SessionService.clearSession(telegramId)

      const welcomeMessage = `
🎉 Welcome to Chapa Payment Bot, ${user.firstName}!

I can help you:
• 💰 Make payments securely
• 💳 Check current balance
• 🏦 Withdraw funds
• 📋 View withdrawal history
• 📊 View your statistics
• ❓ Get help

Choose an option from the menu below:
      `

      await ctx.reply(welcomeMessage)
      logger.info(`User ${telegramId} started bot`, { userId: user._id })
    } catch (error) {
      logger.error('Error handling start command:', error)
      await ctx.reply('❌ Failed to start bot. Please try again.')
    }
  }

  /**
   * Handle payment initiation
   */
  static async handlePaymentInitiation(ctx: Context): Promise<void> {
    try {
      const userData = await this.initializeUser(ctx)
      if (!userData) return

      const { user, session } = userData
      const telegramId = ctx.from!.id

      await SessionService.updateSessionState(telegramId, 'awaiting_amount')
      await ctx.reply('💳 Enter the payment amount (e.g., 100):')

      logger.info(`User ${telegramId} initiated payment`, { userId: user._id })
    } catch (error) {
      logger.error('Error handling payment initiation:', error)
      await ctx.reply('❌ Failed to initiate payment. Please try again.')
    }
  }

  /**
   * Handle balance check
   */
  static async handleBalanceCheck(ctx: Context): Promise<void> {
    try {
      const userData = await this.initializeUser(ctx)
      if (!userData) return

      const { user, session } = userData
      const telegramId = ctx.from!.id

      const balance = await BalanceService.getBalance(`user-${telegramId}`)

      const balanceMessage = `
💰 Current Balance:

Amount: ${balance.balance} ${balance.currency}
Last Updated: ${balance.lastUpdated.toLocaleString()}

💡 You can make payments or withdraw funds using the menu below.
      `
      await ctx.reply(balanceMessage)

      logger.info(`User ${telegramId} checked balance`, {
        userId: user._id,
        balance: balance.balance,
      })
    } catch (error) {
      logger.error('Error handling balance check:', error)
      await ctx.reply('❌ Failed to fetch balance. Please try again.')
    }
  }

  /**
   * Handle withdrawal initiation
   */
  static async handleWithdrawalInitiation(ctx: Context): Promise<void> {
    try {
      const userData = await this.initializeUser(ctx)
      if (!userData) return

      const { user, session } = userData
      const telegramId = ctx.from!.id

      const balance = await BalanceService.getBalance(`user-${telegramId}`)

      if (balance.balance <= 0) {
        await ctx.reply(
          '❌ Insufficient balance for withdrawal. Please add funds first.',
        )
        return
      }

      await SessionService.updateSessionState(
        telegramId,
        'awaiting_withdrawal_amount',
      )
      await ctx.reply(
        `💰 Current Balance: ${balance.balance} ETB\n\n💳 Enter the withdrawal amount (e.g., 100):`,
      )

      logger.info(`User ${telegramId} initiated withdrawal`, {
        userId: user._id,
        currentBalance: balance.balance,
      })
    } catch (error) {
      logger.error('Error handling withdrawal initiation:', error)
      await ctx.reply('❌ Failed to setup withdrawal. Please try again.')
    }
  }

  /**
   * Handle withdrawal history
   */
  static async handleWithdrawalHistory(ctx: Context): Promise<void> {
    try {
      const userData = await this.initializeUser(ctx)
      if (!userData) return

      const { user, session } = userData
      const telegramId = ctx.from!.id

      const withdrawals = await WithdrawalService.getWithdrawalHistory(
        `user-${telegramId}`,
      )

      if (withdrawals.length === 0) {
        await ctx.reply('📋 No withdrawal history found.')
        return
      }

      let historyMessage = '📋 Recent Withdrawals:\n\n'

      withdrawals.slice(0, 5).forEach((withdrawal: any, index: number) => {
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

      await ctx.reply(historyMessage)

      logger.info(`User ${telegramId} viewed withdrawal history`, {
        userId: user._id,
        withdrawalCount: withdrawals.length,
      })
    } catch (error) {
      logger.error('Error handling withdrawal history:', error)
      await ctx.reply(
        '❌ Failed to fetch withdrawal history. Please try again.',
      )
    }
  }

  /**
   * Handle user statistics
   */
  static async handleUserStats(ctx: Context): Promise<void> {
    try {
      const userData = await this.initializeUser(ctx)
      if (!userData) return

      const { user, session } = userData
      const telegramId = ctx.from!.id

      const stats = await UserService.getUserStats(telegramId)

      const statsMessage = `
📊 Your Statistics:

💰 Total Payments: ${stats.totalPayments}
💳 Total Withdrawals: ${stats.totalWithdrawals}
📈 Total Amount Paid: ${stats.totalAmountPaid} ETB
📉 Total Amount Withdrawn: ${stats.totalAmountWithdrawn} ETB

📅 Last Payment: ${
        stats.lastPaymentDate
          ? stats.lastPaymentDate.toLocaleDateString()
          : 'Never'
      }
📅 Last Withdrawal: ${
        stats.lastWithdrawalDate
          ? stats.lastWithdrawalDate.toLocaleDateString()
          : 'Never'
      }
📅 Member Since: ${stats.registrationDate.toLocaleDateString()}
      `

      await ctx.reply(statsMessage)

      logger.info(`User ${telegramId} viewed statistics`, { userId: user._id })
    } catch (error) {
      logger.error('Error handling user stats:', error)
      await ctx.reply('❌ Failed to fetch statistics. Please try again.')
    }
  }

  /**
   * Handle help
   */
  static async handleHelp(ctx: Context): Promise<void> {
    try {
      const userData = await this.initializeUser(ctx)
      if (!userData) return

      const { user, session } = userData
      const telegramId = ctx.from!.id

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

5. 📊 My Statistics
   • View your payment history
   • Track your activity

6. 🔍 Check Withdrawal Status
   • Verify withdrawal status with Chapa
   • Get real-time updates

Payment Process:
• Your payment will be automatically confirmed via webhook
• Balance will be updated automatically after successful payment
• No manual confirmation needed

Withdrawal Process:
• Withdrawals are processed automatically
• Funds are sent directly to your bank account
• Processing time: 1-3 business days
• Use "Check Withdrawal Status" to verify completion

For support, contact: @your_support_handle
      `
      await ctx.reply(helpMessage)

      logger.info(`User ${telegramId} viewed help`, { userId: user._id })
    } catch (error) {
      logger.error('Error handling help:', error)
      await ctx.reply('❌ Failed to show help. Please try again.')
    }
  }

  /**
   * Process payment
   */
  static async processPayment(ctx: Context, userId: number): Promise<void> {
    try {
      const userData = await this.initializeUser(ctx)
      if (!userData) return

      const { user, session } = userData
      const telegramId = ctx.from!.id

      const sessionData = await SessionService.getSessionData(telegramId)
      const paymentData = sessionData?.paymentData

      if (!paymentData?.amount || !paymentData?.mobile) {
        await ctx.reply('❌ Invalid payment data. Please try again.')
        await SessionService.clearSession(telegramId)
        return
      }

      await SessionService.updateSessionState(telegramId, 'processing_payment')

      const amount = parseFloat(paymentData.amount)
      const mobile = paymentData.mobile

      if (isNaN(amount) || amount <= 0) {
        await ctx.reply('❌ Invalid amount. Please try again.')
        await SessionService.clearSession(telegramId)
        return
      }

      const payment = await PaymentService.createPayment(
        `user-${telegramId}`,
        amount,
        mobile,
      )

      const paymentMessage = `
✅ Payment Created Successfully!

💰 Amount: ${amount} ETB
📱 Mobile: ${mobile}
🔗 Payment Link: ${payment.checkoutUrl}
📋 Reference: ${payment.reference}

Click the link above to complete your payment.
Your balance will be updated automatically after payment.
      `

      await ctx.reply(paymentMessage)

      // Update user statistics
      await UserService.updatePaymentStats(telegramId, amount)

      // Clear session
      await SessionService.clearSession(telegramId)

      logger.info(`Payment created for user ${telegramId}`, {
        userId: user._id,
        amount,
        reference: payment.reference,
      })
    } catch (error) {
      logger.error('Error processing payment:', error)
      await ctx.reply('❌ Failed to process payment. Please try again.')
      await SessionService.clearSession(userId)
    }
  }

  /**
   * Process withdrawal
   */
  static async processWithdrawal(ctx: Context, userId: number): Promise<void> {
    try {
      const userData = await this.initializeUser(ctx)
      if (!userData) return

      const { user, session } = userData
      const telegramId = ctx.from!.id

      const sessionData = await SessionService.getSessionData(telegramId)
      const withdrawalData = sessionData?.withdrawalData

      if (
        !withdrawalData?.amount ||
        !withdrawalData?.accountName ||
        !withdrawalData?.accountNumber ||
        !withdrawalData?.bankCode
      ) {
        await ctx.reply('❌ Invalid withdrawal data. Please try again.')
        await SessionService.clearSession(telegramId)
        return
      }

      await SessionService.updateSessionState(
        telegramId,
        'processing_withdrawal',
      )

      const amount = parseFloat(withdrawalData.amount)
      const accountName = withdrawalData.accountName
      const accountNumber = withdrawalData.accountNumber
      const bankCode = withdrawalData.bankCode
      const bankName = withdrawalData.bankName

      if (isNaN(amount) || amount <= 0) {
        await ctx.reply('❌ Invalid amount. Please try again.')
        await SessionService.clearSession(telegramId)
        return
      }

      const withdrawal = await WithdrawalService.createWithdrawal(
        `user-${telegramId}`,
        amount,
        accountName,
        accountNumber,
        bankCode,
        bankName,
      )

      const withdrawalMessage = `
✅ Withdrawal Request Submitted!

💰 Amount: ${amount} ETB
👤 Account Name: ${accountName}
🏦 Bank: ${bankName}
📝 Account Number: ${accountNumber}
📋 Reference: ${withdrawal.reference}
⏳ Status: ${withdrawal.status}

Your withdrawal will be processed within 1-3 business days.
You can check the status using "Check Withdrawal Status".
      `

      await ctx.reply(withdrawalMessage)

      // Update user statistics
      await UserService.updateWithdrawalStats(telegramId, amount)

      // Clear session
      await SessionService.clearSession(telegramId)

      logger.info(`Withdrawal created for user ${telegramId}`, {
        userId: user._id,
        amount,
        reference: withdrawal.reference,
      })
    } catch (error) {
      logger.error('Error processing withdrawal:', error)
      await ctx.reply('❌ Failed to process withdrawal. Please try again.')
      await SessionService.clearSession(userId)
    }
  }

  /**
   * Get banks for selection
   */
  static async getBanksForSelection(): Promise<any[]> {
    try {
      // Check if cache is still valid
      if (
        this.banksCache.length > 0 &&
        Date.now() - this.banksCacheTime < this.BANKS_CACHE_DURATION
      ) {
        return this.banksCache
      }

      // Fetch fresh data
      const banks = await WithdrawalService.getBanks()
      this.banksCache = banks
      this.banksCacheTime = Date.now()

      return banks
    } catch (error) {
      logger.error('Error getting banks:', error)
      return []
    }
  }

  /**
   * Get user session data
   */
  static async getUserSessionData(telegramId: number): Promise<any> {
    try {
      return await SessionService.getSessionData(telegramId)
    } catch (error) {
      logger.error('Error getting user session data:', error)
      return null
    }
  }

  /**
   * Clear user session
   */
  static async clearUserSession(telegramId: number): Promise<void> {
    try {
      await SessionService.clearSession(telegramId)
    } catch (error) {
      logger.error('Error clearing user session:', error)
    }
  }
}
