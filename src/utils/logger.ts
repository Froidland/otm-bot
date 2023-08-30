import DailyRotateFile from "winston-daily-rotate-file";
import * as winston from "winston";
import LokiTransport from "winston-loki";
const { combine, timestamp, printf, colorize, json } = winston.format;
const logDatePattern = process.env.LOG_DATE_PATTERN ?? "DD-MM-YYYY";

// TODO: Don't really know if the logger should be in the utils folder.
const transports: winston.transport[] = [
	new DailyRotateFile({
		filename: "panchobot-error-%DATE%",
		extension: ".log",
		dirname: "logs",
		datePattern: logDatePattern,
		zippedArchive: true,
		maxSize: "20m",
		maxFiles: "14d",
		level: "error",
		format: combine(
			timestamp(),
			printf(({ timestamp, level, message }) => {
				return `${timestamp} [${level}] ${message}`;
			}),
		),
	}),
	new DailyRotateFile({
		filename: "panchobot-main-%DATE%",
		extension: ".log",
		dirname: "logs",
		datePattern: logDatePattern,
		zippedArchive: true,
		maxSize: "20m",
		maxFiles: "14d",
		format: combine(
			timestamp(),
			printf(({ timestamp, level, message }) => {
				return `${timestamp} [${level}] ${message}`;
			}),
		),
	}),
	new winston.transports.Console({
		format: winston.format.combine(
			timestamp(),
			colorize(),
			printf(({ timestamp, level, message }) => {
				return `${timestamp} [${level}] ${message}`;
			}),
		),
	}),
];

if (
	process.env.LOKI_ENDPOINT &&
	process.env.LOKI_USER &&
	process.env.LOKI_PASSWORD
) {
	transports.push(
		new LokiTransport({
			host: process.env.LOKI_ENDPOINT,
			labels: {
				app: "otm-bot",
			},
			json: true,
			format: json(),
			replaceTimestamp: true,
			basicAuth: `${process.env.LOKI_USER}:${process.env.LOKI_PASSWORD}`,
			onConnectionError: (error) => console.error(error),
		}),
	);
}

export const logger = winston.createLogger({
	level: process.env.NODE_ENV === "development" ? "debug" : "info",
	format: combine(
		timestamp(),
		printf(({ timestamp, level, message }) => {
			return `${timestamp} [${level}] ${message}`;
		}),
	),
	transports,
});

export default logger;
