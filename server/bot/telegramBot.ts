import { Bot, Keyboard } from 'grammy'
import { TelegramBotController } from '../controllers/TelegramBotController.js'
import { SessionService } from '../services/SessionService.js'
import { UserService } from '../services/UserService.js'
import { logger } from '../utils/logger.js'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

if (!TELEGRAM_BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN is required')
}

// Create bot instance
const bot = new Bot(TELEGRAM_BOT_TOKEN)

// Main menu keyboard
const mainMenu = new Keyboard()
  .text('💰 Make Payment')
  .text('💳 Check Balance')
  .row()
  .text('🏦 Withdraw Funds')
  .text('📋 Withdrawal History')
  .row()
  .text('📊 My Statistics')
  .text('❓ Help')

// Admin menu keyboard (for admin users)
const adminMenu = new Keyboard()
  .text('📊 System Stats')
  .text('👥 Active Users')
  .text('🔧 Maintenance')
  .row()
  .text('🏠 Main Menu')

export function setupTelegramBot() {
  // Global error handler
  bot.catch((err) => {
    logger.error('Bot error:', err)
  })

  // Start command
  bot.command('start', async (ctx) => {
    try {
      await TelegramBotController.handleStart(ctx)
      await ctx.reply('Choose an option:', {
        reply_markup: mainMenu,
      })
    } catch (error) {
      logger.error('Error in start command:', error)
      await ctx.reply('❌ Failed to start bot. Please try again.')
    }
  })

  // Admin commands
  bot.command('admin', async (ctx) => {
    try {
      const telegramId = ctx.from?.id
      if (!telegramId) return

      // Check if user is admin (you can implement your own admin logic)
      const isAdmin = process.env.ADMIN_TELEGRAM_IDS?.includes(
        telegramId.toString(),
      )
      if (!isAdmin) {
        await ctx.reply('❌ Access denied.')
        return
      }

      await ctx.reply('🔧 Admin Panel:', {
        reply_markup: adminMenu,
      })
    } catch (error) {
      logger.error('Error in admin command:', error)
      await ctx.reply('❌ Admin access failed.')
    }
  })

  // Handle main menu buttons
  bot.hears('💰 Make Payment', async (ctx) => {
    try {
      await TelegramBotController.handlePaymentInitiation(ctx)
    } catch (error) {
      logger.error('Error handling payment initiation:', error)
      await ctx.reply('❌ Failed to initiate payment. Please try again.')
    }
  })

  bot.hears('💳 Check Balance', async (ctx) => {
    try {
      await TelegramBotController.handleBalanceCheck(ctx)
      await ctx.reply('Choose an option:', {
        reply_markup: mainMenu,
      })
    } catch (error) {
      logger.error('Error handling balance check:', error)
      await ctx.reply('❌ Failed to check balance. Please try again.')
    }
  })

  bot.hears('🏦 Withdraw Funds', async (ctx) => {
    try {
      await TelegramBotController.handleWithdrawalInitiation(ctx)
    } catch (error) {
      logger.error('Error handling withdrawal initiation:', error)
      await ctx.reply('❌ Failed to initiate withdrawal. Please try again.')
    }
  })

  bot.hears('📋 Withdrawal History', async (ctx) => {
    try {
      await TelegramBotController.handleWithdrawalHistory(ctx)
      await ctx.reply('Choose an option:', {
        reply_markup: mainMenu,
      })
    } catch (error) {
      logger.error('Error handling withdrawal history:', error)
      await ctx.reply(
        '❌ Failed to fetch withdrawal history. Please try again.',
      )
    }
  })

  bot.hears('📊 My Statistics', async (ctx) => {
    try {
      await TelegramBotController.handleUserStats(ctx)
      await ctx.reply('Choose an option:', {
        reply_markup: mainMenu,
      })
    } catch (error) {
      logger.error('Error handling user stats:', error)
      await ctx.reply('❌ Failed to fetch statistics. Please try again.')
    }
  })

  bot.hears('❓ Help', async (ctx) => {
    try {
      await TelegramBotController.handleHelp(ctx)
      await ctx.reply('Choose an option:', {
        reply_markup: mainMenu,
      })
    } catch (error) {
      logger.error('Error handling help:', error)
      await ctx.reply('❌ Failed to show help. Please try again.')
    }
  })

  // Handle admin menu buttons
  bot.hears('📊 System Stats', async (ctx) => {
    try {
      const telegramId = ctx.from?.id
      if (!telegramId) return

      const isAdmin = process.env.ADMIN_TELEGRAM_IDS?.includes(
        telegramId.toString(),
      )
      if (!isAdmin) {
        await ctx.reply('❌ Access denied.')
        return
      }

      const stats = await UserService.getSystemStats()
      const statsMessage = `
📊 System Statistics:

👥 Total Users: ${stats.totalUsers}
✅ Active Users: ${stats.activeUsers}
🔄 Active Sessions: ${stats.activeSessions}

System is running smoothly! ✅
      `

      await ctx.reply(statsMessage)
    } catch (error) {
      logger.error('Error handling system stats:', error)
      await ctx.reply('❌ Failed to fetch system stats.')
    }
  })

  bot.hears('👥 Active Users', async (ctx) => {
    try {
      const telegramId = ctx.from?.id
      if (!telegramId) return

      const isAdmin = process.env.ADMIN_TELEGRAM_IDS?.includes(
        telegramId.toString(),
      )
      if (!isAdmin) {
        await ctx.reply('❌ Access denied.')
        return
      }

      const activeUsers = await UserService.getAllUsers()
      const usersMessage = `
👥 All Users (${activeUsers.length}):

${activeUsers
  .slice(0, 10)
  .map(
    (user, index) =>
      `${index + 1}. ${user.firstName} ${user.lastName || ''} (@${
        user.username || 'no-username'
      })`,
  )
  .join('\n')}

${activeUsers.length > 10 ? `... and ${activeUsers.length - 10} more` : ''}
      `

      await ctx.reply(usersMessage)
    } catch (error) {
      logger.error('Error handling active users:', error)
      await ctx.reply('❌ Failed to fetch active users.')
    }
  })

  bot.hears('🔧 Maintenance', async (ctx) => {
    try {
      const telegramId = ctx.from?.id
      if (!telegramId) return

      const isAdmin = process.env.ADMIN_TELEGRAM_IDS?.includes(
        telegramId.toString(),
      )
      if (!isAdmin) {
        await ctx.reply('❌ Access denied.')
        return
      }

      // Cleanup expired sessions
      const cleanedSessions = await SessionService.cleanupExpiredSessions()

      const maintenanceMessage = `
🔧 Maintenance Completed:

🧹 Cleaned up ${cleanedSessions} expired sessions

System is running smoothly! ✅
      `

      await ctx.reply(maintenanceMessage)
    } catch (error) {
      logger.error('Error handling maintenance:', error)
      await ctx.reply('❌ Maintenance failed.')
    }
  })

  bot.hears('🏠 Main Menu', async (ctx) => {
    try {
      await ctx.reply('Choose an option:', {
        reply_markup: mainMenu,
      })
    } catch (error) {
      logger.error('Error returning to main menu:', error)
      await ctx.reply('❌ Failed to return to main menu.')
    }
  })

  // Handle text input for payment and withdrawal flows
  bot.on('message:text', async (ctx) => {
    try {
      const telegramId = ctx.from?.id
      if (!telegramId) return

      const sessionData = await SessionService.getSessionData(telegramId)
      if (!sessionData) return

      const text = ctx.message.text

      switch (sessionData.state) {
        case 'awaiting_amount':
          await handlePaymentAmount(ctx, telegramId, text)
          break

        case 'awaiting_mobile':
          await handlePaymentMobile(ctx, telegramId, text)
          break

        case 'awaiting_withdrawal_amount':
          await handleWithdrawalAmount(ctx, telegramId, text)
          break

        case 'awaiting_account_name':
          await handleAccountName(ctx, telegramId, text)
          break

        case 'awaiting_account_number':
          await handleAccountNumber(ctx, telegramId, text)
          break

        case 'awaiting_bank_confirmation':
          await handleBankConfirmation(ctx, telegramId, text)
          break
      }
    } catch (error) {
      logger.error('Error handling text input:', error)
      await ctx.reply('❌ Failed to process input. Please try again.')
    }
  })

  // Handle bank selection
  bot.hears(/^\d+\.\s/, async (ctx) => {
    try {
      const telegramId = ctx.from?.id
      if (!telegramId) return

      const sessionData = await SessionService.getSessionData(telegramId)
      if (sessionData?.state !== 'awaiting_bank_choice') return

      const text = ctx.message?.text
      if (!text) return

      const bankIndex = parseInt(text?.split('.')[0] || '0') - 1
      const banks = await TelegramBotController.getBanksForSelection()

      if (bankIndex >= 0 && bankIndex < banks.length) {
        const selectedBank = banks[bankIndex]
        if (!selectedBank) return

        await SessionService.updateSessionState(
          telegramId,
          'awaiting_account_name',
          {
            withdrawalData: {
              bankCode: selectedBank.id,
              bankName: selectedBank.name,
            },
          },
        )

        const withdrawalData = await SessionService.getSessionData(telegramId)
        const data = withdrawalData?.withdrawalData

        if (data) {
          const confirmationMessage = `
🏦 Withdrawal Confirmation:

💰 Amount: ${data.amount} ETB
👤 Account Name: ${data.accountName}
🏦 Bank: ${selectedBank.name}
📝 Account Number: ${data.accountNumber}

Please confirm this withdrawal by typing "yes" or "no":
          `

          await SessionService.updateSessionState(
            telegramId,
            'awaiting_bank_confirmation',
          )

          await ctx.reply(confirmationMessage, {
            reply_markup: new Keyboard()
              .text('Yes')
              .text('No')
              .row()
              .text('❌ Cancel'),
          })
        }
      }
    } catch (error) {
      logger.error('Error handling bank selection:', error)
      await ctx.reply('❌ Failed to select bank. Please try again.')
    }
  })

  // Handle withdrawal confirmation
  bot.hears('Yes', async (ctx) => {
    try {
      const telegramId = ctx.from?.id
      if (!telegramId) return

      const sessionData = await SessionService.getSessionData(telegramId)
      if (sessionData?.state === 'awaiting_bank_confirmation') {
        await TelegramBotController.processWithdrawal(ctx, telegramId)
        await ctx.reply('Choose an option:', {
          reply_markup: mainMenu,
        })
      }
    } catch (error) {
      logger.error('Error handling withdrawal confirmation:', error)
      await ctx.reply('❌ Failed to confirm withdrawal. Please try again.')
    }
  })

  bot.hears('No', async (ctx) => {
    try {
      const telegramId = ctx.from?.id
      if (!telegramId) return

      const sessionData = await SessionService.getSessionData(telegramId)
      if (sessionData?.state === 'awaiting_bank_confirmation') {
        await ctx.reply('❌ Withdrawal cancelled.')
        await SessionService.clearSession(telegramId)
        await ctx.reply('Choose an option:', {
          reply_markup: mainMenu,
        })
      }
    } catch (error) {
      logger.error('Error handling withdrawal cancellation:', error)
      await ctx.reply('❌ Failed to cancel withdrawal. Please try again.')
    }
  })

  bot.hears('❌ Cancel', async (ctx) => {
    try {
      const telegramId = ctx.from?.id
      if (!telegramId) return

      await SessionService.clearSession(telegramId)
      await ctx.reply('❌ Operation cancelled. Returning to main menu.')
      await ctx.reply('Choose an option:', {
        reply_markup: mainMenu,
      })
    } catch (error) {
      logger.error('Error handling operation cancellation:', error)
      await ctx.reply('❌ Failed to cancel operation. Please try again.')
    }
  })

  // Handle inline keyboard callbacks
  bot.callbackQuery('main_menu', async (ctx) => {
    try {
      await ctx.editMessageText('🏠 Main Menu')
      await ctx.reply('Choose an option:', {
        reply_markup: mainMenu,
      })
    } catch (error) {
      logger.error('Error handling main menu callback:', error)
      await ctx.reply('❌ Failed to return to main menu.')
    }
  })

  // Start the bot
  logger.info('🤖 Starting Telegram bot...')
  bot.start()

  return bot
}

