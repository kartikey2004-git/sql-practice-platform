import dotenv from "dotenv";
import { connectMongo } from "../src/utils/mongo";
import { Assignment } from "../models/assignment.model";
import assignmentsData from "../data/assignments.json";

dotenv.config();

const seedAssignments = async () => {
  try {
    await connectMongo();

    console.log("Seeding assignments...");

    for (const assignmentData of assignmentsData) {
      await Assignment.findOneAndUpdate(
        { title: assignmentData.title },
        assignmentData,
        { upsert: true, returnDocument: "after" },
      );
      console.log(`Seeded: ${assignmentData.title}`);
    }

    console.log("All assignments seeded successfully");
  } catch (error) {
    console.error("Error seeding assignments:", error);
  } finally {
    process.exit(0);
  }
};

seedAssignments();
