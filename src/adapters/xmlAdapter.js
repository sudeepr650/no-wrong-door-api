const axios = require("axios");
const { XMLParser } = require("fast-xml-parser");
const config = require("../config/config");

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const CACHE_TTL_MS = 5 * 60 * 1000;

let benefitsCache = null;
let benefitsCacheTime = 0;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCachedBenefits() {
  if (
    benefitsCache !== null &&
    Date.now() - benefitsCacheTime < CACHE_TTL_MS
  ) {
    console.log("Benefits cache hit");
    return benefitsCache;
  }

  return null;
}

async function fetchBenefitsRecords() {
  const cachedBenefits = getCachedBenefits();

  if (cachedBenefits !== null) {
    return cachedBenefits;
  }

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

      benefitsCache = records;
      benefitsCacheTime = Date.now();

      console.log("Benefits cache updated");

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
