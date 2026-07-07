exports.handler = async function(event, context) {
  // Webhook endpoints often expect a 200/204 and plain text. Return simple JSON for testing.
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({ ok: true, stub: 'webhook-mp', received: true })
  };
};
