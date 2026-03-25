const axios = require('axios');

async function callAiService(payload) {
  const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  const response = await axios.post(`${aiServiceUrl}/analyze`, payload, {
    timeout: 30000,
  });
  return response.data;
}

module.exports = {
  callAiService,
};
