/**
 * High-accuracy multi-provider reverse geocoding utility for React Native mobile apps
 */
export async function reverseGeocodeMobile(latitude, longitude) {
  let street = '';
  let city = 'Noida';
  let state = 'Uttar Pradesh';
  let pincode = '201301';

  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.locality || data.city) city = data.locality || data.city;
      if (data.principalSubdivision) state = data.principalSubdivision;
      if (data.postcode) pincode = data.postcode;
      if (data.localityInfo?.administrative) {
        const parts = data.localityInfo.administrative.map(a => a.name).filter(Boolean);
        if (parts.length > 0) street = parts.slice(0, 2).join(', ');
      }
    }
  } catch (e) {
    console.warn('BigDataCloud mobile geocode warning:', e.message);
  }

  try {
    const nRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      { headers: { 'User-Agent': 'YenzMobileApp/1.0' } }
    );
    if (nRes.ok) {
      const nData = await nRes.json();
      if (nData?.address) {
        const a = nData.address;
        const sub = a.residential || a.building || a.neighbourhood || a.road || a.suburb || a.amenity || '';
        if (sub) street = sub;
        if (a.city || a.town || a.district) city = a.city || a.town || a.district;
        if (a.state) state = a.state;
        if (a.postcode) pincode = a.postcode;
      }
    }
  } catch (e) {
    console.warn('Nominatim mobile geocode warning:', e.message);
  }

  return {
    street: street || `Location (${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)})`,
    city,
    state,
    pincode,
    latitude: Number(latitude),
    longitude: Number(longitude)
  };
}
