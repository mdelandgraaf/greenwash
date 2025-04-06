export const config = {
  runtime: "edge", // Run at the edge
};

export async function onRequestPost(context) {
  try {
    const request = context.request;
    const data = await request.json();

    // === Zone Mappings
    const zoneLetter = data['Waar staat je auto?'];
    const zoneMap = Object.fromEntries(
      Array.from({ length: 20 }, (_, i) => [String.fromCharCode(65 + i), i + 1])
    );
    const reverseZoneMap = Object.fromEntries(
      Object.entries(zoneMap).map(([letter, id]) => [id, letter])
    );

    const zone_id = zoneMap[zoneLetter] || 0;
    const zone_letter = reverseZoneMap[zone_id] || '';

    // === Handle products and service_id
    const products = data['Kies je behandeling']?.products || [];
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

    // === External API Request
    const response = await fetch('http://api.green-wash.nl/api/orders', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(payload),
    });

    const responseText = await response.text();

    return new Response(JSON.stringify({
      status: response.status,
      zone_letter,
      zone_id,
      apiResponse: responseText,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in /submit:", error);
    return new Response(JSON.stringify({
      error: 'An error occurred.',
      message: error.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
