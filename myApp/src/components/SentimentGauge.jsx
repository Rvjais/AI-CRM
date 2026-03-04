import './SentimentGauge.css';

function SentimentGauge({ sentiment }) {
    const getRotation = () => {
        switch (sentiment) {
            case 'positive':
                return 45; // Right side
            case 'negative':
                return -45; // Left side
            default:
                return 0; // Center
        }
    };

    const getColor = () => {
        switch (sentiment) {
            case 'positive':
                return '#10b981'; // Green
            case 'negative':
                return '#ef4444'; // Red
            default:
                return '#6b7280'; // Gray
        }
    };

    return (
        <div className="sentiment-gauge">
            <svg viewBox="0 0 200 120" className="gauge-svg">
                {/* Background arc */}
                <path
                    d="M 20 100 A 80 80 0 0 1 180 100"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="12"
                    strokeLinecap="round"
                />

                {/* Colored arc */}
                <path
                    d="M 20 100 A 80 80 0 0 1 180 100"
                    fill="none"
                    stroke={getColor()}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray="251.2"
                    strokeDashoffset={sentiment === 'positive' ? '125.6' : sentiment === 'negative' ? '0' : '62.8'}
                    className="gauge-arc"
                />

                {/* Needle */}
                <g transform={`rotate(${getRotation()} 100 100)`}>
                    <line
                        x1="100"
                        y1="100"
                        x2="100"
                        y2="40"
                        stroke={getColor()}
                        strokeWidth="3"
                        strokeLinecap="round"
                    />
                    <circle cx="100" cy="100" r="8" fill={getColor()} />
                </g>
            </svg>
        </div>
    );
}

export default SentimentGauge;
