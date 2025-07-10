import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

console.log('🔍 Environment Variables Check')
console.log('==============================')

const requiredVars = ['TELEGRAM_BOT_TOKEN', 'CHAPA_AUTH_KEY', 'MONGODB_URL']

const optionalVars = [
  'CALLBACK_URL',
  'BOT_RETURN_URL',
  'WEBHOOK_SECRET',
  'ADMIN_TELEGRAM_IDS',
]

console.log('\n📋 Required Variables:')
requiredVars.forEach((varName) => {
  const value = process.env[varName]
  if (value) {
    console.log(`✅ ${varName}: Set`)
  } else {
    console.log(`❌ ${varName}: Missing`)
  }
})

console.log('\n📋 Optional Variables:')
optionalVars.forEach((varName) => {
  const value = process.env[varName]
  if (value) {
    console.log(`✅ ${varName}: Set`)
  } else {
    console.log(`⚠️  ${varName}: Not set (optional)`)
  }
})

console.log('\n🔧 Recommendations:')
if (!process.env.CHAPA_AUTH_KEY) {
  console.log('❌ CHAPA_AUTH_KEY is required for payment processing')
}
if (!process.env.CALLBACK_URL) {
  console.log('⚠️  CALLBACK_URL is recommended for webhook handling')
}
if (!process.env.BOT_RETURN_URL) {
  console.log('⚠️  BOT_RETURN_URL is recommended for payment completion')
}

console.log('\n📝 To set environment variables, create a .env file with:')
console.log('TELEGRAM_BOT_TOKEN=your_bot_token')
console.log('CHAPA_AUTH_KEY=your_chapa_key')
console.log('MONGODB_URL=your_mongodb_url')
console.log('CALLBACK_URL=https://your-domain.com/callback')
console.log('BOT_RETURN_URL=https://your-domain.com/return')
console.log('WEBHOOK_SECRET=your_webhook_secret')
