import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, Home, LogIn, UserPlus } from 'lucide-react';

const Navbar = () => {
    const location = useLocation();

    return (
        <nav style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 2rem',
            backgroundColor: 'var(--card)',
            borderBottom: '1px solid var(--border)',
            position: 'sticky',
            top: 0,
            zIndex: 100
        }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', color: 'var(--primary)', fontSize: '1.25rem' }}>
                <Activity size={24} />
                <span>Medi-Swift</span>
            </Link>

            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: location.pathname === '/' ? 'var(--primary)' : 'var(--secondary)' }}>
                    <Home size={18} /> Home
                </Link>
                <Link to="/login" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: location.pathname === '/login' ? 'var(--primary)' : 'var(--secondary)' }}>
                    <LogIn size={18} /> Login
                </Link>
                <Link to="/register" style={{
                    backgroundColor: 'var(--primary)',
                    color: 'white',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                }}>
                    <UserPlus size={18} /> Register
                </Link>
            </div>
        </nav>
    );
};

export default Navbar;
