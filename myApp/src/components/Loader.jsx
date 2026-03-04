import React from 'react';

const Loader = ({ size = 'medium', color = '#4A9FF5' }) => {
    const dimensions = {
        small: '16px',
        medium: '24px',
        large: '40px'
    };

    const styles = {
        container: {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            height: '100%',
            minHeight: '100px'
        },
        spinner: {
            width: dimensions[size],
            height: dimensions[size],
            border: `3px solid rgba(0, 0, 0, 0.1)`,
            borderTop: `3px solid ${color}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
        },
        '@keyframes spin': {
            '0%': { transform: 'rotate(0deg)' },
            '100%': { transform: 'rotate(360deg)' }
        }
    };

    return (
        <div style={styles.container} className="loader-container">
            <style>
                {`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}
            </style>
            <div style={styles.spinner} className="loader-spinner"></div>
        </div>
    );
};

export default Loader;
