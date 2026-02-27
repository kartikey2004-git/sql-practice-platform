"use client";

import { useState, useEffect } from "react";
import { fetchAssignmentById } from "@/services/assignment.service";
import { initSandbox } from "@/services/sandbox.service";
import Link from "next/link";
import "./assignment-detail.scss";

interface AssignmentPageProps {
  params: { id: string };
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

  useEffect(() => {
    const loadAssignment = async () => {
      try {
        const { id } = await params;
        const assignmentData = await fetchAssignmentById(id);
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
      <div className="container">
        <div className="page-layout">
          {/* Header Section */}
          <div className="header-section">
            <Link href="/assignments" className="back-link">
              ← Back to assignments
            </Link>
            <div className="assignment-header">
              <h1>{assignment.title}</h1>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="content-grid">
            {/* Left Column - Question & Status */}
            <div className="left-column">
              {/* Sandbox Status */}
              <div className="status-card">
                <div className="sandbox-status">
                  <h2>Workspace Status</h2>
                  {sandboxLoading ? (
                    <div className="loading-indicator">
                      <div className="spinner"></div>
                      <span>Initializing workspace...</span>
                    </div>
                  ) : sandboxReady ? (
                    <div className="ready-indicator">
                      <div className="status-icon ready">✓</div>
                      <span>
                        Workspace ready! Schema: {sandboxInfo?.schemaName}
                      </span>
                      {sandboxInfo?.isNew && (
                        <span className="new-badge">New</span>
                      )}
                    </div>
                  ) : (
                    <div className="error-indicator">
                      <div className="status-icon error">✗</div>
                      <span>Failed to initialize workspace</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Question Section */}
              <div className="question-card">
                <div className="question-section">
                  <h2>Question</h2>
                  <p className="question-text">{assignment.question}</p>
                </div>
              </div>
            </div>

            {/* Right Column - Schema */}
            <div className="right-column">
              <div className="schema-card">
                <div className="schema-section">
                  <h2>Database Schema</h2>
                  {assignment.sampleTables &&
                  assignment.sampleTables.length > 0 ? (
                    <div className="tables-grid">
                      {assignment.sampleTables.map(
                        (table: any, index: number) => (
                          <div key={index} className="table-schema">
                            <h3>{table.tableName}</h3>
                            <div className="columns-list">
                              <h4>Columns:</h4>
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
          </div>
        </div>
      </div>
    </div>
  );
}
