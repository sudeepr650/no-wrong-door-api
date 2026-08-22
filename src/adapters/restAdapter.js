const axios = require("axios");
const config = require("../config/config");

async function fetchAllResidents() {
  const allResidents = [];
  const seenIds = new Set();

  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await axios.get(
      `${config.restServiceUrl}/residents`,
      {
        params: {
          page: page
        },
        timeout: 5000
      }
    );

    const data = response.data;

    for (const resident of data.results) {
      if (!seenIds.has(resident.id)) {
        seenIds.add(resident.id);
        allResidents.push(resident);
      }
    }

    hasMore = data.has_more;
    page++;
  }

  return allResidents;
}

module.exports = {
  fetchAllResidents
};