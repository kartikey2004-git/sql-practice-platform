import { ExecutionService } from '../sandbox/execution.service';
import { Assignment } from '../../models/assignment.model';
import { NormalizerService } from './normalizer.service';
import { ComparatorService } from './comparator.service';
import type { ComparisonResult } from './comparator.service';

export interface GradingResult {
  passed: boolean;
  executionTime: number;
  rowCount: number;
  reason?: string;
}

export class GradingService {
  /**
   * Grade a submission by executing the query and comparing with expected output
   */
  static async gradeSubmission(
    identityId: string,
    assignmentId: string,
    query: string
  ): Promise<GradingResult> {
    try {
      // 1. Execute the user's query
      const queryResult = await ExecutionService.executeQuery(
        identityId,
        assignmentId,
        query
      );

      // 2. Fetch the assignment to get expected output
      const assignment = await Assignment.findById(assignmentId);
      if (!assignment) {
        throw new Error('Assignment not found');
      }

      // 3. Normalize both actual and expected results
      const normalizedActual = NormalizerService.normalizeQueryResult(queryResult);
      const normalizedExpected = NormalizerService.normalizeExpectedOutput(
        assignment.expectedOutput
      );

      // 4. Compare the results
      const comparisonResult: ComparisonResult = ComparatorService.compare(
        normalizedActual,
        normalizedExpected,
        assignment.expectedOutput.type
      );

      // 5. Return structured grading result
      return {
        passed: comparisonResult.passed,
        executionTime: queryResult.executionTime,
        rowCount: queryResult.rowCount,
        reason: comparisonResult.reason || undefined
      };

    } catch (error: any) {
      console.error('Grading error:', error);
      
      // Re-throw execution errors to be handled by the controller
      // These are different from grading failures
      throw error;
    }
  }
}
