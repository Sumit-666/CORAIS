import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { GoogleLogin } from "@react-oauth/google";

function Field({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoFocus,
  minLength,
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-bold text-gray-700">
        {label} <span className="text-indigo-700">*</span>
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        minLength={minLength}
        required
        className="border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 transition-all w-full"
      />
    </div>
  );
}

// ── Forgot Password Modal ─────────────────────────────────────────────────────

function ForgotPasswordModal({ onClose }) {
  const [step,        setStep]        = useState(1) // 1: email  2: verify otp  3: new password
  const [email,       setEmail]       = useState('')
  const [otp,         setOtp]         = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm,     setConfirm]     = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [success,     setSuccess]     = useState(false)

  const API = 'http://localhost:5000/api/auth'

  const STEP_TITLES = { 1: 'Forgot Password', 2: 'Verify Code', 3: 'New Password' }

  const sendReset = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res  = await fetch(`${API}/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message || 'Failed to send code'); return }
      setStep(2)
    } catch { setError('Network error') }
    finally  { setLoading(false) }
  }

  const verifyOtp = async (e) => {
    e.preventDefault()
    if (!otp) { setError('Enter the code'); return }
    setLoading(true); setError('')
    try {
      const res  = await fetch(`${API}/verify-email`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message || 'Invalid or expired code'); return }
      setStep(3)
    } catch { setError('Network error') }
    finally  { setLoading(false) }
  }

  const resetPassword = async (e) => {
    e.preventDefault()
    if (newPassword !== confirm) { setError('Passwords do not match'); return }
    if (newPassword.length < 8)  { setError('Password must be at least 8 characters'); return }
    setLoading(true); setError('')
    try {
      const res  = await fetch(`${API}/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message || 'Reset failed'); return }
      setSuccess(true)
    } catch { setError('Network error') }
    finally  { setLoading(false) }
  }

  const btnClass = "w-full py-3 rounded-xl bg-gradient-to-r from-indigo-700 to-indigo-500 text-white font-bold text-sm cursor-pointer hover:opacity-90 disabled:opacity-50 transition-all"

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-5"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl w-full max-w-sm p-7 flex flex-col gap-5 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-800">
              {success ? 'Password Reset!' : STEP_TITLES[step]}
            </h3>
            {!success && (
              <div className="flex gap-1 mt-1.5">
                {[1,2,3].map(s => (
                  <div key={s} className={`h-1 w-8 rounded-full transition-all ${s <= step ? 'bg-indigo-600' : 'bg-gray-200'}`} />
                ))}
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none cursor-pointer">✕</button>
        </div>

        {/* Step content */}
        {success ? (
          <>
            <p className="text-sm text-green-600">Your password has been reset successfully. You can now sign in with your new password.</p>
            <button onClick={onClose} className={btnClass}>Back to Sign In</button>
          </>
        ) : step === 1 ? (
          <form className="flex flex-col gap-4" onSubmit={sendReset}>
            <p className="text-sm text-gray-500">Enter your email and we'll send you a reset code.</p>
            <Field label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="mail@example.com" autoFocus />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={loading} className={btnClass}>
              {loading ? 'Sending…' : 'Send Reset Code'}
            </button>
          </form>
        ) : step === 2 ? (
          <form className="flex flex-col gap-4" onSubmit={verifyOtp}>
            <p className="text-sm text-gray-500">Enter the 6-digit code sent to <strong>{email}</strong>.</p>
            <Field label="Reset Code" value={otp} onChange={e => setOtp(e.target.value)} placeholder="6-digit code" autoFocus />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={loading} className={btnClass}>
              {loading ? 'Verifying…' : 'Verify Code'}
            </button>
            <button type="button" onClick={() => { setStep(1); setOtp(''); setError('') }}
              className="text-sm text-gray-400 hover:text-gray-600 cursor-pointer bg-transparent border-none text-center">
              ← Back
            </button>
          </form>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={resetPassword}>
            <p className="text-sm text-gray-500">Email verified. Choose a new password for <strong>{email}</strong>.</p>
            <Field label="New Password"     type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 8 characters" autoFocus />
            <Field label="Confirm Password" type="password" value={confirm}     onChange={e => setConfirm(e.target.value)}     placeholder="Repeat password" />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={loading} className={btnClass}>
              {loading ? 'Resetting…' : 'Reset Password'}
            </button>
          </form>
        )}

      </div>
    </div>
  )
}

