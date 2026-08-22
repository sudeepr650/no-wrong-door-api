const { fetchAllResidents } = require("./src/adapters/restAdapter");

async function test() {
  try {
    console.log("Fetching all residents...");

    const residents = await fetchAllResidents();

    console.log("Total unique residents:", residents.length);

    console.log("\nFirst resident:");
    console.log(residents[0]);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

test();