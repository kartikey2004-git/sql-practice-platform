"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { fetchAssignmentById } from "@/services/assignment.service";
import {
  initSandbox,
  executeQuery,
  QueryResult,
} from "@/services/sandbox.service";
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

      const result = await executeQuery(assignment._id, sqlQuery);
      setQueryResult(result);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to execute query";
      setQueryError(errorMessage);
    } finally {
      setExecutingQuery(false);
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
                  <button
                    onClick={handleExecuteQuery}
                    disabled={
                      !sandboxReady || executingQuery || !sqlQuery.trim()
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
                </div>
              </div>
            </div>

            {/* Results Section */}
            {(queryResult || queryError) && (
              <div className="results">
                <h2>Results</h2>
                <div className="results-content">
                  {queryError ? (
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
