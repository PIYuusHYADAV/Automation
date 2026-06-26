import { relations } from "drizzle-orm";
import {
  pgTable,
  serial,
  varchar,
  numeric,
  timestamp,
  integer,
  text,
} from "drizzle-orm/pg-core";
export const quoteRequests = pgTable("quote_request", {
  id: serial("id").primaryKey(),
  customer: varchar("customer", {
    length: 255,
  }).notNull(),
  project: varchar("project", {
    length: 255,
  }).notNull(),
  status: varchar("status", {
    length: 58,
  }),
  estimatedValue: numeric("estimated_value", {
    precision: 12,
    scale: 2,
  }),
  createdDate: timestamp("created_date").defaultNow().notNull(),
});

export const analysisResults = pgTable("analysis_results", {
  id: serial("id").primaryKey(),

  quoteId: integer("quote_id")
    .notNull()
    .references(() => quoteRequests.id, {
      onDelete: "cascade",
    }),

  risk: varchar("risk", { length: 50 }).notNull(),

  confidence: integer("confidence").notNull(),

  missingItems: text("missing_items").array(),

  analyzedAt: timestamp("analyzed_at").defaultNow().notNull(),
});
export const quoteRequestRelations = relations(quoteRequests, ({ one }) => ({
  analysisResult: one(analysisResults, {
    fields: [quoteRequests.id],
    references: [analysisResults.quoteId],
  }),
}));

export const analysisResultRelations = relations(
  analysisResults,
  ({ one }) => ({
    quote: one(quoteRequests, {
      fields: [analysisResults.quoteId],
      references: [quoteRequests.id],
    }),
  }),
);
