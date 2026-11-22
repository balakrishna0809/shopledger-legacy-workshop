'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var pricing = require('../lib/pricing');
var invoice = require('../lib/invoice');
var reports = require('../lib/reports');

function line(overrides) {
  return Object.assign({
    id: 1,
    sku: 'RICE-001',
    name: 'Rice',
    hsn: '1006',
    price: 600,
    qty: 1
  }, overrides || {});
}

function order(overrides) {
  return Object.assign({
    id: 1001,
    date: '01/01/2022',
    customer: 'In-memory customer',
    paymentMode: 'cash',
    status: 'completed',
    items: [line()],
    coupon: '',
    subtotal: 600,
    discount: 0,
    tax: 30,
    total: 630
  }, overrides || {});
}

test('CURRENT BEHAVIOUR pricing applies the HSN slab to post-coupon taxable value', function () {
  var totals = pricing.computeTotals([line()], 'SAVE10');

  assert.deepEqual({
    subtotal: totals.subtotal,
    discount: totals.discount,
    taxable: totals.taxable,
    tax: totals.tax,
    cgst: totals.cgst,
    sgst: totals.sgst,
    total: totals.total
  }, {
    subtotal: 600,
    discount: 60,
    taxable: 540,
    tax: 27,
    cgst: 13.5,
    sgst: 13.5,
    total: 567
  });
});

test('invoice uses the HSN slab and post-discount taxable amount', function () {
  var figures = invoice.computeInvoiceFigures(order({
    items: [line()],
    coupon: 'SAVE10',
    subtotal: 600,
    discount: 60,
    tax: 27,
    total: 567
  }));

  assert.deepEqual({
    subtotal: figures.subtotal,
    discount: figures.discount,
    tax: figures.tax,
    total: figures.total,
    rowGstPercent: figures.rows[0].gstPercent,
    rowLine: figures.rows[0].line
  }, {
    subtotal: 600,
    discount: 60,
    tax: 27,
    total: 567,
    rowGstPercent: 5,
    rowLine: 600
  });
});

test('invoice applies the coupon cap to subtotal and matches billed GST and total', function () {
  var items = [line({ price: 3000 })];
  var billed = pricing.computeTotals(items, 'SAVE10');
  var invoiced = invoice.computeInvoiceFigures(order({
    items: items,
    coupon: 'SAVE10',
    subtotal: billed.subtotal,
    discount: billed.discount,
    tax: billed.tax,
    total: billed.total
  }));

  assert.equal(billed.discount, 150);
  assert.equal(invoiced.discount, 150);
  assert.equal(invoiced.tax, 142.5);
  assert.equal(invoiced.total, 2992.5);
});

test('invoice honors the flat coupon minimum order', function () {
  var items = [line({ price: 100 })];
  var billed = pricing.computeTotals(items, 'FLAT50');
  var invoiced = invoice.computeInvoiceFigures(order({
    items: items,
    coupon: 'FLAT50',
    subtotal: billed.subtotal,
    discount: billed.discount,
    tax: billed.tax,
    total: billed.total
  }));

  assert.equal(billed.discount, 0);
  assert.equal(invoiced.discount, 0);
});

test('invoice interprets decimal gstRate consistently with order pricing', function () {
  var item = line({ price: 100, gstRate: 0.05 });
  var billed = pricing.computeTotals([item], '');
  var invoiced = invoice.computeInvoiceFigures(order({
    items: [item],
    subtotal: billed.subtotal,
    tax: billed.tax,
    total: billed.total
  }));

  assert.equal(billed.tax, 5);
  assert.equal(invoiced.tax, 5);
  assert.equal(invoiced.rows[0].gstPercent, 5);
});

test('GST reconciliation reports matching invoice and billed totals in memory', function () {
  var items = [line()];
  var billed = pricing.computeTotals(items, 'SAVE10');
  var recordedOrder = order({
    items: items,
    coupon: 'SAVE10',
    subtotal: billed.subtotal,
    discount: billed.discount,
    tax: billed.tax,
    total: billed.total
  });

  var reconciliation = reports.getGstReconciliation({ orders: [recordedOrder] });

  assert.equal(reconciliation.totalChecked, 1);
  assert.equal(reconciliation.mismatchCount, 0);
  assert.equal(reconciliation.rows[0].invoiceTax, 27);
  assert.equal(reconciliation.rows[0].ledgerTax, 27);
  assert.equal(reconciliation.rows[0].invoiceTotal, 567);
  assert.equal(reconciliation.rows[0].ledgerTotal, 567);
  assert.equal(reconciliation.rows[0].matched, true);
});

test('invoice uses the same GST breakdown and total as the billed order', function () {
  var items = [line({ price: 640 })];
  var billed = pricing.computeTotals(items, 'SAVE10');
  var figures = invoice.computeInvoiceFigures(order({
    items: items,
    coupon: 'SAVE10',
    subtotal: billed.subtotal,
    discount: billed.discount,
    tax: billed.tax,
    total: billed.total
  }));

  assert.deepEqual({
    subtotal: figures.subtotal,
    discount: figures.discount,
    tax: figures.tax,
    cgst: figures.cgst,
    sgst: figures.sgst,
    total: figures.total,
    rowGstPercent: figures.rows[0].gstPercent,
    rowTax: figures.rows[0].lineTax
  }, {
    subtotal: billed.subtotal,
    discount: billed.discount,
    tax: billed.tax,
    cgst: billed.cgst,
    sgst: billed.sgst,
    total: billed.total,
    rowGstPercent: billed.lines[0].gstPercent,
    rowTax: billed.lines[0].tax
  });
});