// Helper functions for handling user input
async function handlePaymentAmount(ctx: any, telegramId: number, text: string) {
  try {
    const amount = parseFloat(text)
    if (isNaN(amount) || amount <= 0) {
      await ctx.reply('❌ Please enter a valid amount (e.g., 100):')
      return
    }

    await SessionService.updateSessionState(telegramId, 'awaiting_mobile', {
      paymentData: { amount: text },
    })
    await ctx.reply('📱 Enter your mobile number (e.g., 0912345678):')
  } catch (error) {
    logger.error('Error handling payment amount:', error)
    await ctx.reply('❌ Failed to process amount. Please try again.')
  }
}

async function handlePaymentMobile(ctx: any, telegramId: number, text: string) {
  try {
    // Basic mobile number validation
    const mobileRegex = /^(\+251|0)?[79]\d{8}$/
    if (!mobileRegex.test(text)) {
      await ctx.reply(
        '❌ Please enter a valid Ethiopian mobile number (e.g., 0912345678):',
      )
      return
    }

    await SessionService.updateSessionState(telegramId, 'processing_payment', {
      paymentData: { mobile: text },
    })
    await TelegramBotController.processPayment(ctx, telegramId)
  } catch (error) {
    logger.error('Error handling payment mobile:', error)
    await ctx.reply('❌ Failed to process mobile number. Please try again.')
  }
}

