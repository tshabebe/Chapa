# MVC Architecture Documentation

This project has been converted to follow the Model-View-Controller (MVC) architecture pattern for better code organization, maintainability, and scalability.

## Project Structure

```
simple-test/
├── server/
│   ├── models/           # Data models and business logic
│   │   ├── Balance.ts
│   │   └── Withdrawal.ts
│   ├── controllers/      # Request handling and business logic coordination
│   │   ├── PaymentController.ts
│   │   ├── WithdrawalController.ts
│   │   ├── BalanceController.ts
│   │   └── TelegramBotController.ts
│   ├── services/         # External API interactions and utilities
│   │   ├── PaymentService.ts
│   │   ├── WithdrawalService.ts
│   │   └── BalanceService.ts
│   ├── routes/           # API route definitions
│   │   ├── paymentRoutes.ts
│   │   ├── withdrawalRoutes.ts
│   │   └── balanceRoutes.ts
│   ├── bot/              # Telegram bot implementation
│   │   └── telegramBot.ts
│   └── app.ts            # Main application entry point
├── client/
│   ├── src/
│   │   ├── views/        # Main view components
│   │   │   └── PaymentView.tsx
│   │   ├── components/   # Reusable UI components
│   │   │   ├── PaymentForm.tsx
│   │   │   └── BalanceDisplay.tsx
│   │   ├── services/     # Frontend API services
│   │   │   └── PaymentService.ts
│   │   └── App.tsx       # Main app component
│   └── ...
└── ...
```

## Architecture Components

### Models (Data Layer)

- **Purpose**: Define data structures, database schemas, and business logic
- **Location**: `server/models/`
- **Examples**: `Balance.ts`, `Withdrawal.ts`
- **Responsibilities**:
  - Database schema definitions
  - Data validation
  - Business logic methods
  - Database operations

### Controllers (Logic Layer)

- **Purpose**: Handle HTTP requests, coordinate between models and services
- **Location**: `server/controllers/`
- **Examples**: `PaymentController.ts`, `WithdrawalController.ts`
- **Responsibilities**:
  - Request/response handling
  - Input validation
  - Business logic coordination
  - Error handling
  - Response formatting

### Services (Business Logic Layer)

- **Purpose**: Handle external API interactions and complex business logic
- **Location**: `server/services/`
- **Examples**: `PaymentService.ts`, `WithdrawalService.ts`
- **Responsibilities**:
  - External API calls (Chapa, etc.)
  - Complex business operations
  - Data transformation
  - Caching logic

### Views (Presentation Layer)

- **Purpose**: Handle UI rendering and user interactions
- **Location**: `client/src/views/` and `client/src/components/`
- **Examples**: `PaymentView.tsx`, `PaymentForm.tsx`
- **Responsibilities**:
  - UI rendering
  - User interaction handling
  - State management
  - Component composition

### Routes (Routing Layer)

- **Purpose**: Define API endpoints and route handlers
- **Location**: `server/routes/`
- **Examples**: `paymentRoutes.ts`, `withdrawalRoutes.ts`
- **Responsibilities**:
  - API endpoint definitions
  - Route middleware
  - Controller method mapping

## API Endpoints

### Payment Endpoints

- `POST /api/payments/initialize` - Initialize a new payment
- `POST /api/payments/callback` - Handle payment webhooks
- `GET /api/payments/status/:tx_ref` - Get payment status

### Withdrawal Endpoints

- `GET /api/withdrawals/banks` - Get available banks
- `POST /api/withdrawals/initiate` - Initiate withdrawal
- `GET /api/withdrawals/verify/:reference` - Verify withdrawal
- `GET /api/withdrawals/history` - Get withdrawal history
- `GET /api/withdrawals/:reference` - Get withdrawal by reference

### Balance Endpoints

- `GET /api/balance` - Get balance
- `POST /api/balance/increment` - Increment balance
- `POST /api/balance/decrement` - Decrement balance
- `GET /api/balance/check` - Check if sufficient balance

## Benefits of MVC Architecture

1. **Separation of Concerns**: Each component has a specific responsibility
2. **Maintainability**: Easier to modify and extend individual components
3. **Testability**: Components can be tested in isolation
4. **Reusability**: Services and components can be reused across the application
5. **Scalability**: Easy to add new features without affecting existing code
6. **Code Organization**: Clear structure makes it easier for developers to understand

## Development Workflow

1. **Adding New Features**:

   - Create/update models for data structure
   - Add business logic to services
   - Create controllers for request handling
   - Define routes for API endpoints
   - Create views/components for UI

2. **Modifying Existing Features**:

   - Identify the appropriate layer to modify
   - Update the specific component
   - Ensure proper integration with other layers

3. **Testing**:
   - Test models independently
   - Test services with mocked dependencies
   - Test controllers with mocked services
   - Test views with mocked data

## Migration Notes

The original monolithic `server.ts` file has been split into:

- **Controllers**: Handle request/response logic
- **Services**: Handle external API interactions
- **Routes**: Define API endpoints
- **Models**: Handle data operations

Legacy endpoints are maintained for backward compatibility and redirect to new MVC endpoints.

## Environment Variables

Make sure to set up the following environment variables:

- `TELEGRAM_BOT_TOKEN` - Telegram bot token
- `CHAPA_AUTH_KEY` - Chapa API authentication key
- `WEBHOOK_SECRET` - Webhook signature verification secret
- `CALLBACK_URL` - Payment callback URL
- `MONGODB_URL` - MongoDB connection string
- `BOT_RETURN_URL` - Bot return URL
- `PORT` - Server port (default: 5000)

## Running the Application

```bash
# Development
bun run dev

# Production
bun run start

# Server only
bun run dev:server

# Client only
bun run dev:client
```
