import { describe, expect, it } from 'vitest';
import { cuisineList, formatCuisines } from '../cuisine';

describe('cuisineList', () => {
  it('cleans raw semicolon tag lists from imported data', () => {
    expect(cuisineList('cake;dessert;fried rice;indian;pastry;sweet;waffles')).toEqual([
      'Cake', 'Dessert', 'Fried Rice', 'Indian', 'Pastry', 'Sweet', 'Waffles',
    ]);
  });

  it('drops plural duplicates and expands regional fragments', () => {
    expect(cuisineList('dessert;indian;north;rajasthani;sweet;sweets')).toEqual([
      'Dessert', 'Indian', 'North Indian', 'Rajasthani', 'Sweet',
    ]);
    expect(cuisineList('dal;north;north indian;tiramisu')).toEqual(['Dal', 'North Indian', 'Tiramisu']);
  });

  it('keeps tidy comma lists as they are', () => {
    expect(cuisineList('Chinese, Dal')).toEqual(['Chinese', 'Dal']);
  });
});

describe('formatCuisines', () => {
  it('shows the first few and a count of the rest', () => {
    expect(formatCuisines('cake;dessert;fried rice;indian;pastry;sweet;waffles')).toBe('Cake · Dessert · Fried Rice +4');
    expect(formatCuisines('Sandwich, Chole, Pulao')).toBe('Sandwich · Chole · Pulao');
  });

  it('falls back when there is nothing to show', () => {
    expect(formatCuisines('')).toBe('Multi-cuisine');
    expect(formatCuisines(null)).toBe('Multi-cuisine');
  });
});
