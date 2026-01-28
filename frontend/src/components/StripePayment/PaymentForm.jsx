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

const stripePromise = loadStripe('pk_test_51ScnySR58FH8Bu5pYbHzsgS3vEA1qTS4sK7xEbU8ZJsQ2QGiu10j2jo0KAOHVwCwLDxNgQkRTjL56wMNxKLl5dLg0077uIz37y');

const PaymentForm = ({ amount, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!stripe || !elements) return;
    
    setLoading(true);
    setError(null);

    try {
      // Create payment intent
      const { data } = await apiClient.post('/payments/create-intent', {
        amount: amount
      });

      // Confirm payment
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
      setError(err.response?.data?.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <div className="payment-header">
        <h3>Payment Details</h3>
        <p>Amount: ${amount.toFixed(2)}</p>
      </div>
      
      <TestCardInfo />
      
      <div className="card-element-container">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
            },
          }}
        />
      </div>
      
      {error && <div className="payment-error">{error}</div>}
      
      <div className="payment-buttons">
        <button type="button" onClick={onCancel} className="cancel-btn">
          Cancel
        </button>
        <button 
          type="submit" 
          disabled={!stripe || loading}
          className="pay-btn"
        >
          {loading ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
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