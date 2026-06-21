export function getEffectivePrice(item, quantity, cartItems = []) {
  // 1. Compute aggregate product quantity across all variant lines in the cart
  const productId = item.id || item.product_id;
  const aggregateQuantity = cartItems.length > 0 && productId
    ? cartItems.filter(i => (i.id || i.product_id) === productId).reduce((sum, i) => sum + Number(i.quantity || 0), 0)
    : quantity;

  const setMultiplier = item.selectedSetQuantity ?? item.setQuantity ?? 1;
  let basePrice = Number(item.price) || 0;
  
  if (item.bulkDiscounts && item.bulkDiscounts.length > 0) {
    for (const slab of item.bulkDiscounts) {
      const min = Number(slab.min_qty) || 0;
      const max = slab.max_qty != null ? Number(slab.max_qty) : null;
      
      if (aggregateQuantity >= min && (max === null || aggregateQuantity <= max)) {
        if (slab.discounted_price != null) {
          // Ensure the slab price is properly scaled for set-based items
          const slabPrice = Number(slab.discounted_price) * (item.priceMode === 'perSet' ? 1 : setMultiplier);
          if (slabPrice < basePrice) {
            basePrice = slabPrice;
          }
        } else if (slab.discount_percent != null) {
          const pct = Number(slab.discount_percent);
          if (pct > 0) {
            basePrice = (Number(item.price) || 0) * (1 - pct / 100);
          }
        }
      }
    }
  }
  
  return basePrice;
}

export function getProductGstAmount(item, effectivePrice, quantity) {
  const gstRate = item.gstRate != null ? Number(item.gstRate) : 0;
  return effectivePrice * quantity * (gstRate / 100);
}
