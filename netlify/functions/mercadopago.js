const axios = require('axios');

exports.handler = async (event) => {
  // Solo permitimos peticiones POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Método no permitido" };
  }

  try {
    const { items, external_reference } = JSON.parse(event.body);
    const token = process.env.MP_ACCESS_TOKEN;

    const response = await axios.post(
      'https://api.mercadopago.com/checkout/preferences',
      {
        items: items,
        external_reference: external_reference,
        auto_return: "approved",
        back_urls: {
          success: `https://egresantos.site/success.html?token=${external_reference}`,
          failure: `https://egresantos.site/`,
          pending: `https://egresantos.site/`
        },
        notification_url: `https://egresantos.site/.netlify/functions/webhook`
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ init_point: response.data.init_point })
    };
  } catch (error) {
    console.error("Error en MP:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error al crear la preferencia de pago" })
    };
  }
};
