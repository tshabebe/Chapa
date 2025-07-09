# Production-Ready Telegram Payment Bot

A production-ready Telegram bot for handling payments and withdrawals with Chapa integration, built with proper MVC architecture, error handling, and multi-user support.

## 🚀 Features

### Core Features

- **Multi-User Support**: Each user has their own balance, session, and transaction history
- **Secure Payment Processing**: Integration with Chapa payment gateway
- **Withdrawal Management**: Bank transfer support with Ethiopian banks
- **Session Management**: Persistent user sessions with automatic cleanup
- **Admin Panel**: System monitoring and maintenance tools
- **Comprehensive Logging**: Structured logging with different levels
- **Error Handling**: Robust error handling and recovery mechanisms

### User Features

- 💰 Make payments securely
- 💳 Check current balance
- 🏦 Withdraw funds to bank accounts
- 📋 View withdrawal history
- 📊 Personal statistics dashboard
- ❓ Help and support

### Admin Features

- 📊 System statistics and monitoring
- 👥 Active user management
- 🔧 Maintenance and cleanup tools
- 🚫 User blocking/unblocking
- 📈 Performance metrics

## 🏗️ Architecture

### MVC Pattern

```
├── Models/
│   ├── User.ts              # User data and statistics
│   ├── UserSession.ts       # Session management
│   ├── Balance.ts           # Balance tracking
│   └── Withdrawal.ts        # Withdrawal records
├── Controllers/
│   └── TelegramBotController.ts  # Bot logic and user interactions
├── Services/
│   ├── UserService.ts       # User management
│   ├── SessionService.ts    # Session handling
│   ├── PaymentService.ts    # Payment processing
│   ├── WithdrawalService.ts # Withdrawal processing
│   ├── BalanceService.ts    # Balance operations
│   └── MaintenanceService.ts # System maintenance
└── Utils/
    └── logger.ts            # Logging utility
```

### Database Schema

- **Users**: Telegram user data, preferences, and statistics
- **UserSessions**: Active user sessions with state management
- **Balances**: User balance tracking
- **Withdrawals**: Withdrawal transaction records

## 🛠️ Setup & Installation

### Prerequisites

- Node.js 18+ or Bun
- MongoDB 5.0+
- Telegram Bot Token
- Chapa API Key

### Environment Variables

```bash
# Required
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
CHAPA_AUTH_KEY=your_chapa_auth_key
MONGODB_URL=mongodb://localhost:27017/chapa-payments

# Optional
PORT=5000
WEBHOOK_SECRET=your_webhook_secret
CALLBACK_URL=https://your-domain.com/payment-callback
BOT_RETURN_URL=https://your-domain.com/return
ADMIN_TELEGRAM_IDS=123456789,987654321
ADMIN_SECRET_KEY=your_admin_secret
LOG_LEVEL=info
```

### Installation

```bash
# Install dependencies
npm install

# Start the bot
npm start

# Or with Bun
bun install
bun start
```

## 📊 Production Features

### Session Management

- **Automatic Cleanup**: Expired sessions are cleaned up every 30 minutes
- **Stuck Session Recovery**: Sessions stuck in processing state are automatically reset
- **Session Timeout**: Sessions expire after 30 minutes of inactivity
- **State Persistence**: User states are stored in MongoDB for reliability

### Error Handling

- **Global Error Catcher**: All bot errors are caught and logged
- **Graceful Degradation**: Bot continues working even if some services fail
- **User-Friendly Messages**: Clear error messages for users
- **Automatic Recovery**: Failed operations can be retried

### Monitoring & Logging

- **Structured Logging**: JSON-formatted logs with different levels
- **Performance Metrics**: Response times and system health monitoring
- **Error Tracking**: Detailed error logs with stack traces
- **User Activity Tracking**: Monitor user interactions and patterns

### Security

- **User Blocking**: Admins can block/unblock users
- **Input Validation**: All user inputs are validated
- **Session Security**: Sessions are tied to Telegram IDs
- **Webhook Verification**: Payment callbacks are verified with signatures

## 🔧 Maintenance

### Automatic Maintenance

The bot includes automatic maintenance tasks:

- **Session Cleanup**: Removes expired sessions every 30 minutes
- **Stuck Session Reset**: Resets sessions stuck in processing state
- **Inactive User Detection**: Identifies users inactive for 30+ days

### Manual Maintenance

