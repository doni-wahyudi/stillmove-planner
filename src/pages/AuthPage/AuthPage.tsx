import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast/Toast';
import './AuthPage.css';

export function AuthPage() {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Sign In form state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInError, setSignInError] = useState('');

  // Sign Up form state
  const [signUpInvCode, setSignUpInvCode] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [signUpError, setSignUpError] = useState('');

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setSignInError('');

    if (!signInEmail.trim() || !signInPassword) {
      setSignInError('Please fill in all fields.');
      return;
    }

    setIsLoading(true);
    try {
      await signIn(signInEmail.trim(), signInPassword);
      showToast('Signed in successfully!', 'success');
      navigate('/dashboard');
    } catch (error: any) {
      setSignInError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setSignUpError('');

    if (
      !signUpInvCode.trim() ||
      !signUpEmail.trim() ||
      !signUpPassword ||
      !signUpConfirmPassword
    ) {
      setSignUpError('Please fill in all fields.');
      return;
    }

    if (signUpPassword !== signUpConfirmPassword) {
      setSignUpError('Passwords do not match.');
      return;
    }

    if (signUpPassword.length < 6) {
      setSignUpError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      await signUp(signUpInvCode.trim(), signUpEmail.trim(), signUpPassword);
      showToast(
        'Account created! Please check your email to confirm.',
        'success'
      );
      setActiveTab('signin');
    } catch (error: any) {
      setSignUpError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>📋 Stillmove Planner</h1>
          <p>Your personal productivity companion</p>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${activeTab === 'signin' ? 'active' : ''}`}
            onClick={() => setActiveTab('signin')}
          >
            Sign In
          </button>
          <button
            className={`auth-tab ${activeTab === 'signup' ? 'active' : ''}`}
            onClick={() => setActiveTab('signup')}
          >
            Sign Up
          </button>
        </div>

        {activeTab === 'signin' && (
          <form className="auth-form active" onSubmit={handleSignIn}>
            <div className="form-group">
              <label htmlFor="signin-email">Email</label>
              <input
                type="email"
                id="signin-email"
                placeholder="Enter your email"
                value={signInEmail}
                onChange={(e) => setSignInEmail(e.target.value)}
                className={signInError ? 'error' : ''}
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label htmlFor="signin-password">Password</label>
              <input
                type="password"
                id="signin-password"
                placeholder="Enter your password"
                value={signInPassword}
                onChange={(e) => setSignInPassword(e.target.value)}
                className={signInError ? 'error' : ''}
                autoComplete="current-password"
              />
            </div>
            {signInError && (
              <div className="error-message show">{signInError}</div>
            )}
            <button
              type="submit"
              className="auth-submit-btn"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        {activeTab === 'signup' && (
          <form className="auth-form active" onSubmit={handleSignUp}>
            <div className="form-group">
              <label htmlFor="signup-invitation">Invitation Code</label>
              <input
                type="text"
                id="signup-invitation"
                placeholder="Enter invitation code"
                value={signUpInvCode}
                onChange={(e) => setSignUpInvCode(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="signup-email">Email</label>
              <input
                type="email"
                id="signup-email"
                placeholder="Enter your email"
                value={signUpEmail}
                onChange={(e) => setSignUpEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label htmlFor="signup-password">Password</label>
              <input
                type="password"
                id="signup-password"
                placeholder="Create a password"
                value={signUpPassword}
                onChange={(e) => setSignUpPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="form-group">
              <label htmlFor="signup-confirm">Confirm Password</label>
              <input
                type="password"
                id="signup-confirm"
                placeholder="Confirm your password"
                value={signUpConfirmPassword}
                onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            {signUpError && (
              <div className="error-message show">{signUpError}</div>
            )}
            <button
              type="submit"
              className="auth-submit-btn"
              disabled={isLoading}
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default AuthPage;
