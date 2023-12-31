import { Queue } from "bullmq";

export const tryoutLobbyReminderSendQueue = new Queue(
	"tryoutLobbyReminderSend",
	{
		connection: {
			host: process.env.REDIS_HOST || "localhost",
			port: +(process.env.REDIS_PORT || 6379),
			username: process.env.REDIS_USER || "default",
			password: process.env.REDIS_PASSWORD,
		},
	},
);
