import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProductDrawer from '../components/ProductDrawer';

// Mock getEffectivePrice and getProductGstAmount from pricing service
vi.mock('../services/pricing', () => ({
  getEffectivePrice: (product, qty) => product.price,
  getProductGstAmount: () => 0,
}));

const mockProductSizesOnly = {
  id: 1,
  name: 'Test Shirt Sizes Only',
  category: 'Apparel',
  price: 500,
  originalPrice: 600,
  tag: 'In Stock',
  description: 'A cool test shirt',
  image: 'https://example.com/image.jpg',
  sizes: ['S', 'M', 'L'],
  colors: [], // No colors to prevent B2B matrix UI
  priceMode: 'perPiece',
};

const mockProductColorsOnly = {
  id: 2,
  name: 'Test Shirt Colors Only',
  category: 'Apparel',
  price: 500,
  originalPrice: 600,
  tag: 'In Stock',
  description: 'A cool test shirt',
  image: 'https://example.com/image.jpg',
  sizes: [], // No sizes to prevent B2B matrix UI
  colors: [
    { name: 'Red', hex: '#ff0000' },
    { name: 'Blue', hex: '#0000ff' }
  ],
  priceMode: 'perPiece',
};

const mockProductPerSet = {
  id: 3,
  name: 'Test Set Combo',
  category: 'Apparel',
  price: 1500,
  originalPrice: 1800,
  tag: 'In Stock',
  description: 'A cool test set combo',
  image: 'https://example.com/set.jpg',
  sizes: ['Pack of 3'], // In DB, this is saved in sizes due to compat
  colors: [{ name: 'Default', hex: '#94a3b8' }],
  priceMode: 'perSet',
  setQuantity: 3,
  setName: 'Pack of 3',
  setComposition: [
    { size_label: 'S', color_label: 'Red', color_hex: '#ff0000', qty_in_set: 1 },
    { size_label: 'M', color_label: 'Blue', color_hex: '#0000ff', qty_in_set: 2 }
  ],
};

describe('ProductDrawer Component Tests', () => {
  it('renders size selector for normal perPiece products with sizes', () => {
    render(
      <ProductDrawer
        isOpen={true}
        onClose={vi.fn()}
        product={mockProductSizesOnly}
        onAddToCart={vi.fn()}
      />
    );

    // Verify Select Size header is shown
    expect(screen.getByText(/Select Size:/i)).toBeInTheDocument();

    // Verify individual size options are rendered
    expect(screen.getByRole('button', { name: 'S' })).toBeInTheDocument();
    expect(screen.getByText('M')).toBeInTheDocument();
    expect(screen.getByText('L')).toBeInTheDocument();

    // Select Color selector should NOT be shown
    expect(screen.queryByText(/Select Color:/i)).not.toBeInTheDocument();
  });

  it('renders color selector for normal perPiece products with colors', () => {
    render(
      <ProductDrawer
        isOpen={true}
        onClose={vi.fn()}
        product={mockProductColorsOnly}
        onAddToCart={vi.fn()}
      />
    );

    // Verify Select Color header is shown
    expect(screen.getByText(/Select Color:/i)).toBeInTheDocument();

    // Select Size selector should NOT be shown
    expect(screen.queryByText(/Select Size:/i)).not.toBeInTheDocument();
  });

  it('hides size and color selectors for perSet products, showing Set Composition Breakdown instead', () => {
    render(
      <ProductDrawer
        isOpen={true}
        onClose={vi.fn()}
        product={mockProductPerSet}
        onAddToCart={vi.fn()}
      />
    );

    // Verify Select Color selector is NOT rendered
    expect(screen.queryByText(/Select Color:/i)).not.toBeInTheDocument();
    
    // Verify Select Size selector is NOT rendered
    expect(screen.queryByText(/Select Size:/i)).not.toBeInTheDocument();

    // Verify Set Composition Breakdown is rendered
    expect(screen.getByText(/Set Composition Breakdown/i)).toBeInTheDocument();
    expect(screen.getByText(/Red \/ Size S/i)).toBeInTheDocument();
    expect(screen.getByText(/Blue \/ Size M/i)).toBeInTheDocument();
  });
});