// ── Sign-in form ──────────────────────────────────────────────────────────────

function SignInForm({ endpoint, onSuccess, onError, loading, setLoading }) {
  const [form,            setForm]            = useState({ email: "", password: "" });
  const [keepLoggedIn,    setKeepLoggedIn]    = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.detail || data.message || "Invalid credentials");
        return;
      }
      onSuccess(data.user, data.access_token || data.accessToken);
    } catch {
      onError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form className="flex flex-col gap-5" onSubmit={submit}>
        <Field label="Email"    type="email"    value={form.email}    onChange={set("email")}    placeholder="mail@example.com" autoFocus />
        <Field label="Password" type="password" value={form.password} onChange={set("password")} placeholder="Min. 8 characters" />

        {/* Keep me logged in  |  Forgot password? */}
        <div className="flex items-center justify-between -mt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox" checked={keepLoggedIn} onChange={e => setKeepLoggedIn(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 accent-indigo-600 cursor-pointer"
            />
            <span className="text-sm text-gray-600">Keep me logged in</span>
          </label>
          <button type="button" onClick={() => setShowForgotModal(true)}
            className="text-sm text-indigo-700 font-semibold hover:underline cursor-pointer bg-transparent border-none">
            Forgot password?
          </button>
        </div>

        <button type="submit" disabled={loading}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-700 to-indigo-500 text-white font-bold text-base cursor-pointer hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all">
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>

      {showForgotModal && <ForgotPasswordModal onClose={() => setShowForgotModal(false)} />}
    </>
  );
}

function RegisterForm({ onSuccess, onError, loading, setLoading }) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  const API = "http://localhost:5000/api/auth";

  const handleSendOtp = async () => {
    if (!email) {
      onError("Enter your email first");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.message || "Failed to send OTP");
        return;
      }
      setOtpSent(true);
      onError("");
    } catch {
      onError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!otp) {
      onError("Enter the OTP");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.message || "OTP verification failed");
        return;
      }
      setEmailVerified(true);
      setOtpSent(false);
      onError("");
    } catch {
      onError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!emailVerified) {
      onError("Please verify your email first");
      return;
    }
    if (password !== confirm) {
      onError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      onError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.message || "Registration failed");
        return;
      }
      onSuccess(data.user, data.accessToken);
    } catch {
      onError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleRegister}>
      {/* Email + Verify button */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-bold text-gray-700">
          Email <span className="text-indigo-700">*</span>
        </label>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="mail@example.com"
            required
            disabled={emailVerified}
            autoFocus
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 transition-all disabled:bg-gray-50 disabled:text-gray-400"
          />
          {emailVerified ? (
            <span className="flex items-center gap-1.5 px-4 rounded-xl bg-green-50 border border-green-200 text-green-600 text-sm font-semibold shrink-0">
              ✓ Verified
            </span>
          ) : (
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={loading}
              className="px-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm font-semibold hover:bg-indigo-100 transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
            >
              {loading && otpSent ? "…" : otpSent ? "Resend" : "Verify"}
            </button>
          )}
        </div>
      </div>

      {/* OTP input — shown after OTP is sent */}
      {otpSent && !emailVerified && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-bold text-gray-700">
            OTP <span className="text-indigo-700">*</span>
          </label>
          <div className="flex gap-2">
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter 6-digit OTP"
              autoFocus
              maxLength={6}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 transition-all tracking-widest"
            />
            <button
              type="button"
              onClick={handleVerifyEmail}
              disabled={loading}
              className="px-4 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
            >
              {loading ? "…" : "Confirm"}
            </button>
          </div>
          <p className="text-xs text-gray-400">
            Check your inbox and enter the code above.
          </p>
        </div>
      )}

      <Field
        label="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="yourname"
        minLength={3}
      />
      <Field
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Min. 8 characters"
      />
      <Field
        label="Confirm Password"
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Repeat password"
      />

      <button
        type="submit"
        disabled={loading || !emailVerified}
        className="mt-1 w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-700 to-indigo-500 text-white font-bold text-base cursor-pointer hover:opacity-90 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        {loading ? "Creating account…" : "Create Account"}
      </button>
    </form>
  );
}

