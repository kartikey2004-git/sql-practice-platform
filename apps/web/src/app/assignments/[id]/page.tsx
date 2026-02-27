import { fetchAssignmentById } from "@/services/assignment.service";
import Link from "next/link";
import "./assignment-detail.scss";

interface AssignmentPageProps {
  params: { id: string };
}

export default async function AssignmentPage({ params }: AssignmentPageProps) {
  let assignment = null;
  let error = null;

  const {id} = await params

  try {
    assignment = await fetchAssignmentById(id);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load assignment";
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
        <Link href="/assignments" className="back-link">
          ← Back to assignments
        </Link>

        <div className="assignment-header">
          <h1>{assignment.title}</h1>
        </div>

        <div className="question-section">
          <h2>Question</h2>
          <p className="question-text">{assignment.question}</p>
        </div>

        <div className="schema-section">
          <h2>Database Schema</h2>
          {assignment.sampleTables && assignment.sampleTables.length > 0 ? (
            <div className="tables-grid">
              {assignment.sampleTables.map((table, index) => (
                <div key={index} className="table-schema">
                  <h3>{table.tableName}</h3>
                  <div className="columns-list">
                    <h4>Columns:</h4>
                    <ul>
                      {table.columns.map((column, colIndex) => (
                        <li key={colIndex} className="column-item">
                          <span className="column-name">
                            {column.columnName}
                          </span>
                          <span className="column-type">{column.dataType}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No schema available for this assignment.</p>
          )}
        </div>
      </div>
    </div>
  );
}
