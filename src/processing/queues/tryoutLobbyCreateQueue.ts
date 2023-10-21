import { Queue } from "bullmq";

export const tryoutLobbyCreateQueue = new Queue("tryoutLobbyCreate", {
	connection: {
		host: process.env.REDIS_HOST || "localhost",
		port: +(process.env.REDIS_PORT || 6379),
		password: process.env.REDIS_PASSWORD,
	},
});
