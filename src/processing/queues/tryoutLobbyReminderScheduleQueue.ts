import { Queue } from "bullmq";

export const tryoutLobbyReminderScheduleQueue = new Queue(
	"tryoutLobbyReminderSchedule",
	{
		connection: {
			host: process.env.REDIS_HOST || "localhost",
			port: +(process.env.REDIS_PORT || 6379),
			password: process.env.REDIS_PASSWORD,
		},
	},
);
