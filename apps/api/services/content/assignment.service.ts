import { Assignment } from "../../models/assignment.model";

export class AssignmentService {
  async getAllAssignments() {
    try {
      const assignments = await Assignment.find()
        .select("_id title description")
        .sort({ createdAt: -1 });

      return assignments;
    } catch (error) {
      throw new Error(`Failed to fetch assignments: ${error}`);
    }
  }

  async getAssignmentById(id: string) {
    try {
      const assignment = await Assignment.findById(id);

      if (!assignment) {
        throw new Error("Assignment not found");
      }

      return assignment;
    } catch (error) {
      throw new Error(`Failed to fetch assignment: ${error}`);
    }
  }
}

export const assignmentService = new AssignmentService();
