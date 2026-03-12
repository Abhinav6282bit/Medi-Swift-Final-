import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../Components/common/Navbar';

const Layout = () => {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Navbar />
            <main style={{ flex: 1, padding: '2rem' }}>
                <Outlet />
            </main>
            <footer style={{
                padding: '2rem',
                textAlign: 'center',
                borderTop: '1px solid var(--border)',
                color: 'var(--secondary)',
                fontSize: '0.875rem'
            }}>
                &copy; 2026 Medi-Swift. All rights reserved.
            </footer>
        </div>
    );
};

export default Layout;
