import { google } from 'googleapis';
import env from './env.js';

/**
 * Google OAuth2 client configuration
 */
export const oauth2Client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
);

export const GMAIL_SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.compose',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
];

/**
 * Get Gmail client for a specific user
 * @param {string} accessToken 
 * @param {string} refreshToken 
 */
export const getGmailClient = (accessToken, refreshToken) => {
    const auth = new google.auth.OAuth2(
        env.GOOGLE_CLIENT_ID,
        env.GOOGLE_CLIENT_SECRET,
        env.GOOGLE_REDIRECT_URI
    );

    auth.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken
    });

    return google.gmail({ version: 'v1', auth });
};
