import { Router } from 'express'
import { PaymentController } from '../controllers/PaymentController.js'

const router = Router()

// Initialize payment
router.post('/initialize', (req, res) => {
  PaymentController.initializePayment(req, res)
})

// Handle payment callback
router.post('/callback', (req, res) => {
  PaymentController.handlePaymentCallback(req, res)
})

// Get payment status
router.get('/status/:tx_ref', (req, res) => {
  PaymentController.getPaymentStatus(req, res)
})

export default router
