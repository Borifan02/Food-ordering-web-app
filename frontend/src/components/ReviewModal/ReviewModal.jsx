import { useState } from "react";
import apiClient from "../../api/axios";
import { useToast } from "../../context/ToastContext";
import "./ReviewModal.css";

const QUICK_TAGS = [
  "🔥 Hot & Fresh",
  "⚡ Super Fast",
  "😋 Delicious Flavor",
  "🍱 Generous Portion",
  "💯 10/10 Recommend",
  "🛵 Friendly Driver",
];

const ReviewModal = ({ orderId, menuItem, onClose }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const fullComment = selectedTags.length > 0
      ? `${selectedTags.join(" • ")}. ${comment}`.trim()
      : comment || "Great food!";

    try {
      await apiClient.post("/reviews", {
        orderId,
        menuItemId: menuItem.menuItemId?._id || menuItem.menuItemId || menuItem._id,
        rating,
        comment: fullComment,
      });
      toast.success("Thank you! Your review has been published. ⭐");
      onClose();
    } catch (error) {
      console.error("Review error:", error.response?.data);
      toast.error(error.response?.data?.message || "Error submitting review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content review-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="review-modal-header">
          <h3>Rate & Review</h3>
          <button className="review-modal-close" onClick={onClose}>×</button>
        </div>
        <p className="review-dish-name">How was your <strong>{menuItem.name}</strong>?</p>

        <form onSubmit={handleSubmit}>
          {/* Star selector */}
          <div className="star-rating">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={`star ${star <= rating ? "filled" : ""}`}
                onClick={() => setRating(star)}
              >
                ★
              </span>
            ))}
          </div>

          <div className="rating-desc-label">
            {rating === 5 && "⭐ Outstanding - loved it!"}
            {rating === 4 && "👍 Really good!"}
            {rating === 3 && "👌 Decent"}
            {rating === 2 && "👎 Could be better"}
            {rating === 1 && "⚠️ Disappointing"}
          </div>

          {/* Quick feedback tag pills */}
          <div className="review-tags-box">
            <label>Quick Highlights:</label>
            <div className="review-tags-list">
              {QUICK_TAGS.map((tag) => (
                <button
                  type="button"
                  key={tag}
                  className={`review-tag-chip ${selectedTags.includes(tag) ? "selected" : ""}`}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <textarea
            placeholder="Share what you liked most about the flavor, portion, or delivery..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Review ★"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewModal;
