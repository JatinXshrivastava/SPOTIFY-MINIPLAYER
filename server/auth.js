require('dotenv').config()
const express = require('express')
const crypto = require('crypto')
const axios = require('axios')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json())

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
const REDIRECT_URI = 'http://127.0.0.1:8888/callback'
const PORT = process.env.PORT || 8888

// Token storage
let tokenStore = {
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
}

// PKCE helpers
function generateCodeVerifier() {
    return crypto.randomBytes(64).toString('base64url')
}

function generateCodeChallenge(verifier) {
    const hash = crypto.createHash('sha256').update(verifier).digest()
    return hash.toString('base64url')
}

let codeVerifier = null

// GET /login — redirect to Spotify auth
app.get('/login', (req, res) => {
    codeVerifier = generateCodeVerifier()
    const codeChallenge = generateCodeChallenge(codeVerifier)

    const scopes = [
        'user-read-currently-playing',
        'user-read-playback-state',
        'user-modify-playback-state',
    ].join(' ')

    const params = new URLSearchParams({
        response_type: 'code',
        client_id: CLIENT_ID,
        scope: scopes,
        redirect_uri: REDIRECT_URI,
        code_challenge_method: 'S256',
        code_challenge: codeChallenge,
    })

    res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`)
})

// GET /callback — exchange code for tokens
app.get('/callback', async (req, res) => {
    const { code, error } = req.query

    if (error) {
        res.send(`<html><body style="background:#0a0a0a;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center"><h2 style="color:#f87171">Auth Error</h2><p>${error}</p></div></body></html>`)
        return
    }

    try {
        const response = await axios.post(
            'https://accounts.spotify.com/api/token',
            new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: REDIRECT_URI,
                client_id: CLIENT_ID,
                code_verifier: codeVerifier,
            }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        )

        const { access_token, refresh_token, expires_in } = response.data
        tokenStore = {
            accessToken: access_token,
            refreshToken: refresh_token,
            expiresAt: Date.now() + expires_in * 1000,
        }

        res.send(`
      <html>
        <body style="background:#0a0a0a;color:#fff;font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
          <div style="text-align:center">
            <div style="font-size:48px;margin-bottom:16px">🎵</div>
            <h2 style="color:#1DB954;margin:0 0 8px">Connected to Spotify!</h2>
            <p style="color:#888;margin:0">You can close this tab and return to the Mini Player.</p>
          </div>
        </body>
      </html>
    `)
    } catch (err) {
        console.error('Token exchange error:', err.response?.data || err.message)
        res.send('<html><body style="color:red">Token exchange failed. Check console.</body></html>')
    }
})

// GET /token — return current access token (auto-refresh if needed)
app.get('/token', async (req, res) => {
    if (!tokenStore.accessToken) {
        return res.json({ token: null })
    }

    // Refresh if expiring within 60s
    if (Date.now() >= tokenStore.expiresAt - 60000) {
        try {
            const response = await axios.post(
                'https://accounts.spotify.com/api/token',
                new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: tokenStore.refreshToken,
                    client_id: CLIENT_ID,
                }),
                { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
            )
            const { access_token, expires_in, refresh_token } = response.data
            tokenStore.accessToken = access_token
            tokenStore.expiresAt = Date.now() + expires_in * 1000
            if (refresh_token) tokenStore.refreshToken = refresh_token
        } catch (err) {
            console.error('Refresh error:', err.response?.data || err.message)
            tokenStore = { accessToken: null, refreshToken: null, expiresAt: null }
            return res.json({ token: null })
        }
    }

    res.json({ token: tokenStore.accessToken })
})

// GET /logout
app.get('/logout', (req, res) => {
    tokenStore = { accessToken: null, refreshToken: null, expiresAt: null }
    res.json({ success: true })
})

app.listen(PORT, () => {
    console.log(`🎵 Spotify Auth server running on http://localhost:${PORT}`)
})
