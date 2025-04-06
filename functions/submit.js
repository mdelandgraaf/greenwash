export async function onRequestPost(context) {
  const request = context.request;
  const data = await request.json();

  // Map zone letter (A–T) to number (1–20)
  const zoneLetter = data['Waar staat je auto?'];
  const zoneMap = Object.fromEntries(
    Array.from({ length: 20 }, (_, i) => [String.fromCharCode(65 + i), i + 1])
  );
  const zone_id = zoneMap[zoneLetter] || 0;

  // Get product names and determine service_id
  const products = data['Kies je behandeling']?.products || [];
  const pakket = products.map(p => p.productName).filter(Boolean).join('\n');
  const service_id = products.length === 2 ? 2 : 1;

  // Prepare payload
  const payload = {
    zone_id,
    service_id,
    park_minutes: data.minutes || '',
    license_plate: data.Kenteken || '',
    color: data.Kleur || '',
    brand: data.Merk || '',
    email: data['Email adres'] || '',
    phone: data.Telefoonnummer || '',
    payment_id: data['Invoice ID'] || '',
    payment_info: `Greenwash - ${data.Pakket || pakket}`
  };

  // Send PUT request to external API
  const apiResponse = await fetch('http://api.green-wash.nl/api/orders', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams(payload)
  });

  const responseText = await apiResponse.text();

  return new Response(JSON.stringify({
    status: apiResponse.status,
    body: responseText
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
