import { setupTelegramBot } from './bot/telegramBot.js'

console.log('🤖 Starting Telegram Payment Bot...')

const bot = setupTelegramBot()

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down bot...')
  if (bot) {
    await bot.stop()
  }
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down bot...')
  if (bot) {
    await bot.stop()
  }
  process.exit(0)
})

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.log('❌ Uncaught Exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.log('❌ Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})
