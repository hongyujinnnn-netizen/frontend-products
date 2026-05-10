import { useEffect, useState } from 'react';
import { useMessage } from '../../hooks/useMessage';
import { listAdminReviews, moderateReview, type AdminReview, type ReviewStatus } from '../../services/reviews';

const ReviewsTab = () => {
  const { showMessage } = useMessage();
  const [adminReviews, setAdminReviews] = useState<AdminReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsStatusFilter, setReviewsStatusFilter] = useState<ReviewStatus | 'ALL'>('PENDING');
  const [reviewsProductFilter, setReviewsProductFilter] = useState<string>('');
  const [reviewsRatingFilter, setReviewsRatingFilter] = useState<'ALL' | '1' | '2' | '3' | '4' | '5'>('ALL');
  const [reviewModerationReason, setReviewModerationReason] = useState<Record<string, string>>({});
  const [reviewWorkingId, setReviewWorkingId] = useState<string | null>(null);

  const loadAdminReviews = async () => {
    setReviewsLoading(true);
    try {
      const productId = Number(reviewsProductFilter);
      const rating = reviewsRatingFilter === 'ALL' ? undefined : Number(reviewsRatingFilter);
      const status = reviewsStatusFilter === 'ALL' ? undefined : reviewsStatusFilter;
      const data = await listAdminReviews({
        status,
        productId: Number.isFinite(productId) && productId > 0 ? productId : undefined,
        rating: typeof rating === 'number' && rating >= 1 && rating <= 5 ? rating : undefined,
      });
      setAdminReviews(data);
    } catch {
      showMessage('error', 'Unable to load reviews');
      setAdminReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    void loadAdminReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleModerateReview = async (review: AdminReview, status: ReviewStatus) => {
    setReviewWorkingId(String(review.id));
    try {
      const reason = (reviewModerationReason[String(review.id)] ?? '').trim();
      await moderateReview(review.id, { status, reason: reason || null });
      showMessage('success', `Review ${status.toLowerCase()}`);
      await loadAdminReviews();
    } catch {
      showMessage('error', 'Unable to update review');
    } finally {
      setReviewWorkingId(null);
    }
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h3>Reviews moderation</h3>
          <p className="form-hint">Approve, reject, or hide reviews. Use filters to focus your queue.</p>
        </div>
        <button className="button button-ghost" type="button" onClick={() => void loadAdminReviews()} disabled={reviewsLoading}>
          {reviewsLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="toolbar compact flex flex-wrap gap-2">
        <select
          className="toolbar-input h-10 min-w-[180px] rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none"
          value={reviewsStatusFilter}
          onChange={(event) => setReviewsStatusFilter(event.target.value as typeof reviewsStatusFilter)}
        >
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="HIDDEN">Hidden</option>
          <option value="ALL">All statuses</option>
        </select>

        <input
          className="toolbar-input h-10 min-w-[180px] rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="Filter by product ID"
          value={reviewsProductFilter}
          onChange={(event) => setReviewsProductFilter(event.target.value)}
          inputMode="numeric"
        />

        <select
          className="toolbar-input h-10 min-w-[160px] rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none"
          value={reviewsRatingFilter}
          onChange={(event) => setReviewsRatingFilter(event.target.value as typeof reviewsRatingFilter)}
        >
          <option value="ALL">All ratings</option>
          {[5, 4, 3, 2, 1].map((value) => (
            <option key={value} value={String(value)}>
              {value} stars
            </option>
          ))}
        </select>

        <button className="button button-primary" type="button" onClick={() => void loadAdminReviews()} disabled={reviewsLoading}>
          Apply filters
        </button>
      </div>

      {reviewsLoading ? (
        <div className="table-skeleton">
          <div className="skeleton-row" />
          <div className="skeleton-row" />
          <div className="skeleton-row" />
        </div>
      ) : adminReviews.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">★</div>
          <h3>No reviews</h3>
          <p>Try changing filters, or wait for customers to submit reviews.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>ID</th>
                <th>Product</th>
                <th>Rating</th>
                <th>Reviewer</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {adminReviews.map((review) => {
                const working = reviewWorkingId === String(review.id);
                return (
                  <tr key={String(review.id)}>
                    <td className="cell-mono">#{review.id}</td>
                    <td className="cell-sub">#{review.productId}</td>
                    <td>{review.rating} / 5</td>
                    <td>
                      <div className="cell-strong">{review.reviewerName}</div>
                      {review.verifiedPurchase && <span className="pill status-success">Verified</span>}
                    </td>
                    <td className="cell-sub">{new Date(review.createdAt).toLocaleDateString()}</td>
                    <td>
                      <span className={`pill ${review.status === 'PENDING' ? 'status-warning' : review.status === 'APPROVED' ? 'status-success' : review.status === 'REJECTED' ? 'status-danger' : 'status-neutral'}`}>
                        {review.status}
                      </span>
                    </td>
                    <td>
                      <div className="grid gap-2">
                        <input
                          className="toolbar-input h-10 min-w-[220px] rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none"
                          placeholder="Moderation reason (optional)"
                          value={reviewModerationReason[String(review.id)] ?? ''}
                          onChange={(event) =>
                            setReviewModerationReason((prev) => ({ ...prev, [String(review.id)]: event.target.value }))
                          }
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="button button-primary"
                            type="button"
                            onClick={() => void handleModerateReview(review, 'APPROVED')}
                            disabled={working || review.status === 'APPROVED'}
                          >
                            {working && review.status !== 'APPROVED' ? 'Working...' : 'Approve'}
                          </button>
                          <button
                            className="button button-danger"
                            type="button"
                            onClick={() => void handleModerateReview(review, 'REJECTED')}
                            disabled={working || review.status === 'REJECTED'}
                          >
                            Reject
                          </button>
                          <button
                            className="button button-ghost"
                            type="button"
                            onClick={() => void handleModerateReview(review, 'HIDDEN')}
                            disabled={working || review.status === 'HIDDEN'}
                          >
                            Hide
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {adminReviews.length > 0 && (
        <div className="panel mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h4 className="mb-2">Selected review details</h4>
          <p className="form-hint">Open a review on the product page to view customer-facing rendering.</p>
        </div>
      )}
    </section>
  );
};

export default ReviewsTab;
