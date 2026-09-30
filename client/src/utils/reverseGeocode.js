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

  // 1. Fetch BigDataCloud (Reliable administrative boundaries: city, district, state)
  try {
    const bdcRes = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
    );
    if (bdcRes.ok) {
      const bdcData = await bdcRes.json();
      if (bdcData.locality || bdcData.city) {
        city = bdcData.locality || bdcData.city;
      }
      if (bdcData.principalSubdivision) {
        state = bdcData.principalSubdivision;
      }
      if (bdcData.postcode) {
        pincode = bdcData.postcode;
      }
    }
  } catch (e) {
    console.warn('BigDataCloud reverse geocode warning:', e);
  }

  // 2. Fetch Photon (Best for precise landmark/society/block names, e.g. "Ansal Golf Links 1-Block C")
  try {
    const pRes = await fetch(
      `https://photon.komoot.io/reverse?lon=${longitude}&lat=${latitude}`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) YenzApp/1.0' } }
    );
    if (pRes.ok) {
      const pData = await pRes.json();
      if (pData && pData.features && pData.features.length > 0) {
        const p = pData.features[0].properties;
        const nameParts = [p.name, p.street, p.district, p.locality, p.suburb].filter(Boolean);
        const uniqueParts = nameParts.filter((item, index) => nameParts.indexOf(item) === index);
        if (uniqueParts.length > 0) {
          street = uniqueParts.join(', ');
        }
        if (!city && (p.city || p.town || p.county)) {
          city = p.city || p.town || p.county;
        }
        if (!state && p.state) {
          state = p.state;
        }
        if (!pincode && p.postcode) {
          pincode = p.postcode;
        }
      }
    }
  } catch (e) {
    console.warn('Photon reverse geocode warning:', e);
  }

  // 3. Fetch Nominatim (Detailed address components & display_name)
  try {
    const nRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
    );
    if (nRes.ok) {
      const nData = await nRes.json();
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
          if (!city) {
            city = a.city || a.town || a.district || a.city_district || a.county || a.state_district || '';
          }
          if (!state) {
            state = a.state || '';
          }
          if (!pincode) {
            pincode = a.postcode || '';
          }
        }
      }
    }
  } catch (e) {
    console.warn('Nominatim reverse geocode warning:', e);
  }

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
