import bot from './server'

console.log('🤖 Starting Telegram Payment Bot...')

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down bot...')
  bot.stop()
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down bot...')
  bot.stop()
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
