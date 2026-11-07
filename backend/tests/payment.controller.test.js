import { jest } from '@jest/globals';

const {
  getEthiopianAccounts,
  processEthiopianPayment,
  initializeEthiopianPayment,
  verifyEthiopianPayment,
  adminVerifyPayment,
  ETHIOPIAN_ACCOUNTS
} = await import('../controllers/payment.controller.js');

const { OrderModel } = await import('../models/order.model.js');
const { PaymentModel } = await import('../models/payment.model.js');

describe('Ethiopian Payment Controller - Production Suite', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      user: { id: 'testUser123', role: 'customer' },
      app: { get: jest.fn().mockReturnValue(null) }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('getEthiopianAccounts', () => {
    it('should return active Ethiopian payment accounts (Telebirr, CBE, etc.) with official merchant details', async () => {
      await getEthiopianAccounts(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          currency: 'ETB',
          merchantName: 'Foodie Restaurant PLC',
          accounts: expect.objectContaining({
            telebirr: expect.objectContaining({
              merchantCode: '554433',
              ussdCode: '*127#'
            }),
            cbe: expect.objectContaining({
              accountNumber: '1000234567891'
            })
          })
        })
      );
    });
  });

  describe('processEthiopianPayment (Direct API)', () => {
    it('should fail if payment method or amount is missing', async () => {
      req.body = { amount: 0 };
      await processEthiopianPayment(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should process Telebirr payment and return paid status with transaction ID', async () => {
      req.body = {
        method: 'telebirr',
        amount: 350.50,
        senderPhone: '0911223344'
      };
      await processEthiopianPayment(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          status: 'Paid',
          currency: 'ETB',
          amount: 350.50,
          provider: expect.stringContaining('Telebirr'),
          transactionId: expect.stringMatching(/^TLB-/),
        })
      );
    });

    it('should process CBE payment with user custom reference code', async () => {
      req.body = {
        method: 'cbe',
        amount: 500,
        senderAccount: '100099887766',
        referenceCode: 'CBE-CUSTOM-REF-99'
      };
      await processEthiopianPayment(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          status: 'Paid',
          transactionId: 'CBE-CUSTOM-REF-99',
          amount: 500,
        })
      );
    });
  });

  describe('verifyEthiopianPayment', () => {
    it('should reject verification if referenceCode is missing', async () => {
      req.body = {
        orderId: '507f1f77bcf86cd799439011',
        method: 'telebirr',
        referenceCode: ''
      };
      await verifyEthiopianPayment(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should reject invalid Ethiopian phone format', async () => {
      req.body = {
        orderId: '507f1f77bcf86cd799439011',
        method: 'telebirr',
        referenceCode: 'TLB-89104829',
        senderPhone: '12345' // invalid phone
      };
      await verifyEthiopianPayment(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('valid 10-digit Ethiopian mobile number')
        })
      );
    });
  });
});
