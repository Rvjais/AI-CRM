import './ComingSoon.css';

function ComingSoon({ title, icon }) {
    return (
        <div className="coming-soon">
            <div className="coming-soon-content">
                <div className="coming-soon-icon">{icon}</div>
                <h1>{title}</h1>
                <p>This feature is coming soon!</p>
                <div className="coming-soon-message">
                    <p>We're working hard to bring you this amazing feature.</p>
                    <p>Stay tuned for updates!</p>
                </div>
            </div>
        </div>
    );
}

export default ComingSoon;
