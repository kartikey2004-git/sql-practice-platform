"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { fetchAssignmentById } from "@/services/assignment.service";
import {
  initSandbox,
  executeQuery,
  gradeSubmission,
  QueryResult,
  GradingResult,
} from "@/services/sandbox.service";
import { getHint, getHintHistory } from "@/services/hint.service";
import { getProgress, updateProgress } from "@/services/progress.service";
import Link from "next/link";
import "./assignment-detail.scss";

// Dynamic import to avoid SSR issues with Monaco Editor
const SQLEditor = dynamic(() => import("@/components/editor/SQLEditor"), {
  ssr: false,
  loading: () => (
    <div className="editor-loading">
      <div className="loading-spinner"></div>
      <span>Loading editor...</span>
    </div>
  ),
});

interface AssignmentPageProps {
  params: Promise<{ id: string }>;
}

export default function AssignmentPage({ params }: AssignmentPageProps) {
  const [assignment, setAssignment] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sandboxLoading, setSandboxLoading] = useState(true);
  const [sandboxReady, setSandboxReady] = useState(false);
  const [sandboxInfo, setSandboxInfo] = useState<{
    schemaName: string;
    isNew: boolean;
  } | null>(null);

  // SQL Editor states
  const [sqlQuery, setSqlQuery] = useState("");
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [executingQuery, setExecutingQuery] = useState(false);

  // Grading states
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(
    null,
  );
  const [gradingError, setGradingError] = useState<string | null>(null);
  const [grading, setGrading] = useState(false);

  // Hint states
  const [hint, setHint] = useState<string | null>(null);
  const [hintError, setHintError] = useState<string | null>(null);
  const [gettingHint, setGettingHint] = useState(false);
  const [hintType, setHintType] = useState<"syntax" | "logic" | "approach">(
    "approach",
  );

  // Progress states
  const [progress, setProgress] = useState<any>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

  useEffect(() => {
    const loadAssignment = async () => {
      try {
        const resolvedParams = await params;
        const assignmentData = await fetchAssignmentById(resolvedParams.id);
        setAssignment(assignmentData);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load assignment",
        );
      } finally {
        setLoading(false);
      }
    };

    loadAssignment();
  }, [params]);

  // Load progress when assignment is ready
  useEffect(() => {
    const loadProgress = async () => {
      if (!assignment) return;

      try {
        const progressData = await getProgress(assignment._id);
        setProgress(progressData);

        // Restore last query if available
        if (progressData.lastQuery) {
          setSqlQuery(progressData.lastQuery);
        }
      } catch (err) {
        console.error("Failed to load progress:", err);
      }
    };

    if (assignment) {
      loadProgress();
    }
  }, [assignment]);

  // Auto-save functionality
  useEffect(() => {
    if (!autoSaveEnabled || !assignment || !sqlQuery.trim()) return;

    const saveTimeout = setTimeout(async () => {
      try {
        await updateProgress(assignment._id, {
          lastQuery: sqlQuery,
        });
      } catch (err) {
        console.error("Auto-save failed:", err);
      }
    }, 2000); // Save after 2 seconds of inactivity

    return () => clearTimeout(saveTimeout);
  }, [sqlQuery, autoSaveEnabled, assignment]);

  useEffect(() => {
    const initializeSandbox = async () => {
      if (!assignment) return;

      try {
        setSandboxLoading(true);
        const result = await initSandbox(assignment._id);
        setSandboxInfo(result);
        setSandboxReady(true);
      } catch (err) {
        console.error("Sandbox initialization failed:", err);
        setError(
          err instanceof Error ? err.message : "Failed to initialize workspace",
        );
      } finally {
        setSandboxLoading(false);
      }
    };

    if (assignment) {
      initializeSandbox();
    }
  }, [assignment]);

  const handleExecuteQuery = async () => {
    if (!sqlQuery.trim()) {
      setQueryError("Query cannot be empty");
      return;
    }

    if (!assignment) {
      setQueryError("Assignment not loaded");
      return;
    }

    try {
      setExecutingQuery(true);
      setQueryError(null);
      setQueryResult(null);
      setGradingResult(null);
      setGradingError(null);

      const result = await executeQuery(assignment._id, sqlQuery);
      setQueryResult(result);

      // Update progress with attempt
      if (assignment) {
        try {
          await updateProgress(assignment._id, {
            lastQuery: sqlQuery,
            incrementAttempt: true,
          });
        } catch (err) {
          console.error("Failed to update progress:", err);
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to execute query";
      setQueryError(errorMessage);
    } finally {
      setExecutingQuery(false);
    }
  };

  const handleGradeSubmission = async () => {
    if (!sqlQuery.trim()) {
      setGradingError("Query cannot be empty");
      return;
    }

    if (!assignment) {
      setGradingError("Assignment not loaded");
      return;
    }

    try {
      setGrading(true);
      setGradingError(null);
      setGradingResult(null);
      setQueryResult(null);
      setQueryError(null);

      const result = await gradeSubmission(assignment._id, sqlQuery);
      setGradingResult(result);

      // Update progress with completion status
      if (assignment && result.passed) {
        try {
          await updateProgress(assignment._id, {
            lastQuery: sqlQuery,
            incrementAttempt: true,
            markCompleted: true,
          });
        } catch (err) {
          console.error("Failed to update progress:", err);
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to grade submission";
      setGradingError(errorMessage);
    } finally {
      setGrading(false);
    }
  };

  const handleGetHint = async () => {
    if (!sqlQuery.trim()) {
      setHintError("Please write a query before getting a hint");
      return;
    }

    if (!assignment) {
      setHintError("Assignment not loaded");
      return;
    }

    try {
      setGettingHint(true);
      setHintError(null);
      setHint(null);

      const hintResponse = await getHint(assignment._id, sqlQuery, hintType);
      setHint(hintResponse.hint);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to get hint";
      setHintError(errorMessage);
    } finally {
      setGettingHint(false);
    }
  };

  if (loading) {
    return (
      <div className="assignment-detail-page">
        <div className="container">
          <div className="loading">Loading assignment...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="assignment-detail-page">
        <div className="container">
          <Link href="/assignments" className="back-link">
            ← Back to assignments
          </Link>
          <div className="error-message">{error}</div>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="assignment-detail-page">
        <div className="container">
          <Link href="/assignments" className="back-link">
            ← Back to assignments
          </Link>
          <p>Assignment not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="assignment-detail-page">
      <div className="workspace">
        {/* Header - Back + Title + Status */}
        <div className="header">
          <div className="header-left">
            <Link href="/assignments" className="back-link">
              ← Back to assignments
            </Link>
            <div className="page-title">
              <h1>{assignment.title}</h1>
            </div>
          </div>
          <div className="header-right">
            <div className="sandbox-status">
              {sandboxLoading ? (
                <div className="loading-indicator">
                  <div className="spinner"></div>
                  <span>Initializing...</span>
                </div>
              ) : sandboxReady ? (
                <div className="ready-indicator">
                  <div className="status-icon ready">✓</div>
                  <span>Ready • {sandboxInfo?.schemaName}</span>
                  {sandboxInfo?.isNew && <span className="new-badge">New</span>}
                </div>
              ) : (
                <div className="error-indicator">
                  <div className="status-icon error">✗</div>
                  <span>Failed to initialize</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="content-grid">
          {/* Left Panel - Problem + Schema */}
          <div className="left-panel">
            {/* Problem Section */}
            <div className="problem">
              <h2>Problem</h2>
              <div className="problem-content">
                <p>{assignment.question}</p>
              </div>
            </div>

            {/* Schema Section */}
            <div className="schema">
              <h2>Database Schema</h2>
              <div className="schema-content">
                {assignment.sampleTables &&
                assignment.sampleTables.length > 0 ? (
                  <div className="tables-grid">
                    {assignment.sampleTables.map(
                      (table: any, index: number) => (
                        <div key={index} className="table-schema">
                          <h3>{table.tableName}</h3>
                          <div className="columns-list">
                            <h4>Columns</h4>
                            <ul>
                              {table.columns.map(
                                (column: any, colIndex: number) => (
                                  <li key={colIndex} className="column-item">
                                    <span className="column-name">
                                      {column.columnName}
                                    </span>
                                    <span className="column-type">
                                      {column.dataType}
                                    </span>
                                  </li>
                                ),
                              )}
                            </ul>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <p>No schema available for this assignment.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - SQL Editor + Results */}
          <div className="right-panel">
            {/* SQL Editor Section */}
            <div className="editor">
              <h2>SQL Editor</h2>
              <div className="editor-content">
                <div className="sql-editor">
                  <SQLEditor
                    value={sqlQuery}
                    onChange={setSqlQuery}
                    disabled={!sandboxReady || executingQuery}
                    placeholder="Write your SQL query here..."
                  />
                </div>
                <div className="editor-actions">
                  <div className="hint-controls">
                    <select
                      value={hintType}
                      onChange={(e) => setHintType(e.target.value as any)}
                      className="hint-type-select"
                      disabled={!sandboxReady || gettingHint}
                    >
                      <option value="approach">Approach</option>
                      <option value="logic">Logic</option>
                      <option value="syntax">Syntax</option>
                    </select>
                    <button
                      onClick={handleGetHint}
                      disabled={
                        !sandboxReady ||
                        gettingHint ||
                        executingQuery ||
                        grading ||
                        !sqlQuery.trim()
                      }
                      className="hint-button"
                    >
                      {gettingHint ? (
                        <>
                          <div className="button-spinner"></div>
                          Getting Hint...
                        </>
                      ) : (
                        "💡 Get Hint"
                      )}
                    </button>
                  </div>
                  <div className="action-buttons">
                    <button
                      onClick={handleExecuteQuery}
                      disabled={
                        !sandboxReady ||
                        executingQuery ||
                        grading ||
                        !sqlQuery.trim()
                      }
                      className="run-button"
                    >
                      {executingQuery ? (
                        <>
                          <div className="button-spinner"></div>
                          Executing...
                        </>
                      ) : (
                        "Run Query"
                      )}
                    </button>
                    <button
                      onClick={handleGradeSubmission}
                      disabled={
                        !sandboxReady ||
                        grading ||
                        executingQuery ||
                        !sqlQuery.trim()
                      }
                      className="submit-button"
                    >
                      {grading ? (
                        <>
                          <div className="button-spinner"></div>
                          Submitting...
                        </>
                      ) : (
                        "Run & Submit"
                      )}
                    </button>
                  </div>
                  <div className="auto-save-toggle">
                    <label>
                      <input
                        type="checkbox"
                        checked={autoSaveEnabled}
                        onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                      />
                      Auto-save query
                    </label>
                    {progress && (
                      <span className="attempt-counter">
                        Attempts: {progress.attemptCount}
                        {progress.isCompleted && " ✅"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Results Section */}
            {(queryResult ||
              queryError ||
              gradingResult ||
              gradingError ||
              hint ||
              hintError) && (
              <div className="results">
                <h2>Results</h2>
                <div className="results-content">
                  {hint ? (
                    <div className="hint-panel">
                      <div className="hint-header">
                        💡 Hint ({hintType})
                        <button
                          className="close-hint"
                          onClick={() => setHint(null)}
                        >
                          ×
                        </button>
                      </div>
                      <div className="hint-message">{hint}</div>
                    </div>
                  ) : hintError ? (
                    <div className="error-panel">
                      <div className="error-header">Hint Error</div>
                      <div className="error-message">{hintError}</div>
                    </div>
                  ) : gradingError ? (
                    <div className="error-panel">
                      <div className="error-header">Grading Error</div>
                      <div className="error-message">{gradingError}</div>
                    </div>
                  ) : gradingResult ? (
                    <div
                      className={`result-panel ${gradingResult.passed ? "success" : "failure"}`}
                    >
                      <div className="result-stats">
                        <span
                          className={`status-indicator ${gradingResult.passed ? "passed" : "failed"}`}
                        >
                          {gradingResult.passed ? "✅ Passed" : "❌ Failed"}
                        </span>
                        <span className="row-count">
                          {gradingResult.rowCount} row
                          {gradingResult.rowCount !== 1 ? "s" : ""}
                        </span>
                        <span className="execution-time">
                          {gradingResult.executionTime}ms
                        </span>
                      </div>
                      {gradingResult.reason && (
                        <div className="failure-reason">
                          <strong>Reason:</strong> {gradingResult.reason}
                        </div>
                      )}
                    </div>
                  ) : queryError ? (
                    <div className="error-panel">
                      <div className="error-header">Error</div>
                      <div className="error-message">{queryError}</div>
                    </div>
                  ) : queryResult ? (
                    <div className="result-panel">
                      <div className="result-stats">
                        <span className="row-count">
                          {queryResult.rowCount} row
                          {queryResult.rowCount !== 1 ? "s" : ""}
                        </span>
                        <span className="execution-time">
                          {queryResult.executionTime}ms
                        </span>
                      </div>
                      <div className="result-table">
                        <table>
                          <thead>
                            <tr>
                              {queryResult.columns.map((column, index) => (
                                <th key={index}>{column}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {queryResult.rows.map((row, rowIndex) => (
                              <tr key={rowIndex}>
                                {queryResult.columns.map((column, colIndex) => (
                                  <td key={colIndex}>
                                    {row[column] !== null &&
                                    row[column] !== undefined
                                      ? String(row[column])
                                      : "NULL"}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
