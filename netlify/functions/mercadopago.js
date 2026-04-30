exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: "Método no permitido" };
  }

  try {
    const { items, external_reference } = JSON.parse(event.body);
    const token = process.env.MP_ACCESS_TOKEN;

    if (!token) throw new Error("Falta MP_ACCESS_TOKEN");

    const response = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          items,
          external_reference,
          auto_return: "approved",
          back_urls: {
            success: `https://egresantos.site/success.html?token=${external_reference}`,
            failure: `https://egresantos.site/`,
            pending: `https://egresantos.site/`
          },
          notification_url: `https://egresantos.site/.netlify/functions/webhook`
        })
      }
    );

    const data = await response.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ init_point: data.init_point })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Error al crear preferencia",
        details: error.message
      })
    };
  }
};
