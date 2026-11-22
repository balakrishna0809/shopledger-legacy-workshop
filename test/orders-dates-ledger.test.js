'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var orders = require('../lib/orders');
var ledger = require('../lib/ledger');

function datedOrder(id, date) {
  return { id: id, date: date, status: 'completed', customer: 'Fixture ' + id };
}

test('order history sorts DD/MM/YYYY dates in chronological order', function () {
  var db = {
    orders: [
      datedOrder(1008, '01/02/2022'),
      datedOrder(1007, '31/01/2022')
    ]
  };

  var result = orders.list(db, {});

  assert.deepEqual(result.map(function (o) { return o.id; }), [1008, 1007]);
});

test('order history sorts dates chronologically across the year 1000 boundary', function () {
  var db = {
    orders: [
      datedOrder(1010, '01/01/1000'),
      datedOrder(1009, '31/12/999')
    ]
  };

  var result = orders.list(db, {});

  assert.deepEqual(result.map(function (o) { return o.id; }), [1010, 1009]);
});

test('date filters include only orders within the chronological date bounds', function () {
  var db = {
    orders: [
      datedOrder(1008, '01/02/2022'),
      datedOrder(1007, '31/01/2022')
    ]
  };

  var fromFebruary = orders.list(db, { from: '2022-02-01' });
  var throughJanuary = orders.list(db, { to: '2022-01-31' });

  assert.deepEqual(fromFebruary.map(function (o) { return o.id; }), [1008]);
  assert.deepEqual(throughJanuary.map(function (o) { return o.id; }), [1007]);
});

test('Khata settlements convert string amounts to numbers before updating the balance', function () {
  var customer = {
    id: 1,
    name: 'In-memory customer',
    openingBalance: 0,
    totalBilled: 100,
    totalSettled: 0,
    balance: 100
  };
  var db = { customers: [customer], settlements: [], nextSettlementId: 501 };

  var first = ledger.recordSettlement(db, 1, '25', 'cash', 'First payment');

  assert.equal(first.ok, true);
  assert.equal(customer.totalSettled, 25);
  assert.equal(customer.balance, 75);
  assert.equal(first.settlement.amount, 25);

  var second = ledger.recordSettlement(db, 1, '10', 'cash', 'Second payment');

  assert.equal(second.ok, true);
  assert.equal(customer.totalSettled, 35);
  assert.equal(customer.balance, 65);
  assert.equal(second.settlement.amount, 10);
});
