import imaps, { ImapSimple, Message, ImapSimpleOptions } from "imap-simple";
import { EMAIL_ADDRESS } from "./constants";
// import { processNewEmails, processEmail } from './emailProcessor.ts';
import { refreshTokenIfNeeded } from "./auth";
import { OAuth2Client } from "google-auth-library";
import { logger } from "../../src/utils/logger";
import { buildXOAuth2Token } from "./auth";

const RECONNECT_DELAY = 60000;

export async function startImapListener(auth: OAuth2Client): Promise<void> {
  const getAccessToken = async (): Promise<string> => {
    await refreshTokenIfNeeded();
    return auth.credentials.access_token as string;
  };

  const startConnection = async (): Promise<void> => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setTimeout(startConnection, RECONNECT_DELAY);
        return;
      }

      const xoauth2Token = buildXOAuth2Token(EMAIL_ADDRESS, accessToken);
      const config: ImapSimpleOptions = {
        imap: {
          user: EMAIL_ADDRESS,
          xoauth2: xoauth2Token!,
          host: "imap.gmail.com",
          port: 993,
          tls: true,
          tlsOptions: { rejectUnauthorized: false },
          authTimeout: 30000,
          keepalive: {
            interval: 10000,
            idleInterval: 300000,
            forceNoop: true,
          },
        },

        onmail: async () => {
          logger.info("New email received. Processing...");
          try {
            // `connection` will be in scope where we attach this handler
            await processNewEmail(connection);
          } catch (error) {
            logger.error("Error processing new email:", error);
          }
        },
      };

      logger.info(
        `Attempting to connect to IMAP using address: ${EMAIL_ADDRESS}`
      );

      const connection: ImapSimple = await imaps.connect(config);
      logger.info("Connected to IMAP server");

      // Handle connection errors
      connection.on("error", (err: Error) => {
        logger.error("IMAP connection error:", err);
        connection.end();
      });

      // Handle unexpected connection closures
      connection.on("close", () => {
        logger.warn("IMAP connection closed unexpectedly");
        setTimeout(() => startConnection(), RECONNECT_DELAY);
      });

      // Process any new/unread emails on initial startup
        await processNewEmail(connection);
      logger.info("Listening for new emails...");

      // Listen for new incoming mail
      connection.imap.on("mail", config.onmail as () => Promise<void>);
    } catch (err) {
      logger.error("Error during IMAP connection attempt:", err);
      setTimeout(() => startConnection(), RECONNECT_DELAY);
    }
  };

  // Kick off the initial connection attempt
  await startConnection();
}

export async function processNewEmail(connection: ImapSimple): Promise<void> {
  try {
    // Open the INBOX
    await connection.openBox("INBOX");
    logger.info("Opened INBOX");

    const searchCriteria = ["UNSEEN"];
    const fetchOptions = {
      bodies: ["HEADER", "TEXT", ""],
      markSeen: false,
      struct: true,
    };

    // Search for UNSEEN messages
    const messages: Message[] = await connection.search(
      searchCriteria,
      fetchOptions
    );
    logger.info(`Found ${messages.length} new messages`);

    // Process each message
    for (const message of messages) {
      try {
        //   await processEmail(connection, message);
      } catch (error) {
        logger.error("Error processing message:", error);
      }
    }

    logger.info("Finished processing new messages");
  } catch (error) {
    logger.error("Error in processNewEmail:", error);
  }
}
