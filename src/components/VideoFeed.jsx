import React, { useRef, useEffect } from 'react';
import { X, ShoppingBag } from 'lucide-react';

export default function VideoFeed({ products, onClose, onAddVariantToCart }) {
  const videoProducts = products.map((prod, idx) => ({
    ...prod,
    videoUrl: prod.videoUrl || (idx % 2 === 0
      ? 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
      : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'),
  }));

  const containerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target.querySelector('video');
          if (video) {
            if (entry.isIntersecting) {
              video.play().catch(() => {});
            } else {
              video.pause();
            }
          }
        });
      },
      { threshold: 0.2 },
    );

    const cards = containerRef.current?.querySelectorAll('.video-card-container');
    cards?.forEach((card) => observer.observe(card));

    return () => cards?.forEach((card) => observer.unobserve(card));
  }, [products]);

  return (
    <div style={styles.modalBg}>
      <button type="button" onClick={onClose} style={styles.closeBtn} aria-label="Close video feed">
        <X size={24} />
      </button>

      <div ref={containerRef} style={styles.scrollFeed}>
        {videoProducts.map((prod) => (
          <div key={prod.id} className="video-card-container" style={styles.videoCard}>
            <video
              src={prod.videoUrl}
              style={styles.video}
              loop
              muted
              playsInline
            />

            <div style={styles.overlayCard}>
              <h3 style={styles.title}>{prod.name}</h3>
              <p style={styles.price}>₹{prod.price}</p>

              <button
                type="button"
                onClick={() => onAddVariantToCart({
                  id: prod.id,
                  name: prod.name,
                  price: prod.price,
                  quantity: 1,
                  selectedColor: prod.colors?.[0] || null,
                  selectedSize: prod.sizes?.[0] || 'One Size',
                })}
                style={styles.buyBtn}
              >
                <ShoppingBag size={16} />
                Add to Cart
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  modalBg: { position: 'fixed', inset: 0, backgroundColor: '#000', zIndex: 1000, display: 'flex', flexDirection: 'column' },
  closeBtn: { position: 'absolute', top: '16px', right: '16px', zIndex: 1010, backgroundColor: 'rgba(0,0,0,0.5)', border: 'none', color: '#FFF', padding: '8px', borderRadius: '50%', cursor: 'pointer' },
  scrollFeed: { flex: 1, overflowY: 'scroll', scrollSnapType: 'y mandatory', scrollbarWidth: 'none', msOverflowStyle: 'none' },
  videoCard: { position: 'relative', width: '100%', height: '100vh', scrollSnapAlign: 'start' },
  video: { width: '100%', height: '100%', objectFit: 'cover' },
  overlayCard: {
    position: 'absolute',
    bottom: '40px',
    left: '20px',
    right: '20px',
    padding: '20px',
    borderRadius: '16px',
    backgroundColor: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    color: '#FFF',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  title: { fontSize: '16px', fontWeight: '800', margin: 0 },
  price: { fontSize: '14px', color: '#E2E8F0', fontWeight: 'bold', margin: 0 },
  buyBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', padding: '12px', border: 'none', borderRadius: '8px', backgroundColor: '#0D9488', color: '#FFF', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' },
};
