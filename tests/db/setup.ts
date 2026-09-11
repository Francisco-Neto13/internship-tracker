import { afterAll } from "vitest";
import { closeDatabases } from "@/db/client";
import { closeOwnerDatabase } from "./fixtures";

afterAll(async () => {
  await closeDatabases();
  await closeOwnerDatabase();
});
