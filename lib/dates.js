// Date utilities for ShopLedger (Indian DD/MM/YYYY format)

function pad2(n) {
  return ('0' + n).slice(-2);
}

exports.today = function () {
  var d = new Date();
  return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear();
};

// Added for date-picker filtering (Vikram, Oct 2021)
// Accepts either DD/MM/YYYY or YYYY-MM-DD and normalizes for string comparison
exports.normalizeDateKey = function (str) {
  if (!str) return '';
  var s = String(str).trim();
  if (s.indexOf('-') !== -1) {
    // HTML5 input[type="date"] sends YYYY-MM-DD; convert to DD/MM/YYYY to match db.json
    var p = s.split('-');
    if (p.length === 3) {
      return p[2] + '/' + p[1] + '/' + p[0];
    }
  }
  return s;
};

// Converts supported dates to a lexicographically sortable YYYY-MM-DD key
exports.toSortableKey = function (str) {
  var normalized = exports.normalizeDateKey(str);
  var parts = normalized.split('/');
  if (parts.length !== 3) return normalized;

  var day = parseInt(parts[0], 10);
  var month = parseInt(parts[1], 10);
  var year = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return normalized;

  var yearKey = String(year);
  while (yearKey.length < 4) yearKey = '0' + yearKey;

  return yearKey + '-' + pad2(month) + '-' + pad2(day);
};

exports.getFiscalYear = function (dateStr) {
  var s = exports.normalizeDateKey(dateStr);
  var parts = s.split('/');
  if (parts.length !== 3) return 'FY21-22';
  var month = parseInt(parts[1], 10);
  var year = parseInt(parts[2], 10);
  if (month >= 4) {
    return 'FY' + String(year).slice(-2) + '-' + String(year + 1).slice(-2);
  }
  return 'FY' + String(year - 1).slice(-2) + '-' + String(year).slice(-2);
};
