const axios = require('axios');

exports.handler = async (event) => {
  // Manejo de CORS (para que tu web pueda llamar a la función sin bloqueos)
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Si es una petición OPTIONS (pre-check del navegador), respondemos OK
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: "Método no permitido" };
  }

  try {
    const { items, external_reference } = JSON.parse(event.body);
    
    // Usamos la variable de entorno que configuraste en Netlify
    const token = process.env.MP_ACCESS_TOKEN;

    if (!token) {
      throw new Error("Falta el MP_ACCESS_TOKEN en las variables de Netlify");
    }

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
        // Importante: Mercado Pago requiere HTTPS para las notificaciones
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
      headers,
      body: JSON.stringify({ init_point: response.data.init_point })
    };
  } catch (error) {
    console.error("Error en MP:", error.response ? error.response.data : error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: "Error al crear la preferencia",
        details: error.response ? error.response.data : error.message 
      })
    };
  }
};
