export const config = {
  runtime: "edge", // Edge runtime for Cloudflare Pages
};

export async function onRequestPost(context) {
  try {
    const request = context.request;

    // 1. Parse form-urlencoded data from JotForm
    const formData = await request.formData();
    const data = Object.fromEntries(formData.entries());

    // 2. Zone letter → ID mapping (A–T = 1–20)
    const zoneLetter = data['Waar staat je auto?'];
    const zoneMap = Object.fromEntries(
      Array.from({ length: 20 }, (_, i) => [String.fromCharCode(65 + i), i + 1])
    );
    const reverseZoneMap = Object.fromEntries(
      Object.entries(zoneMap).map(([letter, id]) => [id, letter])
    );

    const zone_id = zoneMap[zoneLetter] || 0;
    const zone_letter = reverseZoneMap[zone_id] || '';

    // 3. Handle products (JotForm sends a stringified JSON array)
    let products = [];
    try {
      products = JSON.parse(data['Kies je behandeling'])?.products || [];
    } catch (e) {
      console.warn('Product parse failed:', e);
    }

    const pakket = products.map(p => p.productName).filter(Boolean).join('\n');
    const service_id = products.length === 2 ? 2 : 1;

    // 4. Build payload for external API
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

    // 5. Send PUT request to Greenwash API
    const apiResponse = await fetch('http://api.green-wash.nl/api/orders', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(payload),
    });

    const responseText = await apiResponse.text();

    if (apiResponse.ok) {
      // 6. ✅ Success → Redirect to thank-you.html
      return Response.redirect('/thank-you.html', 302);
    } else {
      // ❌ API call failed
      return new Response(JSON.stringify({
        error: 'API call failed',
        status: apiResponse.status,
        body: responseText
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error("Error in submit handler:", error);
    return new Response(JSON.stringify({
      error: 'Something went wrong.',
      message: error.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
