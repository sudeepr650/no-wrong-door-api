const axios = require("axios");
const { XMLParser } = require("fast-xml-parser");
const config = require("../config/config");

async function fetchBenefitsRecords() {
  const response = await axios.get(
    `${config.xmlServiceUrl}/records`,
    {
      timeout: 5000
    }
  );

  const parser = new XMLParser();

  const parsedData = parser.parse(response.data);

  let records = parsedData.Records.Record;

  // If there is only one record, make sure we still return an array
  if (!Array.isArray(records)) {
    records = [records];
  }

  return records;
}

module.exports = {
  fetchBenefitsRecords
};