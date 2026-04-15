import './TestCardInfo.css';

const TestCardInfo = () => {
  return (
    <div className="test-card-info">
      <h4>Test Card Information</h4>
      <div className="card-details">
        <div className="card-field">
          <label>Card Number:</label>
          <span>4242 4242 4242 4242</span>
        </div>
        <div className="card-field">
          <label>Expiry Date:</label>
          <span>12/26</span>
        </div>
        <div className="card-field">
          <label>CVC:</label>
          <span>123</span>
        </div>
        <div className="card-field">
          <label>ZIP Code:</label>
          <span>12345</span>
        </div>
      </div>
    </div>
  );
};

export default TestCardInfo;