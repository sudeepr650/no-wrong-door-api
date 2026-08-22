const { getUnifiedData } = require("./src/services/unifiedService");

async function test() {
  console.log("Fetching unified data...\n");

  const response = await getUnifiedData();

  console.log("Status:", response.status);
  console.log("Partial:", response.partial);

  console.log("\nResidents:", response.data.residents.length);
  console.log("Benefits:", response.data.benefits.length);

  console.log("\nMissing sources:");
  console.log(response.missingSources);

  console.log("\nSource status:");
  console.log(response.sourceStatus);
}

test();