async function handleWithdrawalAmount(
  ctx: any,
  telegramId: number,
  text: string,
) {
  try {
    const amount = parseFloat(text)
    if (isNaN(amount) || amount <= 0) {
      await ctx.reply('❌ Please enter a valid amount (e.g., 100):')
      return
    }

    // Check balance
    const balance = await (
      await import('../services/BalanceService')
    ).BalanceService.getBalance(`user-${telegramId}`)
    if (amount > balance) {
      await ctx.reply(
        `❌ Insufficient balance. Your current balance is ${balance} ETB. Please enter a smaller amount:`,
      )
      return
    }

    await SessionService.updateSessionState(
      telegramId,
      'awaiting_account_name',
      {
        withdrawalData: { amount: text },
      },
    )
    await ctx.reply('👤 Enter the account holder name:')
  } catch (error) {
    logger.error('Error handling withdrawal amount:', error)
    await ctx.reply('❌ Failed to process amount. Please try again.')
  }
}

async function handleAccountName(ctx: any, telegramId: number, text: string) {
  try {
    if (text.length < 2) {
      await ctx.reply(
        '❌ Please enter a valid account holder name (minimum 2 characters):',
      )
      return
    }

    await SessionService.updateSessionState(
      telegramId,
      'awaiting_account_number',
      {
        withdrawalData: { accountName: text },
      },
    )
    await ctx.reply('📝 Enter the account number:')
  } catch (error) {
    logger.error('Error handling account name:', error)
    await ctx.reply('❌ Failed to process account name. Please try again.')
  }
}

