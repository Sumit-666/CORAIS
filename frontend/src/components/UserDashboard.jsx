import { useAuth } from '../context/AuthContext'

export default function UserDashboard() {
  const { user } = useAuth()

  return (
    <div className="user-dash">
      <div className="ud-hero">
        <div className="ud-avatar-lg">{user?.username?.[0]?.toUpperCase()}</div>
        <div className="ud-hero-info">
          <h2 className="ud-username">{user?.username}</h2>
          <p className="ud-email">{user?.email}</p>
          <span className="role-badge role-badge--user">Candidate</span>
        </div>
      </div>

      <div className="ud-cards">
        <div className="ud-card">
          <p className="ud-card-icon">📄</p>
          <p className="ud-card-title">Apply to Jobs</p>
          <p className="ud-card-desc">
            Go to the Candidate tab, fill in your profile and submit against the active job posting.
          </p>
        </div>
        <div className="ud-card">
          <p className="ud-card-icon">🤖</p>
          <p className="ud-card-title">AI Matching</p>
          <p className="ud-card-desc">
            CORAIS evaluates your skills against the job requirements using multiple AI models.
          </p>
        </div>
        <div className="ud-card">
          <p className="ud-card-icon">💡</p>
          <p className="ud-card-title">Career Advice</p>
          <p className="ud-card-desc">
            Get personalised tips on which skills to develop to close the gap for your target role.
          </p>
        </div>
        <div className="ud-card">
          <p className="ud-card-icon">✉️</p>
          <p className="ud-card-title">Cover Letter</p>
          <p className="ud-card-desc">
            Receive a tailored cover letter generated from your profile and the job description.
          </p>
        </div>
      </div>

      <div className="ud-account">
        <p className="ud-account-title">Account</p>
        <div className="ud-account-row">
          <span className="ud-account-label">Email</span>
          <span className="ud-account-value">{user?.email}</span>
        </div>
        <div className="ud-account-row">
          <span className="ud-account-label">Role</span>
          <span className="ud-account-value">Candidate (user)</span>
        </div>
        <div className="ud-account-row">
          <span className="ud-account-label">Access</span>
          <span className="ud-account-value">Candidate pipeline</span>
        </div>
      </div>
    </div>
  )
}
