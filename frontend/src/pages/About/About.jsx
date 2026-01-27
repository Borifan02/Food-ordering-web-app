import "./About.css";

const About = () => {
  return (
    <div className="about-container">
      <div className="about-hero">
        <h1>About Foodie</h1>
        <p>Delivering happiness, one meal at a time</p>
      </div>

      <div className="about-content">
        <section className="about-section">
          <h2>Our Story</h2>
          <p>
            Founded in 2024, Foodie started with a simple mission: to bring delicious, 
            high-quality food directly to your doorstep. We believe that great food 
            brings people together and creates memorable experiences.
          </p>
        </section>

        <section className="about-section">
          <h2>What We Offer</h2>
          <div className="features-grid">
            <div className="feature">
              <span className="feature-icon">🍕</span>
              <h3>Fresh Ingredients</h3>
              <p>We source only the freshest ingredients from local suppliers</p>
            </div>
            <div className="feature">
              <span className="feature-icon">🚚</span>
              <h3>Fast Delivery</h3>
              <p>Quick and reliable delivery to your location</p>
            </div>
            <div className="feature">
              <span className="feature-icon">👨🍳</span>
              <h3>Expert Chefs</h3>
              <p>Our experienced chefs craft every dish with care</p>
            </div>
            <div className="feature">
              <span className="feature-icon">⭐</span>
              <h3>Quality Service</h3>
              <p>Exceptional customer service and satisfaction guaranteed</p>
            </div>
          </div>
        </section>

        <section className="about-section">
          <h2>Our Mission</h2>
          <p>
            To provide exceptional food delivery service that exceeds customer expectations 
            while supporting local communities and maintaining the highest standards of 
            quality and freshness.
          </p>
        </section>
      </div>
    </div>
  );
};

export default About;