export const config = {
  runtime: "edge",
};

// Handle GET requests (e.g. someone visits /submit in browser)
export async function onRequestGet(context) {
  return new Response(`
    <h1>This page expects a POST request from JotForm</h1>
    <p>If you're seeing this, the form was not submitted correctly.</p>
  `, {
    headers: { 'Content-Type': 'text/html' },
    status: 200
  });
}

// Handle POST requests from JotForm (after submission with Redirect with POST)
export async function onRequestPost(context) {
  try {
    const request = context.request;

    // Parse form-urlencoded data
    const formData = await request.formData();
    const data = Object.fromEntries(formData.entries());

    // === Map zone letter (A–T) to zone_id (1–20)
    const zoneLetter = data['Waar staat je auto?'];
    const zoneMap = Object.fromEntries(
      Array.from({ length: 20 }, (_, i) => [String.fromCharCode(65 + i), i + 1])
    );
    const reverseZoneMap = Object.fromEntries(
      Object.entries(zoneMap).map(([letter, id]) => [id, letter])
    );

    const zone_id = zoneMap[zoneLetter] || 0;
    const zone_letter = reverseZoneMap[zone_id] || '';

    // === Parse products (assume JSON string from JotForm)
    let products = [];
    try {
      products = JSON.parse(data['Kies je behandeling'])?.products || [];
    } catch (e) {
      console.warn('Could not parse products:', e);
    }

    const pakket = products.map(p => p.productName).filter(Boolean).join('\n');
    const service_id = products.length === 2 ? 2 : 1;

    // === Build payload for external API
    const payload = {
      zone_id,
      zone_letter,
      service_id,
      park_minutes: data.minutes || '',
      license_plate: data.Kenteken || '',
      color: data.Kleur || '',
      brand: data.Merk || '',
      email: data['Email adres'] || '',
      phone: data.Telefoonnummer || '',
      payment_id: data['Invoice ID'] || '',
      payment_info: `Greenwash - ${data.Pakket || pakket}`,
    };

    // === Send to Greenwash API
    const apiResponse = await fetch('http://api.green-wash.nl/api/orders', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(payload),
    });

    if (apiResponse.ok) {
      // ✅ Redirect to thank-you.html on success
      return Response.redirect('/thank-you.html', 302);
    } else {
      const errorText = await apiResponse.text();
      console.error('Greenwash API error:', errorText);

      return new Response('Something went wrong with the API call.', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

  } catch (err) {
    console.error('Fatal error:', err);
    return new Response('Internal server error.', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}
