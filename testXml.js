const { fetchBenefitsRecords } = require("./src/adapters/xmlAdapter");

async function test() {
  try {
    console.log("Fetching benefits records...");

    const records = await fetchBenefitsRecords();

    console.log("Total records:", records.length);

    console.log("\nFirst record:");
    console.log(records[0]);
  } catch (error) {
    console.error("XML request failed:", error.message);
  }
}

test();