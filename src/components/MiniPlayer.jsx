import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ProgressBar from './ProgressBar'
import axios from 'axios'

const POLL_INTERVAL = 2500 // ms

export default function MiniPlayer({ token, onTokenExpired }) {
    const [track, setTrack] = useState(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [progress, setProgress] = useState(0)
    const [duration, setDuration] = useState(0)
    const [volume, setVolume] = useState(50)
    const [showFlash, setShowFlash] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const dragStart = useRef(null)
    const cardRef = useRef(null)

    // Fetch currently playing
    const fetchCurrentlyPlaying = useCallback(async () => {
        try {
            const res = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
                headers: { Authorization: `Bearer ${token}` },
            })

            if (res.status === 204 || !res.data) {
                setTrack(null)
                setIsPlaying(false)
                return
            }

            const item = res.data.item
            const playing = res.data.is_playing
            setTrack(item)
            setIsPlaying(playing)
            setProgress(res.data.progress_ms || 0)
            setDuration(item?.duration_ms || 0)
        } catch (err) {
            if (err.response?.status === 401) {
                onTokenExpired()
            }
        }
    }, [token, onTokenExpired])

    useEffect(() => {
        fetchCurrentlyPlaying()
        const interval = setInterval(fetchCurrentlyPlaying, POLL_INTERVAL)
        return () => clearInterval(interval)
    }, [fetchCurrentlyPlaying])

    // Smooth progress interpolation between polls
    useEffect(() => {
        if (!isPlaying || !duration) return
        const interval = setInterval(() => {
            setProgress((p) => Math.min(p + 1000, duration))
        }, 1000)
        return () => clearInterval(interval)
    }, [isPlaying, duration])

    // Playback controls
    async function togglePlayPause() {
        try {
            if (isPlaying) {
                await axios.put('https://api.spotify.com/v1/me/player/pause', {}, {
                    headers: { Authorization: `Bearer ${token}` },
                })
            } else {
                await axios.put('https://api.spotify.com/v1/me/player/play', {}, {
                    headers: { Authorization: `Bearer ${token}` },
                })
            }
            setIsPlaying(!isPlaying)
        } catch (err) {
            if (err.response?.status === 401) onTokenExpired()
        }
    }

    async function skipNext() {
        try {
            await axios.post('https://api.spotify.com/v1/me/player/next', {}, {
                headers: { Authorization: `Bearer ${token}` },
            })
            setTimeout(fetchCurrentlyPlaying, 600)
        } catch (err) {
            if (err.response?.status === 401) onTokenExpired()
        }
    }

    async function skipPrev() {
        try {
            await axios.post('https://api.spotify.com/v1/me/player/previous', {}, {
                headers: { Authorization: `Bearer ${token}` },
            })
            setTimeout(fetchCurrentlyPlaying, 600)
        } catch (err) {
            if (err.response?.status === 401) onTokenExpired()
        }
    }

    async function handleVolumeChange(e) {
        const val = Number(e.target.value)
        setVolume(val)
        try {
            await axios.put(
                `https://api.spotify.com/v1/me/player/volume?volume_percent=${val}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            )
        } catch { /* silent */ }
    }

    // Open Spotify with flash animation
    async function openSpotify() {
        setShowFlash(true)
        setTimeout(() => setShowFlash(false), 500)
        setTimeout(() => {
            if (window.electronAPI) {
                window.electronAPI.openSpotify()
            } else {
                window.open('https://open.spotify.com', '_blank')
            }
        }, 200)
    }

    function handleMinimize() {
        if (window.electronAPI) {
            window.electronAPI.minimizeWindow()
        }
    }

    // Dragging logic
    function onMouseDown(e) {
        if (e.button !== 0) return
        dragStart.current = { x: e.screenX, y: e.screenY }
        setIsDragging(true)
    }

    useEffect(() => {
        if (!isDragging) return
        function onMouseMove(e) {
            if (!dragStart.current) return
            const dx = e.screenX - dragStart.current.x
            const dy = e.screenY - dragStart.current.y
            if (window.electronAPI) {
                window.electronAPI.dragWindow({ deltaX: dx, deltaY: dy })
            }
            dragStart.current = { x: e.screenX, y: e.screenY }
        }
        function onMouseUp() {
            setIsDragging(false)
            dragStart.current = null
        }
        window.addEventListener('mousemove', onMouseMove)
        window.addEventListener('mouseup', onMouseUp)
        return () => {
            window.removeEventListener('mousemove', onMouseMove)
            window.removeEventListener('mouseup', onMouseUp)
        }
    }, [isDragging])

    const albumArt = track?.album?.images?.[0]?.url
    const trackName = track?.name || 'Nothing playing'
    const artistName = track?.artists?.map((a) => a.name).join(', ') || ''

    return (
        <>
            <AnimatePresence>
                {showFlash && (
                    <motion.div
                        className="spotify-flash"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.15 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                    />
                )}
            </AnimatePresence>

            <motion.div
                ref={cardRef}
                className="player-card"
                initial={{ opacity: 0, scale: 0.85, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                id="mini-player-card"
            >
                {/* Background album art blur */}
                {albumArt && (
                    <AnimatePresence>
                        <motion.div
                            key={albumArt}
                            className="bg-blur"
                            style={{ backgroundImage: `url(${albumArt})` }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.8 }}
                        />
                    </AnimatePresence>
                )}
                <div className="bg-overlay" />

                {/* Drag handle */}
                <div className="drag-handle" onMouseDown={onMouseDown} />

                {/* Main content */}
                <div className="card-content">
                    {/* Album Art */}
                    <motion.div
                        className="album-art-wrapper"
                        onClick={openSpotify}
                        whileTap={{ scale: 0.92 }}
                        id="album-art-open-btn"
                    >
                        <AnimatePresence mode="wait">
                            {albumArt ? (
                                <motion.img
                                    key={albumArt}
                                    src={albumArt}
                                    alt={trackName}
                                    className="album-art"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.4 }}
                                />
                            ) : (
                                <div className="album-art-placeholder">🎵</div>
                            )}
                        </AnimatePresence>
                        <div className="album-art-overlay">
                            <span className="open-icon">↗</span>
                        </div>
                    </motion.div>

                    {/* Track Info + Controls */}
                    <div className="track-info">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={trackName}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{ duration: 0.25 }}
                            >
                                <div className="track-name" title={trackName}>{trackName}</div>
                                <div className="track-artist" title={artistName}>{artistName}</div>
                            </motion.div>
                        </AnimatePresence>

                        <div className="controls">
                            <button className="ctrl-btn" onClick={skipPrev} id="prev-btn" title="Previous">
                                <PrevIcon />
                            </button>
                            <motion.button
                                className="ctrl-btn play-pause"
                                onClick={togglePlayPause}
                                whileTap={{ scale: 0.88 }}
                                id="play-pause-btn"
                                title={isPlaying ? 'Pause' : 'Play'}
                            >
                                {isPlaying ? <PauseIcon /> : <PlayIcon />}
                            </motion.button>
                            <button className="ctrl-btn" onClick={skipNext} id="next-btn" title="Next">
                                <NextIcon />
                            </button>

                            {/* Volume */}
                            <div className="volume-row" style={{ marginLeft: 4 }}>
                                <button className="ctrl-btn" style={{ fontSize: 11 }} title="Volume">
                                    <VolumeIcon />
                                </button>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={volume}
                                    onChange={handleVolumeChange}
                                    className="volume-slider"
                                    id="volume-slider"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right actions */}
                    <div className="right-actions">
                        <button
                            className="minimize-btn"
                            onClick={handleMinimize}
                            id="minimize-btn"
                            title="Hide"
                        >
                            ╌
                        </button>
                        <div className="spotify-logo-wrapper" onClick={openSpotify} style={{ cursor: 'pointer' }}>
                            <SpotifyLogoSVG />
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="progress-section">
                    <ProgressBar progress={progress} duration={duration} />
                </div>
            </motion.div>
        </>
    )
}

// SVG Icons
function PlayIcon() {
    return (
        <svg width="11" height="13" viewBox="0 0 11 13" fill="currentColor">
            <path d="M0 0L11 6.5L0 13V0Z" />
        </svg>
    )
}

function PauseIcon() {
    return (
        <svg width="11" height="13" viewBox="0 0 11 13" fill="currentColor">
            <rect x="0" y="0" width="4" height="13" rx="1.5" />
            <rect x="7" y="0" width="4" height="13" rx="1.5" />
        </svg>
    )
}

function PrevIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
        </svg>
    )
}

function NextIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18l8.5-6L6 6v12zm2.5 0V6l8.5 6-8.5 6zM16 6h2v12h-2z" />
        </svg>
    )
}

function VolumeIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
        </svg>
    )
}

function SpotifyLogoSVG() {
    return (
        <svg className="spotify-logo" viewBox="0 0 24 24" fill="#1DB954">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
        </svg>
    )
}
