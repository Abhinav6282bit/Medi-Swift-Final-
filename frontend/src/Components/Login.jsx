import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Lock, User } from 'lucide-react';

const Login = () => {
    const [formData, setFormData] = useState({ mediId: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const res = await axios.post('http://localhost:5000/api/login', formData);
            if (res.data.success) {
                localStorage.setItem('user', JSON.stringify(res.data));

                const role = res.data.role;
                if (role === 'PATIENT') navigate('/patient-dashboard');
                else if (role === 'AMBULANCE') navigate('/ambulance-dashboard');
                else if (role === 'HOSPITAL') navigate('/hospital-dashboard');
                else if (role === 'DOCTOR') navigate('/doctor-dashboard');
                else if (role === 'NURSE') navigate('/nurse-dashboard');
                else if (role === 'LAB') navigate('/lab-dashboard');
                else if (role === 'PHARMACY') navigate('/pharmacy-dashboard');
                else if (role === 'BLOOD_BANK') navigate('/blood-bank-dashboard');
                else navigate('/');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const containerStyle = {
        maxWidth: '400px',
        margin: '4rem auto',
        padding: '2rem',
        backgroundColor: 'var(--card)',
        borderRadius: '1rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    };

    const inputGroupStyle = {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        marginBottom: '1.5rem'
    };

    const inputStyle = {
        padding: '0.75rem',
        borderRadius: '0.5rem',
        border: '1px solid var(--border)',
        backgroundColor: 'var(--input)',
        outline: 'none'
    };

    return (
        <div style={containerStyle}>
            <h2 style={{ marginBottom: '2rem', textAlign: 'center' }}>Welcome Back</h2>

            {error && (
                <div style={{
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    marginBottom: '1.5rem',
                    backgroundColor: '#fef2f2',
                    color: '#991b1b',
                    border: '1px solid #ef4444',
                    fontSize: '0.875rem'
                }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div style={inputGroupStyle}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <User size={16} /> Medi-ID
                    </label>
                    <input
                        name="mediId"
                        placeholder="MS-PATI-1234"
                        style={inputStyle}
                        value={formData.mediId}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div style={inputGroupStyle}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Lock size={16} /> Password
                    </label>
                    <input
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        style={inputStyle}
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        width: '100%',
                        backgroundColor: 'var(--primary)',
                        color: 'white',
                        padding: '1rem',
                        borderRadius: '0.5rem',
                        fontWeight: 'bold',
                        marginTop: '1rem',
                        opacity: loading ? 0.7 : 1
                    }}
                >
                    {loading ? 'Logging in...' : 'Login'}
                </button>
            </form>
        </div>
    );
};

export default Login;
