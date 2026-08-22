const { getUnifiedData } = require("./src/services/unifiedService");

async function test() {
  console.log("Fetching unified data...\n");

  const data = await getUnifiedData();

  console.log("Residents:", data.residents.length);
  console.log("Benefits:", data.benefits.length);

  console.log("\nSource status:");
  console.log(data.sources);

  console.log("\nErrors:");
  console.log(data.errors);
}

test();