const { getUnifiedData } = require("./src/services/unifiedService");

async function testIdempotency() {
  console.log("Testing repeated unified requests...\n");

  const results = [];

  for (let i = 1; i <= 3; i++) {
    console.log(`Request ${i}...`);

    const response = await getUnifiedData();

    const residents = response.data.residents;
    const benefits = response.data.benefits;

    const uniqueResidentIds = new Set(
      residents.map((resident) => resident.id)
    );

    const result = {
      request: i,
      status: response.status,
      residents: residents.length,
      uniqueResidents: uniqueResidentIds.size,
      benefits: benefits.length
    };

    results.push(result);

    console.log(result);
    console.log("");
  }

  const first = results[0];

  const allConsistent = results.every(
    (result) =>
      result.status === first.status &&
      result.residents === first.residents &&
      result.uniqueResidents === first.uniqueResidents &&
      result.benefits === first.benefits
  );

  console.log("Final result:");

  if (allConsistent) {
    console.log(
      "PASS: Repeated requests produced consistent results with no duplicate residents."
    );
  } else {
    console.log(
      "WARNING: Results differed between requests. Check source availability or behavior."
    );
  }
}

testIdempotency();