```bash
# Force maintenance run
curl -X POST http://localhost:5000/admin/maintenance \
  -H "x-admin-key: your_admin_secret"

# Check system health
curl http://localhost:5000/health
```

### Admin Commands

- `/admin` - Access admin panel (requires admin Telegram ID)
- **System Stats**: View system statistics and metrics
- **Active Users**: List currently active users
- **Maintenance**: Run manual maintenance tasks

## 📈 Performance Optimization

### Database Indexing

- User sessions are indexed by `telegramId` and `expiresAt`
- User activity is indexed by `lastActivity`
- Withdrawal status is indexed for quick queries

### Caching

- Bank list is cached for 5 minutes to reduce API calls
- User sessions are cached in memory with database persistence
- Frequently accessed data is cached appropriately

### Memory Management

- Sessions are automatically cleaned up to prevent memory leaks
- Large result sets are paginated
- Database connections are properly managed

## 🚨 Error Recovery

### Common Issues & Solutions

#### Session Issues

```typescript
// Reset stuck sessions
await SessionService.resetStuckSessions()

// Clear specific user session
await SessionService.clearSession(telegramId)
```

#### Database Issues

```typescript
// Check database connection
mongoose.connection.readyState

// Reconnect if needed
await mongoose.connect(MONGODB_URL)
```

#### Payment Issues

```typescript
// Verify payment status
const payment = await PaymentService.verifyPayment(reference)

// Retry failed payments
await PaymentService.retryPayment(reference)
```

## 📝 API Endpoints

### Health & Monitoring

- `GET /health` - System health check
- `POST /admin/maintenance` - Force maintenance (admin only)

### Payment Processing

- `POST /payment-callback` - Chapa webhook endpoint
- `GET /withdrawal/verify/:reference` - Verify withdrawal status
- `GET /withdrawal/history/:userId` - Get user withdrawal history
- `GET /banks` - Get available banks

## 🔒 Security Best Practices

### Environment Security

- Store sensitive data in environment variables
- Use strong, unique secrets for webhooks
- Regularly rotate API keys and tokens

### User Security

- Validate all user inputs
- Implement rate limiting for API endpoints
- Monitor for suspicious activity patterns

### Data Security

- Encrypt sensitive data at rest
- Use HTTPS for all external communications
- Implement proper access controls

## 📊 Monitoring & Analytics

### Key Metrics

- **Active Users**: Number of users with active sessions
- **Transaction Volume**: Total payments and withdrawals
- **Success Rates**: Payment and withdrawal success rates
- **Response Times**: Bot response and API call times
- **Error Rates**: System error frequency and types

### Log Analysis

```bash
# View error logs
tail -f logs/error.log

# View all logs
tail -f logs/combined.log

# Search for specific errors
grep "ERROR" logs/combined.log
```

## 🚀 Deployment

### Production Checklist

- [ ] Set up MongoDB with proper authentication
- [ ] Configure environment variables
- [ ] Set up SSL/TLS certificates
- [ ] Configure webhook URLs
- [ ] Set up monitoring and alerting
- [ ] Test payment and withdrawal flows
- [ ] Configure backup strategies
- [ ] Set up logging aggregation

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

### PM2 Deployment

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start app.js --name "telegram-bot"

# Monitor
pm2 monit

# Logs
pm2 logs telegram-bot
```

## 🤝 Contributing

### Development Setup

```bash
# Clone repository
git clone <repository-url>

# Install dependencies
npm install

# Set up development environment
cp .env.example .env

# Start development server
npm run dev
```

### Code Standards

- Follow TypeScript best practices
- Use proper error handling
- Add comprehensive logging
- Write unit tests for critical functions
- Document all public APIs

## 📞 Support

### Getting Help

- Check the logs for error details
- Review the health endpoint for system status
- Contact support with error logs and user context

### Common Commands

```bash
# Check bot status
curl http://localhost:5000/health

# View recent logs
tail -n 100 logs/combined.log

# Restart bot
pm2 restart telegram-bot

# Check database connection
mongo --eval "db.adminCommand('ping')"
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔄 Changelog

### v2.0.0 - Production Release

- ✅ Multi-user support with database persistence
- ✅ Session management with automatic cleanup
- ✅ Admin panel with monitoring tools
- ✅ Comprehensive error handling and logging
- ✅ Production-ready architecture and security
- ✅ Performance optimizations and caching
- ✅ Maintenance and health monitoring
