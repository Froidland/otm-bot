import { Queue } from "bullmq";

export const tournamentQualifierReminderSendQueue = new Queue(
	"tournamentQualifierReminderSend",
	{
		connection: {
			host: process.env.REDIS_HOST || "localhost",
			port: +(process.env.REDIS_PORT || 6379),
			username: process.env.REDIS_USER || "default",
			password: process.env.REDIS_PASSWORD,
		},
	},
);
