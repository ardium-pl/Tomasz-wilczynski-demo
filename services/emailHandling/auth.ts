import path from 'path';
import fs from 'fs/promises';
import fsExtra from 'fs-extra';
import { google } from 'googleapis';
import express from 'express';
import { logger } from '../../src/utils/logger';
import { OAuth2Client, Credentials } from 'google-auth-library';
// import { DATA_FOLDER } from '../../index';
export const DATA_FOLDER = "./data";
const VOLUME_PATH = path.join(DATA_FOLDER, "./processed_attachments");
const TOKEN_PATH = path.join(VOLUME_PATH, 'token.json');
const SCOPES = ['https://mail.google.com/'];
const REFRESH_INTERVAL = 30 * 60 * 1000;

let oAuth2Client: OAuth2Client;
type Auth = {
    client_id: string;
    client_secret: string;
    redirect_uris: string;
}
async function saveToken(tokens: Credentials): Promise<void> {
    try {
        const absolutePath = path.resolve(TOKEN_PATH);
        await fsExtra.ensureDir(path.dirname(TOKEN_PATH));
        await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
        logger.info(`Token saved to file: ${TOKEN_PATH}`);
        logger.info(`Token saved to file: ${absolutePath}`)
    } catch (error) {
        logger.error('Error saving token:', error);
    }
}

async function authorize(credentials: Auth): Promise<OAuth2Client> {
    const { client_secret, client_id, redirect_uris } = credentials;
    oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris);

    try {
        const token = JSON.parse(await fs.readFile(TOKEN_PATH, 'utf8')) as Credentials;
        oAuth2Client.setCredentials(token);

        if (!token.refresh_token) {
            logger.warn('No refresh token. Starting process to obtain new token.');
            return getNewToken(oAuth2Client);
        }

        const isTokenValid = await validateToken(oAuth2Client);
        if (!isTokenValid) {
            logger.warn('Token is invalid. Starting process to obtain new token.');
            return getNewToken(oAuth2Client);
        }

        oAuth2Client.on('tokens', async (tokens: Credentials) => {
            logger.info('Received new tokens');
            await saveToken(tokens);
        });

        setInterval(refreshTokenIfNeeded, REFRESH_INTERVAL);
        return oAuth2Client;
    } catch (err) {
        logger.warn('Existing token not found or invalid. Starting process to obtain new token.');
        return getNewToken(oAuth2Client);
    }
}

async function validateToken(auth: OAuth2Client): Promise<boolean> {
    try {
        await auth.getAccessToken();
        return true;
    } catch (error) {
        logger.error('Error validating token:', error);
        return false;
    }
}

async function refreshTokenIfNeeded(): Promise<boolean> {
    try {
        if (!oAuth2Client.credentials.expiry_date) {
            logger.warn("No expiry date found in credentials. Skipping token refresh.");
            return false;
        }

        const expirationTime = oAuth2Client.credentials.expiry_date;
        const now = Date.now();
        const bufferTime = 5 * 60 * 1000; // 5 minutes buffer before expiration

        if (expirationTime - now <= bufferTime) {
            logger.info("Token is expiring soon, attempting to refresh...");
            const { credentials } = await oAuth2Client.refreshAccessToken();
            oAuth2Client.setCredentials(credentials);
            await saveToken(credentials);
            logger.info("Token refreshed successfully");
            return true;
        } else {
            logger.silly("Token still valid, refresh not necessary.");
        }

        return false;
    } catch (error) {
        logger.error("Error refreshing token:", error);
        return false;
    }
}

function getNewToken(oAuth2Client: OAuth2Client): Promise<OAuth2Client> {
    return new Promise((resolve) => {
        const app = express();
        const port = 3000;
        const authUrl = oAuth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES, prompt: 'consent' });

        logger.info('Application URL: ' + authUrl);
        logger.warn(`Open this URL in your browser to authorize the application: ${authUrl}`);

        app.get('/auth/google/callback', async (req, res) => {
            const code = req.query.code as string;
            try {
                const { tokens } = await oAuth2Client.getToken(code);
                oAuth2Client.setCredentials(tokens);
                await saveToken(tokens);
                res.send('Authorization successful!');
                resolve(oAuth2Client);
            } catch (err) {
                logger.error('Error getting token:', err);
                res.send('Error getting token. Please try again.');
                resolve(oAuth2Client);
            }
        });

        app.listen(port, () => {
            logger.info(`Server listening on port: ${port}`);
        });
    });
}

function buildXOAuth2Token(user: string, accessToken: string): string | null {
    if (!user || !accessToken) {
        logger.error(`Invalid input for buildXOAuth2Token.`);
        return null;
    }
    const authString = `user=${user}\x01auth=Bearer ${accessToken}\x01\x01`;
    return Buffer.from(authString).toString('base64');
}

export { authorize, saveToken, getNewToken, buildXOAuth2Token, refreshTokenIfNeeded };