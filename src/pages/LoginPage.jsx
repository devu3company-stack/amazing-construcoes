import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, LogIn, Shield } from 'lucide-react';

export default function LoginPage() {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!username.trim() || !password.trim()) {
            setError('Preencha todos os campos');
            return;
        }

        setIsLoading(true);

        // Simulate a brief loading (feels more professional)
        await new Promise(r => setTimeout(r, 600));

        const result = login(username, password);
        if (!result.success) {
            setError(result.error);
            setIsLoading(false);
        }
    };

    return (
        <div style={styles.wrapper}>
            {/* Background decoration */}
            <div style={styles.bgOrb1} />
            <div style={styles.bgOrb2} />
            <div style={styles.bgOrb3} />

            <div style={styles.container}>
                {/* Logo / Brand */}
                <div style={styles.brand}>
                    <div style={styles.logoIcon}>
                        <span style={styles.logoText}>AC</span>
                    </div>
                    <h1 style={styles.title}>Amazing Construções</h1>
                    <p style={styles.subtitle}>Budget Analytics</p>
                </div>

                {/* Login Card */}
                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <Shield size={20} style={{ color: 'var(--primary-light)' }} />
                        <h2 style={styles.cardTitle}>Acesso ao Sistema</h2>
                    </div>

                    <form onSubmit={handleSubmit} style={styles.form}>
                        <div style={styles.field}>
                            <label style={styles.label}>Usuário</label>
                            <input
                                id="login-username"
                                type="text"
                                value={username}
                                onChange={e => { setUsername(e.target.value); setError(''); }}
                                placeholder="Digite seu usuário"
                                style={styles.input}
                                autoComplete="username"
                                autoFocus
                            />
                        </div>

                        <div style={styles.field}>
                            <label style={styles.label}>Senha</label>
                            <div style={styles.passwordWrapper}>
                                <input
                                    id="login-password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => { setPassword(e.target.value); setError(''); }}
                                    placeholder="Digite sua senha"
                                    style={{ ...styles.input, paddingRight: 44 }}
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={styles.eyeBtn}
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div style={styles.error}>
                                {error}
                            </div>
                        )}

                        <button
                            id="login-submit"
                            type="submit"
                            style={{
                                ...styles.submitBtn,
                                opacity: isLoading ? 0.7 : 1,
                                cursor: isLoading ? 'wait' : 'pointer',
                            }}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span style={styles.spinner} />
                            ) : (
                                <LogIn size={18} />
                            )}
                            {isLoading ? 'Entrando...' : 'Entrar'}
                        </button>
                    </form>

                    <div style={styles.footer}>
                        <p style={styles.footerText}>
                            Sistema interno — Acesso restrito
                        </p>
                    </div>
                </div>

                <p style={styles.copyright}>
                    © {new Date().getFullYear()} Amazing Construções. Todos os direitos reservados.
                </p>
            </div>
        </div>
    );
}

const styles = {
    wrapper: {
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0a1a 0%, #0f0f2e 30%, #1a1a3e 60%, #0d0d24 100%)',
        position: 'relative',
        overflow: 'hidden',
        padding: 20,
    },
    bgOrb1: {
        position: 'absolute',
        width: 500,
        height: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%)',
        top: '-10%',
        right: '-5%',
        pointerEvents: 'none',
    },
    bgOrb2: {
        position: 'absolute',
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
        bottom: '-10%',
        left: '-5%',
        pointerEvents: 'none',
    },
    bgOrb3: {
        position: 'absolute',
        width: 250,
        height: 250,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%)',
        top: '40%',
        left: '30%',
        pointerEvents: 'none',
    },
    container: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: 420,
    },
    brand: {
        textAlign: 'center',
        marginBottom: 8,
    },
    logoIcon: {
        width: 72,
        height: 72,
        borderRadius: 18,
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 16px',
        boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3)',
    },
    logoText: {
        color: '#fff',
        fontSize: '1.5rem',
        fontWeight: 800,
        letterSpacing: 1,
    },
    title: {
        fontSize: '1.6rem',
        fontWeight: 800,
        color: '#f1f5f9',
        marginBottom: 4,
        letterSpacing: '-0.5px',
    },
    subtitle: {
        fontSize: '0.85rem',
        color: 'rgba(148, 163, 184, 0.8)',
        textTransform: 'uppercase',
        letterSpacing: 3,
        fontWeight: 600,
    },
    card: {
        width: '100%',
        background: 'rgba(15, 15, 35, 0.7)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 16,
        overflow: 'hidden',
    },
    cardHeader: {
        padding: '24px 28px 0',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
    },
    cardTitle: {
        fontSize: '1rem',
        fontWeight: 700,
        color: '#e2e8f0',
    },
    form: {
        padding: '20px 28px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
    },
    field: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
    },
    label: {
        fontSize: '0.78rem',
        fontWeight: 600,
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        width: '100%',
        padding: '12px 16px',
        background: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 10,
        color: '#f1f5f9',
        fontSize: '0.92rem',
        outline: 'none',
        transition: 'all 0.2s ease',
        boxSizing: 'border-box',
    },
    passwordWrapper: {
        position: 'relative',
    },
    eyeBtn: {
        position: 'absolute',
        right: 12,
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'none',
        border: 'none',
        color: '#64748b',
        cursor: 'pointer',
        padding: 4,
        display: 'flex',
        alignItems: 'center',
    },
    error: {
        padding: '10px 14px',
        background: 'rgba(239, 68, 68, 0.12)',
        border: '1px solid rgba(239, 68, 68, 0.25)',
        borderRadius: 8,
        color: '#f87171',
        fontSize: '0.82rem',
        fontWeight: 500,
        textAlign: 'center',
    },
    submitBtn: {
        width: '100%',
        padding: '13px 20px',
        background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
        border: 'none',
        borderRadius: 10,
        color: '#fff',
        fontSize: '0.95rem',
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        transition: 'all 0.2s ease',
        boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
        marginTop: 4,
    },
    spinner: {
        width: 18,
        height: 18,
        border: '2px solid rgba(255,255,255,0.3)',
        borderTopColor: '#fff',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
    },
    footer: {
        padding: '14px 28px',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        textAlign: 'center',
    },
    footerText: {
        fontSize: '0.72rem',
        color: '#475569',
        fontWeight: 500,
    },
    copyright: {
        fontSize: '0.72rem',
        color: '#334155',
        textAlign: 'center',
        marginTop: 8,
    },
};
