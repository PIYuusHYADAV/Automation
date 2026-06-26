import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { quoteRequests, analysisResults } from "./src/schema.js";
// import { connectDB } from "./src/db.js";
// connectDB();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

async function main() {
  console.log("Seeding database...");

  const quotes = await db
    .insert(quoteRequests)
    .values([
      {
        customer: "Piyush Yadav",
        project: "Office Renovation",
        status: "New",
        estimatedValue: "500000.00",
        createdDate: new Date(),
      },
      {
        customer: "Rahul Sharma",
        project: "Warehouse Construction",
        status: "In Review",
        estimatedValue: "1200000.00",
        createdDate: new Date(),
      },
      {
        customer: "Ananya Singh",
        project: "Residential Complex",
        status: "Needs Info",
        estimatedValue: "3500000.00",
        createdDate: new Date(),
      },
      {
        customer: "Vikram Mehta",
        project: "Bridge Repair",
        status: "Completed",
        estimatedValue: "750000.00",
        createdDate: new Date(),
      },
      {
        customer: "Neha Gupta",
        project: "Hospital Wing Extension",
        status: "New",
        estimatedValue: "9800000.00",
        createdDate: new Date(),
      },
    ])
    .returning();

  console.log(`Inserted ${quotes.length} quotes`);

  await db.insert(analysisResults).values([
    {
      quoteId: quotes[0].id,
      risk: "Medium",
      confidence: 91,
      missingItems: ["Structural drawings", "Load requirements"],
      analyzedAt: new Date(),
    },
    {
      quoteId: quotes[1].id,
      risk: "High",
      confidence: 78,
      missingItems: ["Soil report", "Environmental clearance", "Floor plan"],
      analyzedAt: new Date(),
    },
    {
      quoteId: quotes[2].id,
      risk: "Low",
      confidence: 95,
      missingItems: [],
      analyzedAt: new Date(),
    },
  ]);

  console.log("Analysis results inserted");
  console.log("Seeding complete.");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  pool.end();
  process.exit(1);
});
