/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  KeyRound,
  Binary,
  Radio,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import { AuthState, AuthUser, SpyGame } from './types.ts';
import { AgentDashboard } from './components/AgentDashboard.tsx';
import { getGameById, getGameByIdAsync } from './utils/gameStorage.ts';
import { LanguageProvider, useLanguage, LanguageSwitcher } from './i18n/LanguageContext.tsx';

function AppContent() {
  const { t, language } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [pendingGameId, setPendingGameId] = useState<string | null>(null);
  const [pendingGame, setPendingGame] = useState<SpyGame | null>(null);

  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    error: null,
    isLoading: false,
  });

  // Check URL parameters for invitation code or link
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const gameCode = urlParams.get('game') || urlParams.get('join');
      if (gameCode) {
        setPendingGameId(gameCode);
        const cached = getGameById(gameCode);
        if (cached) {
          setPendingGame(cached);
        } else {
          getGameByIdAsync(gameCode).then((found) => {
            if (found) setPendingGame(found);
          });
        }
      }
    } catch (err) {
      console.error('Error parsing query params:', err);
    }
  }, []);

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      setAuthState((prev) => ({
        ...prev,
        error: t('err_username_required'),
      }));
      return;
    }

    if (!password.trim()) {
      setAuthState((prev) => ({
        ...prev,
        error: t('err_password_required'),
      }));
      return;
    }

    if (password.length < 4) {
      setAuthState((prev) => ({
        ...prev,
        error: t('err_password_min'),
      }));
      return;
    }

    // Clear error and initiate authentication sequence
    setAuthState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    // Simulating authentication handshaking / verification
    setTimeout(() => {
      const cleanUser = username.trim();
      const codenames = ['SHADOW_FOX', 'NIGHT_HAWK', 'CIPHER_NINE', 'GHOST_PROTOCOL', 'VIPER_ONE', 'COVERT_RAVEN'];
      const randomCodename =
        codenames[
          Math.abs(cleanUser.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % codenames.length
        ];

      const authUser: AuthUser = {
        username: cleanUser,
        clearanceLevel: 'LEVEL 4 - TOP SECRET',
        codename: randomCodename,
        terminalId: `NODE-${Math.floor(1000 + Math.random() * 9000)}`,
        loginTime:
          new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          }) + ' UTC',
      };

      setAuthState({
        isAuthenticated: true,
        user: authUser,
        error: null,
        isLoading: false,
      });
    }, 600);
  };

  const handleQuickDemo = (demoUser = 'Agent_007') => {
    setUsername(demoUser);
    if (demoUser === 'Agent_007') {
      setPassword('MI6_Classified_2026!');
    } else {
      setPassword('BlackOps_Clearance_4!');
    }
    if (authState.error) setAuthState((prev) => ({ ...prev, error: null }));
  };

  const handleSignOut = () => {
    setAuthState({
      isAuthenticated: false,
      user: null,
      error: null,
      isLoading: false,
    });
    setPassword('');
  };

  return (
    <div
      id="app-root-container"
      className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between selection:bg-emerald-500/30 selection:text-emerald-300 relative overflow-hidden font-sans"
    >
      {/* Background ambient aesthetic */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px]"></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-emerald-600/5 blur-[120px] rounded-full pointer-events-none"></div>

      {/* Top Banner / System Bar */}
      <header id="app-header" data-testid="top-system-bar" className="w-full border-b border-neutral-850 bg-neutral-950/70 backdrop-blur-md px-4 sm:px-6 py-3.5 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 rounded bg-emerald-950/70 border border-emerald-500/40 text-emerald-400">
              <Binary className="w-4 h-4" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold tracking-wider text-white uppercase font-mono">{t('spynet_terminal')}</span>
              <span className="text-[10px] font-mono tracking-widest text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                {t('secure_v2')}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs font-mono text-neutral-400">
            <div className="hidden md:flex items-center space-x-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                {t('encryption_aes')}
              </span>
              <span className="text-neutral-700">|</span>
              <span className="flex items-center gap-1">
                <Radio className="w-3 h-3 text-emerald-400" />
                {t('status_active')}
              </span>
              <span className="text-neutral-700">|</span>
            </div>
            {/* Language Switcher */}
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10">
        <div className={`w-full ${authState.isAuthenticated ? 'max-w-4xl' : 'max-w-md'}`}>
          <AnimatePresence mode="wait">
            {authState.isAuthenticated && authState.user ? (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                <AgentDashboard
                  user={authState.user}
                  onSignOut={handleSignOut}
                  initialGameId={pendingGameId}
                />
              </motion.div>
            ) : (
              <motion.div
                key="signin-card"
                id="signin-card"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="w-full bg-neutral-900/90 border border-neutral-800 rounded-xl p-6 sm:p-8 backdrop-blur-md shadow-2xl"
              >
                {/* Invitation Alert Banner if URL contains invitation */}
                {pendingGameId && (
                  <motion.div
                    id="invitation-banner"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-5 p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs font-mono flex items-start gap-2.5"
                  >
                    <Share2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-emerald-300 uppercase">
                        {t('priority_invite_detected')}
                      </div>
                      <p className="text-[11px] text-neutral-300 mt-0.5">
                        {pendingGame
                          ? t('invited_to_join', { title: pendingGame.title, id: pendingGame.id })
                          : t('invited_to_op', { id: pendingGameId })}
                      </p>
                      <p className="text-[10px] text-emerald-400 mt-1">
                        {t('auth_below_enter')}
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Sign-in Header */}
                <div id="signin-header" className="text-center mb-6">
                  <div className="inline-flex p-3 rounded-full bg-neutral-800/80 border border-neutral-700 text-emerald-400 mb-3.5">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">{t('operative_signin')}</h1>
                  <p className="text-xs text-neutral-400 mt-1.5">
                    {t('identify_credentials')}
                  </p>
                </div>

                {/* Error Banner */}
                {authState.error && (
                  <motion.div
                    id="auth-error-banner"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mb-5 p-3 rounded-lg bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-center gap-2.5 font-mono"
                  >
                    <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{authState.error}</span>
                  </motion.div>
                )}

                {/* Form */}
                <form id="form-spy-signin" onSubmit={handleSignIn} className="space-y-4">
                  {/* Username Field */}
                  <div id="field-group-username" className="space-y-1.5">
                    <label
                      htmlFor="input-username"
                      className="block text-xs font-mono font-medium text-neutral-300 tracking-wide"
                    >
                      {t('username_label')}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        id="input-username"
                        type="text"
                        value={username}
                        onChange={(e) => {
                          setUsername(e.target.value);
                          if (authState.error) setAuthState((prev) => ({ ...prev, error: null }));
                        }}
                        placeholder={t('username_placeholder')}
                        autoComplete="username"
                        className="w-full bg-neutral-950 border border-neutral-750 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 rounded-lg pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-neutral-600 transition-colors outline-none font-mono"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div id="field-group-password" className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="input-password"
                        className="block text-xs font-mono font-medium text-neutral-300 tracking-wide"
                      >
                        {t('passcode_label')}
                      </label>
                      <span className="text-[11px] text-neutral-500 font-mono">{t('min_chars')}</span>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="input-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (authState.error) setAuthState((prev) => ({ ...prev, error: null }));
                        }}
                        placeholder="••••••••••••"
                        autoComplete="current-password"
                        className="w-full bg-neutral-950 border border-neutral-750 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 rounded-lg pl-10 pr-10 py-2.5 text-sm text-white placeholder-neutral-600 transition-colors outline-none font-mono"
                      />
                      <button
                        id="btn-toggle-password-visibility"
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
                        title={showPassword ? 'Hide passcode' : 'Show passcode'}
                        aria-label={showPassword ? 'Hide passcode' : 'Show passcode'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me and Security Options */}
                  <div id="options-row" className="flex items-center justify-between pt-1">
                    <label
                      htmlFor="checkbox-remember-agent"
                      className="flex items-center gap-2 cursor-pointer select-none text-xs text-neutral-400 hover:text-neutral-300"
                    >
                      <input
                        id="checkbox-remember-agent"
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-neutral-700 bg-neutral-950 text-emerald-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-emerald-500"
                      />
                      <span>{t('keep_authenticated')}</span>
                    </label>

                    {/* Multiple quick agent testing credentials */}
                    <div className="flex items-center gap-2">
                      <button
                        id="btn-quick-fill-007"
                        type="button"
                        onClick={() => handleQuickDemo('Agent_007')}
                        className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 underline underline-offset-2 cursor-pointer"
                        title="Quick demo as Agent_007"
                      >
                        {t('demo_007')}
                      </button>
                      <span className="text-neutral-600">&bull;</span>
                      <button
                        id="btn-demo-credentials-viper"
                        type="button"
                        onClick={() => handleQuickDemo('Operative_Viper')}
                        className="text-[11px] font-mono text-neutral-400 hover:text-emerald-300 underline underline-offset-2 cursor-pointer"
                        title="Quick demo as Operative_Viper"
                      >
                        {t('demo_viper')}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    id="btn-authenticate-submit"
                    type="submit"
                    disabled={authState.isLoading}
                    className="w-full mt-2 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-neutral-950 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950/40 cursor-pointer"
                  >
                    {authState.isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{t('verifying_clearance')}</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>{pendingGameId ? t('accept_invite_auth') : t('auth_button')}</span>
                      </>
                    )}
                  </button>
                  <button
                    id="btn-authenticate"
                    type="submit"
                    disabled={authState.isLoading}
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden="true"
                  >
                    Authenticate
                  </button>
                </form>

                {/* Footer security notice */}
                <div id="security-notice" className="mt-6 pt-4 border-t border-neutral-800/80 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono text-neutral-500">
                    <CheckCircle2 className="w-3.5 h-3.5 text-neutral-600" />
                    <span>{t('protocol_notice')}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer id="bottom-footer" className="w-full py-3 px-6 text-center text-xs font-mono text-neutral-600 border-t border-neutral-900 bg-neutral-950/60 z-10">
        <span>{t('rights_reserved')} &copy; {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
