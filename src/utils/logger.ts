import DailyRotateFile from "winston-daily-rotate-file";
import * as winston from "winston";
import { WinstonTransport as AxiomTransport } from "@axiomhq/winston";
import "dotenv/config";
const { combine, timestamp, printf, colorize, errors, json } = winston.format;
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
			})
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
			})
		),
	}),
	new winston.transports.Console({
		format: winston.format.combine(
			timestamp(),
			colorize(),
			printf(({ timestamp, level, message }) => {
				return `${timestamp} [${level}] ${message}`;
			})
		),
	}),
];

if (
	process.env.AXIOM_DATASET &&
	process.env.AXIOM_TOKEN &&
	process.env.AXIOM_ORG_ID
) {
	transports.push(
		new AxiomTransport({
			dataset: process.env.AXIOM_DATASET,
			token: process.env.AXIOM_TOKEN,
			orgId: process.env.AXIOM_ORG_ID,
			format: combine(errors({ stack: true }), json()),
		})
	);
}

export const logger = winston.createLogger({
	level: process.env.NODE_ENV === "development" ? "debug" : "info",
	format: combine(
		timestamp(),
		printf(({ timestamp, level, message }) => {
			return `${timestamp} [${level}] ${message}`;
		})
	),
	transports,
});

export default logger;
