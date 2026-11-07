import { jest } from '@jest/globals';

const { getEthiopianAccounts, processEthiopianPayment, ETHIOPIAN_ACCOUNTS } = await import('../controllers/payment.controller.js');

describe('Ethiopian Payment Controller', () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {},
            user: { id: 'testUser123' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        jest.clearAllMocks();
    });

    describe('getEthiopianAccounts', () => {
        it('should return active Ethiopian payment accounts (Telebirr, CBE, etc.)', async () => {
            await getEthiopianAccounts(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    currency: 'ETB',
                    accounts: expect.objectContaining({
                        telebirr: expect.objectContaining({ name: 'Telebirr' }),
                        cbe: expect.objectContaining({ name: 'Commercial Bank of Ethiopia (CBE)' })
                    })
                })
            );
        });
    });

    describe('processEthiopianPayment', () => {
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
                    provider: 'Telebirr',
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
});

