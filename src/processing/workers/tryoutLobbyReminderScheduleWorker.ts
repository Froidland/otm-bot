import db from "@/db";
import { container } from "@sapphire/framework";
import { Job, Worker, WorkerOptions } from "bullmq";
import { DateTime, Duration } from "luxon";
import { tryoutLobbyReminderSendQueue } from "../queues";

type JobData = {
	minutes: number;
};

const workerOptions: WorkerOptions = {
	connection: {
		host: process.env.REDIS_HOST || "localhost",
		port: +(process.env.REDIS_PORT || 6379),
		password: process.env.REDIS_PASSWORD,
	},
};

export function initializeTryoutLobbyReminderScheduleWorker() {
	const newWorker = new Worker<JobData>(
		"tryoutLobbyReminderSchedule",
		workerHandler,
		workerOptions,
	);

	newWorker.on("error", (error) => {
		container.logger.error(error);
	});

	return newWorker;
}

async function workerHandler(job: Job<JobData, void, string>) {
	const data = job.data;

	container.logger.debug("[Reminders] Scheduling tryout lobby reminders...");

	const currentDate = DateTime.now();
	const dateThreshold = currentDate.plus(
		Duration.fromObject({
			minutes: data.minutes,
		}),
	);

	const lobbies = await db.tryoutLobby.findMany({
		where: {
			schedule: {
				gt: currentDate.toJSDate(),
				lt: dateThreshold.toJSDate(),
			},
			reminder_status: "Pending",
		},
		include: {
			players: {
				select: {
					player: {
						select: {
							osu_username: true,
							osu_id: true,
							discord_id: true,
						},
					},
				},
			},
			stage: {
				include: {
					tryout: {
						select: {
							staff_channel_id: true,
							referee_role_id: true,
							player_channel_id: true,
						},
					},
				},
			},
			referee: {
				select: {
					osu_id: true,
					osu_username: true,
					discord_id: true,
				},
			},
			_count: {
				select: {
					players: true,
				},
			},
		},
	});

	if (lobbies.length === 0) {
		container.logger.debug("[Reminders] No reminders to schedule.");
		return;
	}

	const reminderJobs = lobbies.map((lobby) => {
		const players = lobby.players.map((player) => {
			return {
				osuId: player.player.osu_id,
				osuUsername: player.player.osu_username,
				discordId: player.player.discord_id,
			};
		});

		return {
			name: "tryoutLobbyReminderSend",
			data: {
				lobbyId: lobby.id,
				customId: lobby.custom_id,
				players,
				referee: lobby.referee,
				refereeRoleId: lobby.stage.tryout.referee_role_id,
				staffChannelId: lobby.stage.tryout.staff_channel_id,
				playerChannelId: lobby.stage.tryout.player_channel_id,
				schedule: DateTime.fromJSDate(lobby.schedule).toString(),
			},
		};
	});

	await db.tryoutLobby.updateMany({
		where: {
			id: {
				in: lobbies.map((lobby) => lobby.id),
			},
		},
		data: {
			reminder_status: "Scheduled",
		},
	});

	await tryoutLobbyReminderSendQueue.addBulk(reminderJobs);

	container.logger.info(
		`[Reminders] Scheduled ${reminderJobs.length} reminders.`,
	);
}
