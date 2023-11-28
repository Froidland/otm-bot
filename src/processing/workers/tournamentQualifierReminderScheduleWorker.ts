import db from "@/db";
import { container } from "@sapphire/pieces";
import { Job, Worker, WorkerOptions } from "bullmq";
import { DateTime } from "luxon";
import { tournamentQualifierReminderSendQueue } from "../queues";

type JobData = {
	minutes: number;
};

const workerOptions: WorkerOptions = {
	connection: {
		host: process.env.REDIS_HOST || "localhost",
		port: +(process.env.REDIS_PORT || 6379),
		username: process.env.REDIS_USER || "default",
		password: process.env.REDIS_PASSWORD,
	},
};

export function initializeTournamentQualifierReminderScheduleWorker() {
	const newWorker = new Worker<JobData>(
		"tournamentQualifierReminderSchedule",
		workerHandler,
		workerOptions,
	);

	container.logger.info(
		"Initialized tournament qualifier reminder schedule worker.",
	);

	newWorker.on("error", (error) => {
		container.logger.error(error);
	});

	return newWorker;
}

async function workerHandler(job: Job<JobData, void, string>) {
	const data = job.data;

	container.logger.debug(
		"[Reminders] Scheduling tournament qualifier reminders...",
	);

	const currentDate = DateTime.now();
	const dateThreshold = currentDate.plus({
		minutes: data.minutes,
	});

	const lobbies = await db.tournamentQualifierLobby.findMany({
		where: {
			schedule: {
				gt: currentDate.toJSDate(),
				lt: dateThreshold.toJSDate(),
			},
			reminder_status: "Pending",
		},
		include: {
			team: {
				include: {
					players: {
						include: {
							player: true,
						},
					},
				},
			},
			tournament_qualifier: {
				include: {
					tournament: {
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
		},
	});

	if (lobbies.length === 0) {
		container.logger.debug(
			"[Reminders] No tournament qualifier lobby reminders to schedule.",
		);

		return;
	}

	const reminderJobs = lobbies.map((lobby) => {
		const players = lobby.team.players.map((player) => {
			return {
				osuId: player.player.osu_id,
				osuUsername: player.player.osu_username,
				discordId: player.player.discord_id,
			};
		});

		return {
			name: "tournamentQualifierReminder",
			data: {
				lobbyId: lobby.id,
				teamName: lobby.team.name,
				players,
				referee: lobby.referee,
				refereeRoleId: lobby.tournament_qualifier.tournament.referee_role_id,
				staffChannelId: lobby.tournament_qualifier.tournament.staff_channel_id,
				playerChannelId:
					lobby.tournament_qualifier.tournament.player_channel_id,
				schedule: lobby.schedule.toISOString(),
			},
		};
	});

	await db.tournamentQualifierLobby.updateMany({
		where: {
			id: {
				in: lobbies.map((lobby) => lobby.id),
			},
		},
		data: {
			reminder_status: "Scheduled",
		},
	});

	await tournamentQualifierReminderSendQueue.addBulk(reminderJobs);

	container.logger.debug(
		`[Reminders] Scheduled ${reminderJobs.length} tournament qualifier lobby reminders.`,
	);
}
