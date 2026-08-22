const { fetchAllResidents } = require("../adapters/restAdapter");
const { fetchBenefitsRecords } = require("../adapters/xmlAdapter");

async function getUnifiedData() {
  const results = await Promise.allSettled([
    fetchAllResidents(),
    fetchBenefitsRecords()
  ]);

  const restResult = results[0];
  const xmlResult = results[1];

  const residentAvailable = restResult.status === "fulfilled";
  const benefitsAvailable = xmlResult.status === "fulfilled";

  const residents = residentAvailable ? restResult.value : [];
  const benefits = benefitsAvailable ? xmlResult.value : [];

  const sourceStatus = {
    residentIndex: {
      available: residentAvailable,
      reason: residentAvailable
        ? null
        : restResult.reason.message
    },

    benefitsRegister: {
      available: benefitsAvailable,
      reason: benefitsAvailable
        ? null
        : xmlResult.reason.message
    }
  };

  const missingSources = [];

  if (!residentAvailable) {
    missingSources.push("residentIndex");
  }

  if (!benefitsAvailable) {
    missingSources.push("benefitsRegister");
  }

  const partial =
  missingSources.length > 0 && missingSources.length < 2;

const unavailable = missingSources.length === 2;

const status = unavailable
  ? "unavailable"
  : partial
  ? "partial"
  : "complete";

return {
  status,

  partial,

  unavailable,
    missingSources,

    sourceStatus,

    data: {
      residents,
      benefits
    }
  };
}

module.exports = {
  getUnifiedData
};