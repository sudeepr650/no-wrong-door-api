const { fetchAllResidents } = require("../adapters/restAdapter");
const { fetchBenefitsRecords } = require("../adapters/xmlAdapter");

async function getUnifiedData() {
  const results = await Promise.allSettled([
    fetchAllResidents(),
    fetchBenefitsRecords()
  ]);

  const restResult = results[0];
  const xmlResult = results[1];

  const residents =
    restResult.status === "fulfilled"
      ? restResult.value
      : [];

  const benefits =
    xmlResult.status === "fulfilled"
      ? xmlResult.value
      : [];

  const sources = {
    residentIndex: restResult.status === "fulfilled",
    benefitsRegister: xmlResult.status === "fulfilled"
  };

  const errors = [];

  if (restResult.status === "rejected") {
    errors.push({
      source: "residentIndex",
      message: restResult.reason.message
    });
  }

  if (xmlResult.status === "rejected") {
    errors.push({
      source: "benefitsRegister",
      message: xmlResult.reason.message
    });
  }

  return {
    residents,
    benefits,
    sources,
    errors
  };
}

module.exports = {
  getUnifiedData
};