async function handleAccountNumber(ctx: any, telegramId: number, text: string) {
  try {
    // Basic account number validation
    if (text.length < 10 || text.length > 16) {
      await ctx.reply('❌ Please enter a valid account number (10-16 digits):')
      return
    }

    await SessionService.updateSessionState(
      telegramId,
      'awaiting_bank_choice',
      {
        withdrawalData: { accountNumber: text },
      },
    )

    const banks = await TelegramBotController.getBanksForSelection()
    let bankList = '🏦 Select your bank:\n\n'

    banks.forEach((bank: any, index: number) => {
      bankList += `${index + 1}. ${bank.name}\n`
    })

    await ctx.reply(bankList)
  } catch (error) {
    logger.error('Error handling account number:', error)
    await ctx.reply('❌ Failed to process account number. Please try again.')
  }
}

async function handleBankConfirmation(
  ctx: any,
  telegramId: number,
  text: string,
) {
  try {
    // This is handled by the 'Yes' and 'No' button handlers
    // This function is kept for consistency but shouldn't be reached
    await ctx.reply(
      'Please use the Yes/No buttons to confirm or cancel the withdrawal.',
    )
  } catch (error) {
    logger.error('Error handling bank confirmation:', error)
    await ctx.reply('❌ Failed to process confirmation. Please try again.')
  }
}
