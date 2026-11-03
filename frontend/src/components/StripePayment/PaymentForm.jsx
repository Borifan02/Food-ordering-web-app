import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import apiClient from '../../api/axios';
import TestCardInfo from '../TestCardInfo/TestCardInfo';
import './PaymentForm.css';

const stripePublishableKey =
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
  'pk_test_51ScnySR58FH8Bu5pYbHzsgS3vEA1qTS4sK7xEbU8ZJsQ2QGiu10j2jo0KAOHVwCwLDxNgQkRTjL56wMNxKLl5dLg0077uIz37y';

const stripePromise = loadStripe(stripePublishableKey);

const PaymentForm = ({ amount, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const numAmount = Number(amount) || 0;

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!stripe || !elements) return;
    
    setLoading(true);
    setError(null);

    try {
      // Create payment intent on backend
      const { data } = await apiClient.post('/payments/create-intent', {
        amount: numAmount
      });

      // Confirm payment with Stripe
      const result = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
        }
      });

      if (result.error) {
        setError(result.error.message);
      } else {
        onSuccess(result.paymentIntent);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Payment processing failed. Try test card.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <div className="payment-header">
        <h3>Secure Card Checkout</h3>
        <p className="payment-amount-display">Amount to Pay: <strong>${numAmount.toFixed(2)}</strong></p>
      </div>
      
      <TestCardInfo />
      
      <div className="card-element-container">
        <label className="card-input-label">Credit or Debit Card</label>
        <div className="card-element-box">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#1e293b',
                  fontFamily: 'inherit',
                  '::placeholder': {
                    color: '#94a3b8',
                  },
                },
                invalid: {
                  color: '#ef4444',
                },
              },
            }}
          />
        </div>
      </div>
      
      {error && <div className="payment-error">⚠️ {error}</div>}
      
      <div className="payment-buttons">
        <button type="button" onClick={onCancel} className="cancel-btn">
          Cancel
        </button>
        <button 
          type="submit" 
          disabled={!stripe || loading}
          className="pay-btn"
        >
          {loading ? 'Processing Payment...' : `Pay $${numAmount.toFixed(2)} Now`}
        </button>
      </div>
    </form>
  );
};

const StripePayment = ({ amount, onSuccess, onCancel }) => {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm amount={amount} onSuccess={onSuccess} onCancel={onCancel} />
    </Elements>
  );
};

export default StripePayment;
