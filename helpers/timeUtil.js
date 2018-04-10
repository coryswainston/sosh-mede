module.exports.formatTime = formatTime;

function formatTime(timestamp) {
  var date = new Date(Date.parse(timestamp));
  var now = new Date(Date.now());

  if (now.getFullYear() - date.getFullYear() > 0) {
    return getDifference(now.getFullYear(), date.getFullYear(), 'year');
  }
  if (now.getMonth() - date.getMonth() > 0) {
    return getDifference(now.getMonth(), date.getMonth(), 'month');
  }
  if (now.getDay() - date.getDay() > 0) {
    return getDifference(now.getDay(), date.getDay(), 'day');
  }
  if (now.getHours() - date.getHours() > 0) {
    return getDifference(now.getHours(), date.getHours(), 'hour');
  }
  if (now.getMinutes() - date.getMinutes() > 0) {
    return getDifference(now.getMinutes(), date.getMinutes(), 'minute');
  }
  return 'Just now';
}

function getDifference(now, then, unit) {
  var diff = now - then;
  if (diff > 1) {
    unit += 's';
  }
  return diff + ' ' + unit + ' ago';
}
