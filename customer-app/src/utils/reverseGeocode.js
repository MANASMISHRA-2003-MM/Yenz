/**
 * High-accuracy multi-provider reverse geocoding utility.
 * Fetches location details dynamically using BigDataCloud, Photon, and Nominatim
 * to ensure precise street, landmark, society, city, state, and pincode anywhere in the world.
 */
export async function reverseGeocode(latitude, longitude) {
  let street = '';
  let city = '';
  let state = '';
  let pincode = '';
  let rawDisplayName = '';

  const fetchWithTimeout = async (url, opts = {}, timeoutMs = 3500) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...opts, signal: controller.signal });
      return res;
    } catch (e) {
      return null;
    } finally {
      clearTimeout(id);
    }
  };

  // Run BigDataCloud, Photon and Nominatim concurrently in parallel
  const [bdcRes, pRes, nRes] = await Promise.allSettled([
    fetchWithTimeout(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`),
    fetchWithTimeout(`https://photon.komoot.io/reverse?lon=${longitude}&lat=${latitude}`, { headers: { 'User-Agent': 'Mozilla/5.0 YenzApp/1.0' } }),
    fetchWithTimeout(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`)
  ]);

  // 1. Process BigDataCloud
  try {
    if (bdcRes.status === 'fulfilled' && bdcRes.value && bdcRes.value.ok) {
      const bdcData = await bdcRes.value.json();
      if (bdcData.locality || bdcData.city) city = bdcData.locality || bdcData.city;
      if (bdcData.principalSubdivision) state = bdcData.principalSubdivision;
      if (bdcData.postcode) pincode = bdcData.postcode;
    }
  } catch (e) {}

  // 2. Process Photon
  try {
    if (pRes.status === 'fulfilled' && pRes.value && pRes.value.ok) {
      const pData = await pRes.value.json();
      if (pData?.features?.length > 0) {
        const p = pData.features[0].properties;
        const nameParts = [p.name, p.street, p.district, p.locality, p.suburb].filter(Boolean);
        const uniqueParts = nameParts.filter((item, index) => nameParts.indexOf(item) === index);
        if (uniqueParts.length > 0) street = uniqueParts.join(', ');
        if (!city && (p.city || p.town || p.county)) city = p.city || p.town || p.county;
        if (!state && p.state) state = p.state;
        if (!pincode && p.postcode) pincode = p.postcode;
      }
    }
  } catch (e) {}

  // 3. Process Nominatim
  try {
    if (nRes.status === 'fulfilled' && nRes.value && nRes.value.ok) {
      const nData = await nRes.value.json();
      if (nData) {
        rawDisplayName = nData.display_name || '';
        if (nData.address) {
          const a = nData.address;
          const sub = a.residential || a.building || a.neighbourhood || a.road || a.suburb || a.village || a.hamlet || '';
          const house = a.house_number || '';
          const nomStreet = [house, sub, a.amenity].filter(Boolean).join(', ');
          if (!street || street.length < 4) {
            street = nomStreet || rawDisplayName.split(',')[0] || '';
          }
          if (!city) city = a.city || a.town || a.district || a.city_district || a.county || a.state_district || '';
          if (!state) state = a.state || '';
          if (!pincode) pincode = a.postcode || '';
        }
      }
    }
  } catch (e) {}

  // Pure dynamic resolution without hardcoding any city or state
  if (!street) {
    street = rawDisplayName ? rawDisplayName.split(',').slice(0, 2).join(', ') : `GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
  }
  if (!city && rawDisplayName) {
    const parts = rawDisplayName.split(',').map(s => s.trim());
    city = parts.length > 2 ? parts[parts.length - 3] || parts[1] || '' : '';
  }
  if (!state && rawDisplayName) {
    const parts = rawDisplayName.split(',').map(s => s.trim());
    state = parts.length > 1 ? parts[parts.length - 2] || '' : '';
  }

  const fullAddress = [street, city, state, pincode].filter(Boolean).join(', ');

  return {
    street,
    city,
    state,
    pincode,
    fullAddress,
    latitude,
    longitude,
    lat: latitude,
    lng: longitude
  };
}
