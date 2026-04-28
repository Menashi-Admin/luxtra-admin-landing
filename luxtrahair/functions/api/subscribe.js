export async function onRequestPost(context) {
  const { request, env } = context;

  // ── CORS preflight ──
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // ── Validate request ──
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const { email, first_name } = body;

  if (!email) {
    return new Response(JSON.stringify({ error: 'Email is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // ── Flodesk API call ──
  const FLODESK_API_KEY = env.FLODESK_API_KEY;
  if (!FLODESK_API_KEY) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const SEGMENT_ID = '69efe4d768ce9350313ffefb';

  const subscriberPayload = {
    email: email,
    first_name: first_name || '',
    segment_ids: [SEGMENT_ID],
    double_optin: false,
  };


  try {
    const flodeskResponse = await fetch('https://api.flodesk.com/v1/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(FLODESK_API_KEY + ':'),
        'User-Agent': 'Luxtra Hair (luxtrahair.com)',
      },
      body: JSON.stringify(subscriberPayload),
    });

    const responseText = await flodeskResponse.text();

    if (!flodeskResponse.ok) {
      return new Response(JSON.stringify({ error: 'Subscription service error' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const data = JSON.parse(responseText);
    return new Response(JSON.stringify({ success: true, subscriber_id: data.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (err) {
    console.error('Flodesk proxy error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
