/**
 * Formats Prisma objects to include `_id: item.id` for backwards compatibility with MongoDB frontend references.
 */
function formatWithId(obj) {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) {
    return obj.map(formatWithId);
  }
  if (typeof obj === 'object') {
    const formatted = { ...obj };
    if (formatted.id && !formatted._id) {
      formatted._id = formatted.id;
    }
    for (const key of Object.keys(formatted)) {
      if (formatted[key] !== null && typeof formatted[key] === 'object' && !(formatted[key] instanceof Date)) {
        formatted[key] = formatWithId(formatted[key]);
      }
    }
    return formatted;
  }
  return obj;
}

module.exports = { formatWithId };
