import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const categories = sqliteTable("Category", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: text("createdAt").notNull(),
});

export const books = sqliteTable("Book", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  author: text("author").notNull().default(""),
  categoryId: text("categoryId"),
  description: text("description").notNull().default(""),
  content: text("content").notNull(),
  coverColor: text("coverColor").notNull().default("#6366f1"),
  createdAt: text("createdAt").notNull(),
  updatedAt: text("updatedAt").notNull(),
});

export const appSettings = sqliteTable("AppSetting", {
  id: text("id").notNull().default("singleton"),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export const announcements = sqliteTable("Announcement", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  type: text("type").notNull().default("general"),
  active: integer("active").notNull().default(1),
  createdAt: text("createdAt").notNull(),
  updatedAt: text("updatedAt").notNull(),
});

export const bookmarks = sqliteTable("Bookmark", {
  id: text("id").primaryKey(),
  bookId: text("bookId").notNull(),
  scrollY: real("scrollY").notNull().default(0),
  createdAt: text("createdAt").notNull(),
  updatedAt: text("updatedAt").notNull(),
});

// Relations
export const categoriesRelations = relations(categories, ({ many }) => ({
  books: many(books),
}));

export const booksRelations = relations(books, ({ one }) => ({
  category: one(categories, {
    fields: [books.categoryId],
    references: [categories.id],
    onDelete: "set null",
  }),
}));
