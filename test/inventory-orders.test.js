'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var inventory = require('../lib/inventory');
var orders = require('../lib/orders');

test('selling the exact remaining sellable stock succeeds', function () {
  var products = [
    { id: 1, sku: 'DRY-001', name: 'A2 Gir Cow Ghee 500ml', stock: 1, reserved: 0 },
    { id: 2, sku: 'SPC-001', name: 'Byadgi Chilli Powder', stock: 4, reserved: 3 }
  ];

  var ghee = inventory.check(products, [{ id: 1, qty: 1 }]);
  var chilli = inventory.check(products, [{ id: 2, qty: 1 }]);

  assert.deepEqual(ghee, { ok: true });
  assert.deepEqual(chilli, { ok: true });
});

test('cancelling pending order #1007 restores its physical stock', function () {
  var product = {
    id: 1,
    sku: 'DRY-001',
    name: 'A2 Gir Cow Ghee 500ml',
    stock: 4,
    reserved: 3
  };
  var item = { id: 1, sku: 'DRY-001', name: 'A2 Gir Cow Ghee 500ml', qty: 1 };
  var db = {
    products: [product],
    orders: [{
      id: 1007,
      status: 'pending',
      paymentMode: 'cash',
      customerId: null,
      total: 0,
      items: [item]
    }],
    customers: []
  };

  inventory.reserve(db.products, [item]);
  assert.equal(product.stock, 3);

  var result = orders.cancel(db, 1007, 'Cancelled from order history');

  assert.equal(result.ok, true);
  assert.equal(result.order.status, 'cancelled');
  assert.equal(product.stock, 4);
  assert.equal(product.reserved, 3);
});
