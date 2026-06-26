import express from "express";
import { connectDB, db } from "./db.js";
import { quoteRequests } from "./schema.js";
import { createQuoteSchema, ALLOWED_STATUSES } from "../utils/validate.js";
import { eq } from "drizzle-orm";
import { requestId } from "../middleware/requestId.js";
import { logger } from "../middleware/logger.js";
const app = express();
const PORT = 8000;
connectDB();

app.use(requestId);
app.use(logger);
app.use(express.json());
app.get("/quotes", async (req, res) => {
  try {
    const quotes = await db.select().from(quoteRequests);

    res.status(200).json(quotes);
  } catch (e) {
    console.log(e);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch quotes",
    });
  }
});
app.get("/quotes/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const quote = await db.query.quoteRequests.findFirst({
      where: (quoteRequests, { eq }) => eq(quoteRequests.id, id),
      with: {
        analysisResult: true,
      },
    });
    res.status(200).json(quote);
  } catch (e) {
    console.log(e);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch information",
    });
  }
});
app.post("/quotes/:id/analyze", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const quote = await db.query.quoteRequests.findFirst({
      where: (quotes, { eq }) => eq(quotes.id, id),
    });
    if (!quote) {
      return res.status(404).json({
        success: false,
        message: "Quote not found",
      });
    }
    const response = await fetch(`${process.env.FASTAPI_URL}/${id}`, {
      method: "POST",
    });
    if (!response.ok)
      return res.status(500).json({ message: "API Not Accessible" });
    const data = await response.json();
    return res.status(200).json({ data: data });
  } catch (e) {
    console.log(e);
    return res.status(500).json({
      success: false,
      message: "Failed to analyze and store information",
    });
  }
});
app.post("/quotes", async (req, res) => {
  try {
    const parsed = createQuoteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        errors: parsed.error.flatten(),
      });
    }
    const { customer, project, status, estimatedValue } = parsed.data;
    const [quote] = await db
      .insert(quoteRequests)
      .values({
        customer,
        project,
        status,
        estimatedValue: estimatedValue?.toString(),
      })
      .returning();

    return res.status(201).json({
      success: true,
      data: quote,
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json({
      success: false,
      message: "Failed to add information",
    });
  }
});
app.patch("/quotes/:id/status", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    const quote = await db.query.quoteRequests.findFirst({
      where: (quotes, { eq }) => eq(quotes.id, id),
    });
    if (!quote) {
      return res.status(404).json({
        success: false,
        message: "Quote not found",
      });
    }
    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${ALLOWED_STATUSES.join(", ")}`,
      });
    }
    const [updatedQuote] = await db
      .update(quoteRequests)
      .set({
        status,
      })
      .where(eq(quoteRequests.id, id))
      .returning();

    return res.status(200).json({
      success: true,
      data: updatedQuote,
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json({
      success: false,
      message: "Failed to update information",
    });
  }
});
app.listen(PORT, async () => {
  console.log(`Server is listening on Port ${PORT}`);
});
