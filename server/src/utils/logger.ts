import winston from 'winston';
import path from 'path';

const DEFAULT_LOG_LEVEL = 'debug'; // Zmienione na 'debug' dla bardziej szczegółowych logów
const TIME_ZONE = 'Europe/Warsaw';
const DATE_FORMAT = 'en-GB';

const formatDateInTimeZone = (date: Date, timeZone: string) => {
    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: timeZone,
        hour12: false
    };
    return new Intl.DateTimeFormat(DATE_FORMAT, options).format(date);
};

const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: () => formatDateInTimeZone(new Date(), TIME_ZONE)
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(), // Dodane dla lepszego formatowania obiektów
    winston.format.json()
);

const getLogFilePath = (filename: string) => path.join(process.cwd(), 'logs', filename);

const fileTransport = (filename: string, level = 'debug') => new winston.transports.File({
    filename: getLogFilePath(filename),
    level,
    format: logFormat
});

const consoleFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
        msg += '\n' + JSON.stringify(metadata, null, 2);
    }
    return msg;
});

const consoleTransport = new winston.transports.Console({
    format: winston.format.combine(
        winston.format.colorize(),
        consoleFormat
    )
});

export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || DEFAULT_LOG_LEVEL,
    format: logFormat,
    transports: [
        fileTransport('combined.log'),
        fileTransport('error.log', 'error'),
        consoleTransport
    ]
});

logger.on('error', (error) => {
    console.error('Error in logger:', error);
});

