import React, { useState } from 'react';

export default function VariantGridMatrix({ product, onAddMatrixToCart }) {
  const sizes = product.sizes || ['One Size'];
  const colors = product.colors || [{ id: 'default', name: 'Standard' }];

  const [matrixQty, setMatrixQty] = useState({});

  const matrixKey = (color, size) => `${color}|${size}`;

  const handleQtyChange = (color, size, qtyStr) => {
    const qty = parseInt(qtyStr.replace(/\D/g, ''), 10) || 0;
    setMatrixQty((prev) => ({
      ...prev,
      [matrixKey(color, size)]: qty,
    }));
  };

  const handleAddAll = () => {
    const itemsToAdd = [];
    Object.entries(matrixQty).forEach(([key, qty]) => {
      if (qty > 0) {
        const separatorIndex = key.indexOf('|');
        const color = key.slice(0, separatorIndex);
        const size = key.slice(separatorIndex + 1);
        itemsToAdd.push({
          productId: product.id,
          name: product.name,
          color: colors.find((c) => c.name === color) || colors[0],
          size,
          quantity: qty,
          price: product.price,
        });
      }
    });
    if (itemsToAdd.length > 0) {
      onAddMatrixToCart(itemsToAdd);
      setMatrixQty({});
    }
  };

  return (
    <div style={styles.container} data-testid="variant-matrix-root">
      <h3 style={styles.title}>B2B Quick Order Matrix</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Color / Size</th>
              {sizes.map((size) => (
                <th key={size} style={styles.th}>{size}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {colors.map((color) => (
              <tr key={color.name}>
                <td style={styles.tdColor}>{color.name}</td>
                {sizes.map((size) => (
                  <td key={size} style={styles.tdInput}>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      data-testid={`matrix-qty-${String(color.name).replace(/\s+/g, '-').toLowerCase()}-${String(size).replace(/\s+/g, '-').toLowerCase()}`}
                      value={matrixQty[matrixKey(color.name, size)] || ''}
                      onChange={(e) => handleQtyChange(color.name, size, e.target.value)}
                      placeholder="0"
                      style={styles.input}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={handleAddAll} style={styles.btn} data-testid="matrix-add-to-cart">
        Add Matrix to Cart 🛒
      </button>
    </div>
  );
}

const styles = {
  container: { marginTop: '16px', padding: '16px', border: '1px solid #E2E8F0', borderRadius: '10px', backgroundColor: '#F8FAFC' },
  title: { fontSize: '13px', fontWeight: '800', color: '#1E293B', marginBottom: '12px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' },
  th: { padding: '8px', borderBottom: '2px solid #E2E8F0', color: '#475569', fontWeight: '700', textAlign: 'center' },
  tdColor: { padding: '8px', borderBottom: '1px solid #E2E8F0', color: '#1E293B', fontWeight: '700' },
  tdInput: { padding: '4px', borderBottom: '1px solid #E2E8F0', textAlign: 'center' },
  input: { width: '45px', padding: '6px', textAlign: 'center', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '12px' },
  btn: { width: '100%', padding: '10px', marginTop: '12px', borderRadius: '6px', backgroundColor: '#0D9488', color: '#FFF', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '13px' },
};
