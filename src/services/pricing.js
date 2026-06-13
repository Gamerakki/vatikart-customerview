export function getEffectivePrice(item, quantity) {
  let price = Number(item.price) || 0;
  
  if (item.bulkDiscounts && item.bulkDiscounts.length > 0) {
    for (const slab of item.bulkDiscounts) {
      const min = Number(slab.min_qty) || 0;
      const max = slab.max_qty != null ? Number(slab.max_qty) : null;
      
      if (quantity >= min && (max === null || quantity <= max)) {
        if (slab.discounted_price != null) {
          price = Number(slab.discounted_price);
        } else if (slab.discount_percent != null) {
          price = (Number(item.price) || 0) * (1 - Number(slab.discount_percent) / 100);
        }
      }
    }
  }
  
  return price;
}

export function getProductGstAmount(item, effectivePrice, quantity) {
  const gstRate = item.gstRate != null ? Number(item.gstRate) : 0;
  return effectivePrice * quantity * (gstRate / 100);
}
