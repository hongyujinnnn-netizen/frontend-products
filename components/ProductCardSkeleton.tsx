const ProductCardSkeleton = () => (
  <article className="product-card-skeleton">
    <div className="skeleton-block skeleton-image" />
    <div className="skeleton-block skeleton-line skeleton-line-eyebrow" />
    <div className="skeleton-block skeleton-line skeleton-line-title" />
    <div className="skeleton-block skeleton-line skeleton-line-rating" />
    <div className="skeleton-footer">
      <div className="skeleton-block skeleton-line skeleton-line-price" />
      <div className="skeleton-block skeleton-circle" />
    </div>
  </article>
);

export default ProductCardSkeleton;