function BootstrapForm({ onSuccess, onError, loading, setLoading }) {
  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    confirm: "",
  });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      onError("Passwords do not match");
      return;
    }
    if (form.password.length < 8) {
      onError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/admin/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          username: form.username,
          password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.detail || "Setup failed");
        return;
      }
      onSuccess(data.user, data.access_token);
    } catch {
      onError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <Field
        label="Email"
        type="email"
        value={form.email}
        onChange={set("email")}
        placeholder="admin@company.com"
        autoFocus
      />
      <Field
        label="Username"
        value={form.username}
        onChange={set("username")}
        placeholder="superadmin"
        minLength={3}
      />
      <Field
        label="Password"
        type="password"
        value={form.password}
        onChange={set("password")}
        placeholder="Min. 8 characters"
      />
      <Field
        label="Confirm Password"
        type="password"
        value={form.confirm}
        onChange={set("confirm")}
        placeholder="Repeat password"
      />
      <button
        type="submit"
        disabled={loading}
        className="mt-1 w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-700 to-indigo-500 text-white font-bold text-base cursor-pointer hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {loading ? "Setting up…" : "Create Superadmin"}
      </button>
    </form>
  );
}

export default function AuthPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("user");
  const [sub, setSub] = useState("signin");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const switchMode = (m) => {
    setMode(m);
    setError("");
    setSub("signin");
  };
  const switchSub = (s) => {
    setSub(s);
    setError("");
  };
  const onSuccess = (user, token) => {
    login(user, token);
    navigate("/");
  };
  const formProps = { onSuccess, onError: setError, loading, setLoading };

  const heading =
    mode === "user" && sub === "register"
      ? "Create Account"
      : mode === "admin" && sub === "setup"
        ? "First-time Setup"
        : mode === "admin"
          ? "Admin Sign In"
          : "Sign In";

  const subtext =
    mode === "user" && sub === "register"
      ? "Fill in the details to create your candidate account."
      : mode === "admin" && sub === "setup"
        ? "Creates the first superadmin. Disabled once any admin exists."
        : mode === "admin"
          ? "Enter your admin credentials to sign in!"
          : "Enter your email and password to sign in!";

  return (
    <div className="flex min-h-screen bg-white">
      {/* ── Left: form panel ────────────────────────────────────────────── */}
      <div className="flex flex-col w-full md:w-[50%] px-6 md:px-16 py-10 bg-white mx-auto">
        <div className="flex-1 flex flex-col justify-center max-w-[300px] w-full mx-auto py-8">
          {/* Mode pills */}
          <div className="flex bg-gray-100 rounded-full p-1 w-fit gap-0.5 mb-7">
            <button
              onClick={() => switchMode("user")}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all cursor-pointer ${mode === "user" ? "bg-white text-gray-800 shadow-md" : "text-gray-400 hover:text-gray-600"}`}
            >
              User
            </button>
            <button
              onClick={() => switchMode("admin")}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all cursor-pointer ${mode === "admin" ? "bg-white text-gray-800 shadow-md" : "text-gray-400 hover:text-gray-600"}`}
            >
              Admin
            </button>
          </div>
          

          <h1 className="text-2xl font-extrabold text-gray-800 leading-tight">
            {heading}
          </h1>
          {mode === "user" && sub === "signin" && (
            <div className="rounded-full bg-gray-300 mt-4 mb-4">
            <GoogleLogin
              onSuccess={async (credentialResponse) => {
                const res = await fetch("http://localhost:5000/api/auth/google", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    id_token: credentialResponse.credential,
                  }),
                });

                const data = await res.json();

                localStorage.setItem("accessToken", data.accessToken);

                localStorage.setItem("refreshToken", data.refreshToken);
              }}
              onError={() => {
                console.log("Google Login Failed");
              }}
            />
          </div>
          )}
          

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
              {error}
            </div>
          )}

          {mode === "user" && sub === "signin" && (
            <SignInForm endpoint="/api/auth/login" {...formProps} />
          )}
          {mode === "user" && sub === "register" && (
            <RegisterForm {...formProps} />
          )}
          {mode === "admin" && sub === "signin" && (
            <SignInForm endpoint="/api/auth/admin/login" {...formProps} />
          )}
          {mode === "admin" && sub === "setup" && (
            <BootstrapForm {...formProps} />
          )}

          <div className="mt-6 text-sm text-gray-500 text-center">
            {mode === "user" && sub === "signin" && (
              <span>
                Not registered yet?{" "}
                <button
                  onClick={() => switchSub("register")}
                  className="text-indigo-700 font-bold hover:underline cursor-pointer bg-transparent border-none"
                >
                  Create an Account
                </button>
              </span>
            )}
            {mode === "user" && sub === "register" && (
              <span>
                Already have an account?{" "}
                <button
                  onClick={() => switchSub("signin")}
                  className="text-indigo-700 font-bold hover:underline cursor-pointer bg-transparent border-none"
                >
                  Sign In
                </button>
              </span>
            )}
            {/* {mode === "admin" && sub === "signin" && (
              <span>
                No admin yet?{" "}
                <button
                  onClick={() => switchSub("setup")}
                  className="text-indigo-700 font-bold hover:underline cursor-pointer bg-transparent border-none"
                >
                  First-time Setup
                </button>
              </span>
            )} */}
            {mode === "admin" && sub === "setup" && (
              <span>
                Have an account?{" "}
                <button
                  onClick={() => switchSub("signin")}
                  className="text-indigo-700 font-bold hover:underline cursor-pointer bg-transparent border-none"
                >
                  Sign In
                </button>
              </span>
            )}
          </div>
        </div>

        <footer className="text-xs text-gray-300 text-center pt-6 border-t border-gray-100">
          © 2025 CORAIS · AI Orchestration Brain
        </footer>
      </div>

      {/* ── Right: brand panel ───────────────────────────────────────────── */}
      <div
        className="hidden md:flex flex-1 max-w-[50%] ml-0 rounded-bl-[200px] rounded-tr-[200px] flex items-center justify-center relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #ec4899 0%, #4169E1 35%, #0000FF 60%, #4169E1 80%, #ec4899 100%)",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 35% 35%, rgba(255,255,255,0.14) 0%, transparent 65%)",
          }}
        />
        <div className="text-center text-white px-10 relative z-10">
          {/* <div className="w-28 h-28 rounded-full flex items-center justify-center text-6xl mx-auto mb-7
            bg-white/20 border-2 border-white/25 backdrop-blur-md">
            🧠
          </div> */}
          <h2 className="text-5xl font-extrabold tracking-tight mb-2">
            CORAIS
          </h2>
          <p className="text-base opacity-75 mb-9 tracking-wide">
            AI Orchestration Brain
          </p>
          {/* <div className="bg-white/15 border border-white/20 rounded-2xl px-7 py-4 backdrop-blur-sm text-sm opacity-90 max-w-xs mx-auto leading-relaxed">
            Powered by multi-agent LangGraph pipelines with adaptive cost routing
          </div> */}
        </div>
      </div>
    </div>
  );
}
