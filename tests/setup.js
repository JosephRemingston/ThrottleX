// Ensure proper teardown of database connections
import mongoose from "mongoose";

afterAll(async () => {
  await mongoose.connection.close();
  console.log("Database connection closed.");
});