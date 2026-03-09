export default function ProgressBar({ progress, duration }) {
    const percent = duration > 0 ? (progress / duration) * 100 : 0

    function formatTime(ms) {
        if (!ms || ms <= 0) return '0:00'
        const totalSec = Math.floor(ms / 1000)
        const min = Math.floor(totalSec / 60)
        const sec = totalSec % 60
        return `${min}:${sec.toString().padStart(2, '0')}`
    }

    return (
        <>
            <div className="progress-track" id="progress-bar">
                <div
                    className="progress-fill"
                    style={{ width: `${Math.min(percent, 100)}%` }}
                />
            </div>
            <div className="progress-times">
                <span>{formatTime(progress)}</span>
                <span>{formatTime(duration)}</span>
            </div>
        </>
    )
}
