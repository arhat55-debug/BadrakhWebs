import { pgTable, serial, text, integer, varchar, pgEnum, jsonb } from "drizzle-orm/pg-core";

export const categoryEnum = pgEnum("category", ["account", "topup", "rent", "midman"]);
export const statusEnum = pgEnum("status", ["available", "sold", "rented"]);

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  gameId: text("game_id").notNull(),
  category: categoryEnum("category").notNull(),
  status: statusEnum("status").notNull().default("available"),
  tags: text("tags").array().default([]),
  basePrice: integer("base_price").notNull(),
  messengerLink: text("messenger_link").notNull(),
  imageUrls: text("image_urls").array().default([]),
  rent1h: integer("rent_1h"),
  rent12h: integer("rent_12h"),
  rent24h: integer("rent_24h"),
  binds: jsonb("binds").default([]),
});
