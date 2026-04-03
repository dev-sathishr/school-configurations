const res = require('./response.helper');

async function lookupPincode(req, resp) {
  try {
    const { pincode } = req.params;
    if (!pincode || !/^\d{6}$/.test(pincode)) {
      return res.badRequest(resp, 'Invalid pincode. Must be 6 digits.');
    }

    // Try multiple APIs as fallback
    const apis = [
      `https://api.postalpincode.in/pincode/${pincode}`,
      `https://api.zippopotam.us/in/${pincode}`,
    ];

    let result = null;

    // Try primary API
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(apis[0], { signal: controller.signal });
      clearTimeout(timeout);
      const data = await response.json();

      if (data?.[0]?.Status === 'Success' && data[0].PostOffice?.length) {
        const postOffices = data[0].PostOffice;
        result = {
          pincode,
          city: postOffices[0].District,
          state: postOffices[0].State,
          country: postOffices[0].Country,
          post_offices: postOffices.map((po) => po.Name),
        };
      }
    } catch (e) {
      console.warn('Primary pincode API failed, trying fallback...');
    }

    // Try fallback API
    if (!result) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(apis[1], { signal: controller.signal });
        clearTimeout(timeout);

        if (response.ok) {
          const data = await response.json();
          if (data?.places?.length) {
            result = {
              pincode,
              city: data.places[0]['state abbreviation'] || data.places[0].place,
              state: data.places[0].state,
              country: data['country'],
              post_offices: data.places.map((p) => p['place name']),
            };
          }
        }
      } catch (e) {
        console.warn('Fallback pincode API also failed');
      }
    }

    if (!result) {
      return res.notFound(resp, 'No results found for this pincode. Please enter details manually.');
    }

    return res.success(resp, { data: result });
  } catch (err) {
    console.error('Pincode lookup error:', err);
    return res.error(resp, 'Pincode lookup failed. Please enter details manually.');
  }
}

module.exports = { lookupPincode };
