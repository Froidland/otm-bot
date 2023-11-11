import { Queue } from "bullmq";

export const tournamentQualifierReminderScheduleQueue = new Queue(
	"tournamentQualifierReminderSchedule",
	{
		connection: {
			host: process.env.REDIS_HOST || "localhost",
			port: +(process.env.REDIS_PORT || 6379),
			username: process.env.REDIS_USER || "default",
			password: process.env.REDIS_PASSWORD,
		},
	},
);
