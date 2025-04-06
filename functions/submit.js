export async function onRequestPost(context) {
  return new Response('POST received!', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' }
  });
}
