const axios = require("axios");
const { XMLParser } = require("fast-xml-parser");
const config = require("../config/config");

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchBenefitsRecords() {
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`XML request attempt ${attempt}/${MAX_RETRIES}`);

      const response = await axios.get(
        `${config.xmlServiceUrl}/records`,
        {
          timeout: 5000
        }
      );

      const parser = new XMLParser();
      const parsedData = parser.parse(response.data);

      let records = parsedData.BenefitsRegister.Record;

      if (!Array.isArray(records)) {
        records = [records];
      }

      return records;

    } catch (error) {
      lastError = error;

      console.log(
        `XML request failed on attempt ${attempt}: ${error.message}`
      );

      if (attempt < MAX_RETRIES) {
        console.log(`Retrying in ${RETRY_DELAY / 1000} second...`);
        await wait(RETRY_DELAY);
      }
    }
  }

  throw lastError;
}

module.exports = {
  fetchBenefitsRecords
};