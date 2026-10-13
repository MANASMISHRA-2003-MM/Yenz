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

/**
 * Normalizes user-input units to match the Prisma ProductUnit enum:
 * GRAM, KG, ML, LITRE, PIECE, PACK, PORTION
 */
function normalizeProductUnit(unit) {
  if (!unit) return 'KG';
  const u = String(unit).trim().toUpperCase();
  const mapping = {
    GM: 'GRAM',
    G: 'GRAM',
    GRAM: 'GRAM',
    GRAMS: 'GRAM',
    KG: 'KG',
    KGS: 'KG',
    KILOGRAM: 'KG',
    ML: 'ML',
    MILLILITRE: 'ML',
    L: 'LITRE',
    LTR: 'LITRE',
    LITRE: 'LITRE',
    LITER: 'LITRE',
    PC: 'PIECE',
    PCS: 'PIECE',
    PIECE: 'PIECE',
    PIECES: 'PIECE',
    PACK: 'PACK',
    PACKET: 'PACK',
    PACKETS: 'PACK',
    PORTION: 'PORTION'
  };
  return mapping[u] || 'KG';
}

module.exports = { formatWithId, normalizeProductUnit };
