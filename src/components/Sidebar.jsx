import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    Upload,
    Kanban,
    FileSpreadsheet,
    Building2,
    LogOut,
    User,
    Menu,
    X,
} from 'lucide-react';

export default function Sidebar() {
    const { selectedCompany, setSelectedCompany } = useData();
    const { user, logout } = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);

    const closeMobile = () => setMobileOpen(false);

    return (
        <>
            {/* Mobile hamburger button */}
            <button
                className="mobile-menu-btn"
                onClick={() => setMobileOpen(true)}
                aria-label="Abrir menu"
            >
                <Menu size={24} />
            </button>

            {/* Overlay for mobile */}
            {mobileOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={closeMobile}
                />
            )}

            <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
                {/* Mobile close button */}
                <button
                    className="mobile-close-btn"
                    onClick={closeMobile}
                    aria-label="Fechar menu"
                >
                    <X size={20} />
                </button>

                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <div className="sidebar-logo-icon">AC</div>
                        <div className="sidebar-logo-text">
                            <h1>Amazing Construções</h1>
                            <span>Budget Analytics</span>
                        </div>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <span className="nav-section-label">Principal</span>

                    <NavLink
                        to="/"
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        end
                        onClick={closeMobile}
                    >
                        <LayoutDashboard className="nav-icon" />
                        Dashboard
                    </NavLink>

                    <NavLink
                        to="/upload"
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        onClick={closeMobile}
                    >
                        <Upload className="nav-icon" />
                        Subir Orçamentos
                    </NavLink>

                    <NavLink
                        to="/follow-up"
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        onClick={closeMobile}
                    >
                        <Kanban className="nav-icon" />
                        Follow-up
                    </NavLink>

                    <NavLink
                        to="/budgets"
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        onClick={closeMobile}
                    >
                        <FileSpreadsheet className="nav-icon" />
                        Orçamentos
                    </NavLink>

                    <span className="nav-section-label" style={{ marginTop: '16px' }}>
                        Empresas
                    </span>

                    <button
                        className={`nav-item ${selectedCompany === 'all' ? 'active' : ''}`}
                        onClick={() => { setSelectedCompany('all'); closeMobile(); }}
                    >
                        <Building2 className="nav-icon" />
                        Todas as Empresas
                    </button>

                    <button
                        className={`nav-item ${selectedCompany === 'LojaDoAsfalto' ? 'active' : ''}`}
                        onClick={() => { setSelectedCompany('LojaDoAsfalto'); closeMobile(); }}
                    >
                        <Building2 className="nav-icon" />
                        Loja do Asfalto
                    </button>

                    <button
                        className={`nav-item ${selectedCompany === 'AsfaltoMulti' ? 'active' : ''}`}
                        onClick={() => { setSelectedCompany('AsfaltoMulti'); closeMobile(); }}
                    >
                        <Building2 className="nav-icon" />
                        Asfalto Multi
                    </button>
                </nav>

                <div className="sidebar-footer">
                    {/* User info */}
                    <div className="sidebar-user">
                        <div className="sidebar-user-avatar">
                            <User size={16} />
                        </div>
                        <div className="sidebar-user-info">
                            <span className="sidebar-user-name">{user?.name || 'Usuário'}</span>
                            <span className="sidebar-user-role">
                                {user?.role === 'admin' ? 'Administrador' : 'Vendedor'}
                            </span>
                        </div>
                        <button
                            className="sidebar-logout-btn"
                            onClick={logout}
                            title="Sair"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>

                    <div className="company-switcher">
                        <button
                            className={`company-btn ${selectedCompany === 'all' ? 'active' : ''}`}
                            onClick={() => setSelectedCompany('all')}
                        >
                            Todas
                        </button>
                        <button
                            className={`company-btn ${selectedCompany === 'LojaDoAsfalto' ? 'active' : ''}`}
                            onClick={() => setSelectedCompany('LojaDoAsfalto')}
                        >
                            Loja Asfalto
                        </button>
                        <button
                            className={`company-btn ${selectedCompany === 'AsfaltoMulti' ? 'active' : ''}`}
                            onClick={() => setSelectedCompany('AsfaltoMulti')}
                        >
                            Multi
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
