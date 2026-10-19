import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  Sun,
  Moon,
  Mail,
  Lock,
  ArrowRight,
  X,
  CheckCircle2,
  Zap,
  Users,
  BookOpen,
  Award,
  TrendingUp,
  Star,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { Input, Badge } from '../../ui/Input';
import { BackButton } from '../../ui/BackButton';
import { useUIStore } from '../../../store/uiStore';
import { KorusaIcon } from '../../shared/Logo';
import { supabase } from '../../../lib/supabase';
import { MIN_PASSWORD_LENGTH } from '../../../lib/authConstant';

type AuthView =
  | 'welcome'
  | 'login'
  | 'signup'
  | 'forgot-password';

interface AuthUIProps {
  onClose?: () => void;
  onSuccess?: () => void;
  isModal?: boolean;
  defaultView?: AuthView;
}

export const AuthUI = ({
  onClose,
  onSuccess,
  isModal = false,
  defaultView,
}: AuthUIProps) => {
  const [view, setView] = useState<AuthView>(
    defaultView || (isModal ? 'login' : 'welcome')
  );
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const navigate = useNavigate();
  const { isDarkMode, toggleTheme, setAuthenticated, setShowAuthModal } =
    useUIStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (defaultView) {
      setView(defaultView);
    }
  }, [defaultView]);

  const handleSetView = (newView: AuthView) => {
    setErrorMessage('');
    setView(newView);

    if (!isModal) {
      if (newView === 'welcome') navigate('/');
      else if (newView === 'login') navigate('/login');
      else if (newView === 'signup') navigate('/signup');
      else if (newView === 'forgot-password') navigate('/forgot-password');
    }
  };

  const handleSuccess = () => {
    setAuthenticated(true);
    setShowAuthModal(false);
    if (onSuccess) onSuccess();
    if (onClose) onClose();
  };

  const handleLogin = async () => {
    setErrorMessage('');

    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      setErrorMessage('Email and password are required.');
      return;
    }

    setAuthLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setAuthLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    handleSuccess();
  };

  const handleSignup = async () => {
    setErrorMessage('');

    const cleanName = fullName.trim();
    const cleanEmail = email.trim();

    if (!cleanName || !cleanEmail || !password) {
      setErrorMessage('Full name, email, and password are required.');
      return;
    }

    // Early feedback only; Supabase enforces its own rule on the server too.
    if (password.length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }

    if (!acceptedTerms) {
      setErrorMessage('Please accept the Terms of Service and Privacy Policy.');
      return;
    }

    setAuthLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: cleanName,
        },
      },
    });

    setAuthLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    if (!data.session) {
      setErrorMessage('Account created. Check your email to confirm your account.');
      return;
    }

    handleSuccess();
  };

  const handleResetPassword = async () => {
    setErrorMessage('');

    const cleanEmail = resetEmail.trim();

    if (!cleanEmail) {
      setErrorMessage('Email is required.');
      return;
    }

    setAuthLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: window.location.origin,
    });

    setAuthLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    alert('Password reset email sent. Check your inbox.');
    handleSetView('login');
  };

  const containerClasses = isModal
    ? 'fixed inset-0 z-[1000] flex flex-col items-center overflow-y-auto p-4 py-12 md:p-6 md:py-20'
    // min-h-dvh and a smaller mobile gutter: 100vh is the tall viewport, so on a
    // phone the page was taller than the visible area even when the form fitted,
    // and p-6 took 48px of a 320px screen away from the inputs.
    : 'min-h-dvh bg-sun-bg flex flex-col items-center overflow-y-auto p-4 py-10 sm:p-12 sm:py-12';

  return (
    <div className={containerClasses}>
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="splash-loader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.45, ease: 'easeInOut' }}
            className="fixed inset-0 z-[1200] bg-sun-bg flex flex-col items-center justify-between py-16 px-6"
          >
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-sun-primary/10 rounded-full blur-[120px]" />
              <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-sun-secondary/10 rounded-full blur-[120px]" />
            </div>

            <div className="h-12 w-full" />

            <div className="flex flex-col items-center gap-6 relative z-10">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: [0.8, 1.05, 1], opacity: 1 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className="w-20 h-20 bg-sun-primary text-black rounded-[2rem] flex items-center justify-center shadow-2xl shadow-sun-primary/30 border border-sun-primary/20 rotate-12"
              >
                <div className="-rotate-12">
                  <KorusaIcon size={40} variant="dark" />
                </div>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.4 }}
                className="font-display font-black text-3xl tracking-tighter uppercase text-sun-text-main"
              >
                Korusa
              </motion.h2>

              <div className="relative w-6 h-6 mt-4">
                <div className="absolute inset-0 border-2 border-sun-border/20 rounded-full" />
                <motion.div
                  className="absolute inset-0 border-2 border-sun-primary border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                />
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="relative z-10 flex flex-col items-center gap-1.5 text-center"
            >
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-sun-text-muted">
                WISDOM LABS
              </span>
              <div className="flex items-center gap-1 text-[11px] font-medium text-sun-text-muted">
                <span>from the</span>
                <span className="text-sun-primary font-black tracking-wider uppercase text-[10px]">
                  Elite Network
                </span>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="auth-loaded-wrapper"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-full flex-1 flex flex-col items-center justify-center"
          >
            <button
              onClick={toggleTheme}
              className="fixed top-6 right-6 md:top-12 md:right-12 z-[1100] p-4 bg-sun-surface border border-sun-border rounded-2xl text-sun-text-main shadow-xl hover:scale-110 transition-all active:scale-95"
              title="Toggle Theme"
            >
              {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
            </button>

            {isModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-xl"
                onClick={onClose}
              />
            )}

            <div className="fixed inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-sun-primary/5 rounded-full blur-[120px]" />
              <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-sun-secondary/5 rounded-full blur-[120px]" />
            </div>

            <motion.div
              layout
              className={`w-full relative z-10 my-auto ${
                view === 'welcome' ? 'max-w-4xl' : 'max-w-md'
              }`}
            >
              {(view !== 'welcome' || isModal) && (
                <div className="flex flex-col items-center mb-10">
                  <div className="bg-sun-primary p-3 rounded-[2rem] rotate-12 mb-4 shadow-xl shadow-sun-primary/20 flex items-center justify-center">
                    <KorusaIcon size={32} variant="dark" />
                  </div>
                  <h1 className="font-display font-bold text-3xl tracking-tight uppercase">
                    Korusa
                  </h1>
                  <p className="text-sun-text-muted text-sm mt-2 font-medium">
                    Wisdom, shared & scaled.
                  </p>
                </div>
              )}

              <AnimatePresence mode="wait">
                {view === 'welcome' && (
                  <motion.div
                    key="welcome"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center space-y-32 py-12"
                  >
                    <section className="space-y-12">
                      <div className="space-y-8">
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="w-24 h-24 bg-sun-primary/10 text-sun-primary rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-sun-primary/20 border border-sun-primary/20"
                        >
                          <KorusaIcon size={52} className="animate-pulse animate-duration-200" />
                        </motion.div>

                        <div className="space-y-6">
                          <h1 className="text-6xl md:text-9xl font-display font-black tracking-tighter leading-[0.85]">
                            SOCIAL <br />
                            <span className="text-sun-primary italic">EVOLVED.</span>
                          </h1>
                          <p className="text-sun-text-muted text-lg md:text-2xl font-medium max-w-3xl mx-auto leading-relaxed">
                            Beyond the scroll. Korusa is the premium ecosystem where experts share
                            knowledge and learners master tomorrow&apos;s skills through intentional
                            collaboration.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Button
                          size="lg"
                          className="h-18 px-12 text-lg !rounded-2xl shadow-2xl shadow-sun-primary/20"
                          onClick={() => handleSetView('signup')}
                        >
                          Get Started Free
                        </Button>
                        <Button
                          variant="secondary"
                          size="lg"
                          className="h-18 px-12 text-lg !rounded-2xl border border-sun-border bg-sun-surface/50"
                          onClick={() => handleSetView('login')}
                        >
                          Sign In
                        </Button>
                      </div>
                    </section>

                    <section className="space-y-16">
                      <div className="space-y-4">
                        <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight">
                          The Wisdom Gap
                        </h2>
                        <p className="text-sun-text-muted max-w-xl mx-auto">
                          Traditional social media was built for distraction. We were built for{' '}
                          <span className="text-sun-text-main font-bold italic underline decoration-sun-primary">
                            destination
                          </span>
                          .
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
                        {[
                          {
                            platform: 'TikTok',
                            flaw: 'Dopamine & Distraction',
                            solution: 'Intentional Learning Nodes',
                            color: 'text-red-400',
                          },
                          {
                            platform: 'Instagram',
                            flaw: 'Vanity & Ego',
                            solution: 'Value-Driven Credibility',
                            color: 'text-pink-400',
                          },
                          {
                            platform: 'Facebook',
                            flaw: 'Noise & Toxicity',
                            solution: 'Structured Intelligence Feed',
                            color: 'text-blue-400',
                          },
                          {
                            platform: 'Snapchat',
                            flaw: 'Ephemeral Content',
                            solution: 'Compounding Knowledge Base',
                            color: 'text-yellow-400',
                          },
                        ].map((item, i) => (
                          <div
                            key={i}
                            className="glass-card p-8 rounded-[2rem] space-y-4 border-l-4 border-sun-primary hover:scale-[1.02] transition-transform"
                          >
                            <p className={`text-xs font-black uppercase tracking-[0.2em] ${item.color}`}>
                              {item.platform}
                            </p>
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-sun-text-muted opacity-50 line-through text-sm italic font-medium">
                                <X size={14} /> {item.flaw}
                              </div>
                              <div className="flex items-center gap-2 text-sun-text-main font-bold leading-tight">
                                <CheckCircle2 size={16} className="text-sun-primary shrink-0" />{' '}
                                {item.solution}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="space-y-16">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center text-left">
                        <div className="space-y-8">
                          <Badge
                            variant="primary"
                            className="px-4 py-1.5 uppercase tracking-widest text-[10px]"
                          >
                            Premium Features
                          </Badge>
                          <h2 className="text-4xl md:text-6xl font-display font-bold leading-tight">
                            Designed for <br />
                            <span className="text-sun-primary">High-Performance</span> Minds.
                          </h2>
                          <p className="text-sun-text-muted text-lg leading-relaxed">
                            We didn&apos;t just build another app. We built a cognitive framework.
                            Connect with experts, attend live scaling sessions, and turn your feed
                            into a personalized university.
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {[
                              {
                                icon: <Zap size={20} />,
                                title: 'Hyper-Growth',
                                desc: 'Short-form lessons tailored to your learning goals.',
                              },
                              {
                                icon: <BookOpen size={20} />,
                                title: 'Scaling Rooms',
                                desc: 'Interactive sessions with global industry leaders.',
                              },
                              {
                                icon: <Users size={20} />,
                                title: 'Elite Circles',
                                desc: 'Private networking nodes for focused collaboration.',
                              },
                              {
                                icon: <Award size={20} />,
                                title: 'Verified Skills',
                                desc: 'Proof of proficiency that builds real-world value.',
                              },
                            ].map((feat, i) => (
                              <div key={i} className="space-y-2 group">
                                <div className="w-10 h-10 bg-sun-primary/10 text-sun-primary rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                  {feat.icon}
                                </div>
                                <h4 className="font-bold">{feat.title}</h4>
                                <p className="text-xs text-sun-text-muted leading-relaxed">
                                  {feat.desc}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="relative group">
                          <div className="absolute -inset-4 bg-sun-primary/10 rounded-[3rem] blur-2xl group-hover:bg-sun-primary/20 transition-colors" />
                          <div className="relative glass-card aspect-square rounded-[3rem] overflow-hidden flex items-center justify-center border-sun-border">
                            <div className="p-12 space-y-6 text-center">
                              <TrendingUp size={84} className="text-sun-primary mx-auto opacity-50" />
                              <h3 className="text-2xl font-display font-bold">
                                Your Success, <br />
                                Quantified.
                              </h3>
                              <p className="text-sm text-sun-text-muted">
                                Our AI tracks your knowledge compound interest daily.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="space-y-16">
                      <div className="space-y-4">
                        <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight">
                          Voices of the Network
                        </h2>
                        <p className="text-sun-text-muted">
                          Thousands of creators and students have already made the switch.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                        {[
                          {
                            name: 'Sarah Chen',
                            role: 'Senior AI Researcher',
                            text: "Digital networking used to feel like a chore. Korusa makes it feel like an investment. I've scaled my reach by 3x without sacrificing depth.",
                            img: 'https://i.pravatar.cc/150?u=sarah',
                          },
                          {
                            name: 'Marcus Thorne',
                            role: 'Founder, Growth Lab',
                            text: "The 'Scaling Rooms' feature is a game-changer. I can share complex strategies with an audience that is actually there to learn, not just scroll.",
                            img: 'https://i.pravatar.cc/150?u=marcus',
                          },
                          {
                            name: 'Elena Rodriguez',
                            role: 'Independent Creator',
                            text: 'Finally, a platform that respects my time. Every interaction on Korusa adds value to my life and career. No more dopamine loops.',
                            img: 'https://i.pravatar.cc/150?u=elena',
                          },
                        ].map((t, i) => (
                          <div key={i} className="glass-card p-8 rounded-[2.5rem] relative space-y-6">
                            <div className="flex gap-1 text-sun-primary">
                              {[...Array(5)].map((_, j) => (
                                <Star key={j} size={14} fill="currentColor" />
                              ))}
                            </div>
                            <p className="text-sun-text-muted leading-relaxed italic">&quot;{t.text}&quot;</p>
                            <div className="flex items-center gap-4">
                              <img
                                src={t.img}
                                className="w-12 h-12 rounded-2xl object-cover border-2 border-sun-primary/20"
                                alt={t.name}
                              />
                              <div>
                                <p className="font-bold text-sun-text-main">{t.name}</p>
                                <p className="text-xs text-sun-primary uppercase tracking-widest font-black">
                                  {t.role}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="py-24 relative overflow-hidden rounded-[4rem] border border-sun-primary/20 bg-gradient-to-br from-sun-primary/10 to-sun-secondary/10">
                      <div className="relative z-10 space-y-10 px-8 scale-110 md:scale-125">
                        <div className="space-y-4">
                          <h2 className="text-4xl md:text-6xl font-display font-black tracking-tighter leading-none">
                            READY TO <br />
                            <span className="text-sun-primary italic">SCALE?</span>
                          </h2>
                          <p className="text-sun-text-muted text-sm md:text-base max-w-sm mx-auto font-medium">
                            Join 1M+ experts building the future of learning.
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                          <Button
                            size="lg"
                            className="h-16 px-12 text-lg !rounded-2xl shadow-2xl shadow-sun-primary/20"
                            onClick={() => handleSetView('signup')}
                          >
                            Start My Journey
                          </Button>
                          <Button
                            variant="outline"
                            size="lg"
                            className="h-16 px-12 text-lg !rounded-2xl"
                            onClick={() => handleSetView('login')}
                          >
                            Login
                          </Button>
                        </div>
                      </div>

                      <div className="absolute top-0 right-0 w-64 h-64 bg-sun-primary/20 blur-[100px] rounded-full" />
                      <div className="absolute bottom-0 left-0 w-64 h-64 bg-sun-secondary/20 blur-[100px] rounded-full" />
                    </section>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 border-t border-sun-border opacity-50 pt-16">
                      {[
                        { label: 'Wisdom Nodes', value: '24.5k' },
                        { label: 'Daily Active', value: '850k' },
                        { label: 'Knowledge Created', value: '12PB' },
                        { label: 'Growth Rate', value: '+125%' },
                      ].map((stat, i) => (
                        <div key={i} className="space-y-1">
                          <p className="text-2xl font-bold font-display">{stat.value}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-sun-text-muted">
                            {stat.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {view === 'login' && (
                  <motion.div
                    key="login"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="glass-card p-8 sm:p-10 rounded-[3rem] space-y-6 relative"
                  >
                    {isModal ? (
                      <button
                        onClick={onClose}
                        className="absolute top-6 right-8 text-sun-text-muted hover:text-sun-text-main transition-colors"
                        title="Close"
                      >
                        <X size={20} />
                      </button>
                    ) : (
                      <div className="absolute top-8 left-8">
                        <BackButton onClick={() => handleSetView('welcome')} label="" className="!p-0" />
                      </div>
                    )}

                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold font-display">Welcome back</h2>
                      <p className="text-sun-text-muted text-sm leading-relaxed">
                        Enter your credentials to access your personal feed.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <Input
                        label="Email"
                        placeholder="name@example.com"
                        icon={<Mail size={18} />}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                      <div className="space-y-1">
                        <Input
                          label="Password"
                          type="password"
                          placeholder="••••••••"
                          icon={<Lock size={18} />}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                        <button
                          onClick={() => handleSetView('forgot-password')}
                          className="text-[10px] font-bold text-sun-text-muted hover:text-sun-primary transition-colors uppercase tracking-widest pl-1"
                        >
                          Forgot Password?
                        </button>
                      </div>
                    </div>

                    {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}

                    <Button
                      className="w-full"
                      size="lg"
                      icon={<ArrowRight size={20} />}
                      onClick={handleLogin}
                    >
                      {authLoading ? 'Signing In...' : 'Sign In'}
                    </Button>

                    {/*<div className="grid grid-cols-2 gap-4">
                      <Button variant="secondary" className="w-full !rounded-2xl" icon={<Chrome size={18} />}>
                        Google
                      </Button>
                      <Button variant="secondary" className="w-full !rounded-2xl" icon={<Apple size={18} />}>
                        Apple
                      </Button>
                    </div>*/} {/* to be brought back when the providers are configured */}

                    <p className="text-center text-sm text-sun-text-muted mt-6">
                      Don&apos;t have an account?{' '}
                      <button
                        onClick={() => handleSetView('signup')}
                        className="text-sun-primary font-bold hover:underline"
                      >
                        Sign up
                      </button>
                    </p>
                  </motion.div>
                )}

                {view === 'signup' && (
                  <motion.div
                    key="signup"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="glass-card p-8 sm:p-10 rounded-[3rem] space-y-6 relative"
                  >
                    {isModal ? (
                      <button
                        onClick={onClose}
                        className="absolute top-6 right-8 text-sun-text-muted hover:text-sun-text-main transition-colors"
                        title="Close"
                      >
                        <X size={20} />
                      </button>
                    ) : (
                      <div className="absolute top-8 left-8">
                        <BackButton onClick={() => handleSetView('welcome')} label="" className="!p-0" />
                      </div>
                    )}

                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold font-display">Create Account</h2>
                      <p className="text-sun-text-muted text-sm leading-relaxed">
                        Join a global community of experts and learners.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <Input
                        label="Full Name"
                        placeholder="John Doe"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                      <Input
                        label="Email Address"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                      <Input
                        label="Password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <div className="flex items-center gap-2 px-1">
                        <input
                          type="checkbox"
                          checked={acceptedTerms}
                          onChange={(e) => setAcceptedTerms(e.target.checked)}
                          className="rounded border-sun-border bg-sun-surface text-sun-primary w-4 h-4"
                        />
                        <p className="text-[10px] text-sun-text-muted font-medium">
                          I agree to the{' '}
                          <span className="text-sun-text-main hover:underline cursor-pointer">
                            Terms of Service
                          </span>{' '}
                          and{' '}
                          <span className="text-sun-text-main hover:underline cursor-pointer">
                            Privacy Policy
                          </span>
                          .
                        </p>
                      </div>
                    </div>

                    {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}

                    <Button className="w-full" size="lg" onClick={handleSignup}>
                      {authLoading ? 'Creating Account...' : 'Get Started'}
                    </Button>

                    <p className="text-center text-sm text-sun-text-muted">
                      Already have an account?{' '}
                      <button
                        onClick={() => handleSetView('login')}
                        className="text-sun-primary font-bold hover:underline"
                      >
                        Log in
                      </button>
                    </p>
                  </motion.div>
                )}

                {view === 'forgot-password' && (
                  <motion.div
                    key="forgot"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="glass-card p-8 sm:p-10 rounded-[3rem] space-y-6 relative"
                  >
                    <div className="absolute top-8 left-8">
                      <BackButton onClick={() => handleSetView('login')} label="" className="!p-0" />
                    </div>

                    <div className="space-y-2 text-center pt-8">
                      <div className="mx-auto w-16 h-16 bg-sun-primary/10 rounded-3xl flex items-center justify-center text-sun-primary mb-4">
                        <Lock size={32} />
                      </div>
                      <h2 className="text-2xl font-bold font-display">Reset Password</h2>
                      <p className="text-sun-text-muted text-sm leading-relaxed">
                        Enter your email and we&apos;ll send you a link to recover your account.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <Input
                        label="Email Address"
                        placeholder="name@example.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                      />
                    </div>

                    {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}

                    <Button className="w-full" size="lg" onClick={handleResetPassword}>
                      {authLoading ? 'Sending...' : 'Send Reset Link'}
                    </Button>

                    <button
                      onClick={() => handleSetView('login')}
                      className="w-full text-[10px] font-bold text-sun-text-muted hover:text-sun-text-main transition-colors uppercase tracking-widest text-center"
                    >
                      Back to Login
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};