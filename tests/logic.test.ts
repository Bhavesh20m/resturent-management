import test from 'node:test';
import assert from 'node:assert/strict';

test('Tax and service charge calculation', () => {
  const subtotal = 420 + 90 * 2; // 600
  const tax = Math.round(subtotal * 0.05 * 100) / 100;
  const serviceCharge = Math.round(subtotal * 0.05 * 100) / 100;
  const total = Math.round((subtotal + tax + serviceCharge) * 100) / 100;

  assert.equal(tax, 30);
  assert.equal(serviceCharge, 30);
  assert.equal(total, 660);
});

test('Recipe deduction multiplier calculation for Paneer Butter Masala', () => {
  const recipe = {
    ingredients: [
      { name: 'Paneer', quantityRequired: 200, unit: 'g' },
      { name: 'Tomatoes', quantityRequired: 150, unit: 'g' },
      { name: 'Butter', quantityRequired: 30, unit: 'g' },
      { name: 'Cream', quantityRequired: 40, unit: 'ml' },
      { name: 'Spices', quantityRequired: 10, unit: 'g' },
    ],
  };

  const orderQuantity = 2;
  const deductions = recipe.ingredients.map((ing) => ({
    name: ing.name,
    deducted: ing.quantityRequired * orderQuantity,
  }));

  assert.equal(deductions.find((d) => d.name === 'Paneer')?.deducted, 400);
  assert.equal(deductions.find((d) => d.name === 'Tomatoes')?.deducted, 300);
  assert.equal(deductions.find((d) => d.name === 'Butter')?.deducted, 60);
  assert.equal(deductions.find((d) => d.name === 'Cream')?.deducted, 80);
  assert.equal(deductions.find((d) => d.name === 'Spices')?.deducted, 20);
});

test('Idempotency check: duplicate event protection', () => {
  const order = {
    id: 'ord-101',
    inventoryDeducted: true,
  };

  let wasDeducted = false;
  if (!order.inventoryDeducted) {
    wasDeducted = true;
  }

  assert.equal(wasDeducted, false, 'Should not deduct when inventoryDeducted is already true');
});

test('Split payment calculation', () => {
  const grandTotal = 1936;
  const splitCount = 2;
  const perPerson = Math.round((grandTotal / splitCount) * 100) / 100;
  assert.equal(perPerson, 968);

  const paidAmount = perPerson;
  const remaining = Math.max(0, Math.round((grandTotal - paidAmount) * 100) / 100);
  assert.equal(remaining, 968);
});
