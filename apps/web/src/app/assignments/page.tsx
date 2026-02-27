import { fetchAssignments, Assignment } from "@/services/assignment.service";
import Link from "next/link";
import "./assignments.scss";

export default async function AssignmentsPage() {
  let assignments: Assignment[] = [];
  let error = null;

  try {
    assignments = await fetchAssignments();
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load assignments";
  }

  if (error) {
    return (
      <div className="assignments-page">
        <div className="container">
          <div className="page-header">
            <h1>SQL Practice</h1>
            <p>Master SQL with hands-on exercises</p>
          </div>
          <div className="error-card">
            <div className="error-icon">⚠️</div>
            <div className="error-content">
              <h3>Unable to load assignments</h3>
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Use assignments directly without mock stats and locks
  const Assignments = assignments.map((assignment, index) => ({
    ...assignment,
    id: index + 1,
  }));

  return (
    <div className="assignments-page">
      <div className="container">
        <div className="page-header">
          <div className="header-content">
            <h1>SQL Practice</h1>
            <p className="header-subtitle">
              Master SQL with interactive exercises and real-time feedback
            </p>
          </div>
          <div className="header-stats">
            <div className="stat-card">
              <div className="stat-number">{Assignments.length}</div>
              <div className="stat-label">Exercises</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">∞</div>
              <div className="stat-label">Attempts</div>
            </div>
          </div>
        </div>

        {Assignments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h2>No assignments available yet</h2>
            <p>Check back later for new SQL exercises</p>
          </div>
        ) : (
          <div className="assignments-grid">
            {Assignments.map((assignment) => (
              <Link
                key={assignment._id}
                href={`/assignments/${assignment._id}`}
                className="assignment-card"
              >
                <div className="card-content">
                  <div className="card-header">
                    <div className="assignment-number">#{assignment.id}</div>
                    <div className="card-badge">SQL</div>
                  </div>
                  <h3 className="assignment-title">{assignment.title}</h3>
                  <p className="assignment-description">
                    {assignment.description ||
                      "Practice your SQL skills with this exercise"}
                  </p>
                  <div className="card-footer">
                    <div className="start-button">
                      <span>Start Exercise</span>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
