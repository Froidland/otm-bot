import type { TryoutLobby } from "@/bancho/store";
import { createTryoutLobby } from "@/bancho/utils";
import db from "@/db";
import { container } from "@sapphire/framework";
import { Job, Worker, WorkerOptions } from "bullmq";
import { DateTime } from "luxon";

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

export function initializeTryoutLobbyCreateWorker() {
	const newWorker = new Worker<JobData>(
		"tryoutLobbyCreate",
		workerHandler,
		workerOptions,
	);

	container.logger.info("Initialized tryout lobby create worker.");

	newWorker.on("error", (error) => {
		container.logger.error(error);
	});

	return newWorker;
}

async function workerHandler(job: Job<JobData, void, string>) {
	const data = job.data;

	const currentDate = DateTime.now();
	const dateThreshold = DateTime.now().plus({ minutes: data.minutes });

	container.logger.debug("[AutoRef] Checking for tryout lobbies...");

	const lobbies = await db.tryoutLobby.findMany({
		where: {
			schedule: {
				gt: currentDate.toJSDate(),
				lt: dateThreshold.toJSDate(),
			},
			auto_ref: true,
			status: "Pending",
		},
		include: {
			players: {
				include: {
					player: {
						select: {
							id: true,
							osu_id: true,
							osu_username: true,
							discord_id: true,
						},
					},
				},
			},
			referee: {
				select: {
					id: true,
					osu_id: true,
					osu_username: true,
					discord_id: true,
				},
			},
			stage: {
				include: {
					mappool: {
						select: {
							beatmap_id: true,
							pick_id: true,
							mods: true,
						},
					},
					tryout: {
						select: {
							id: true,
							acronym: true,
							staff_channel_id: true,
							player_channel_id: true,
							referee_role_id: true,
						},
					},
				},
			},
		},
	});

	if (lobbies.length === 0) {
		container.logger.debug(
			`[AutoRef] No tryout lobbies found in the next ${data.minutes} minutes. Skipping...`,
		);

		return;
	}

	container.logger.debug(
		`[AutoRef] Found ${lobbies.length} tryout lobbies. Attempting to create...`,
	);

	let createdCount = 0;

	for (const lobby of lobbies) {
		const mappool = lobby.stage.mappool;
		const mappoolOrder = lobby.stage.mappool_order.split(" ");

		if (mappoolOrder.length === 0) {
			container.logger.error(
				`[AutoRef] Could not find mappool order for lobby ${lobby.id}.`,
			);

			continue;
		}

		const tryout = lobby.stage.tryout;

		const referee = lobby.referee
			? {
					id: lobby.referee.id,
					osuId: lobby.referee.osu_id,
					osuUsername: lobby.referee.osu_username,
					discordId: lobby.referee.discord_id,
			  }
			: null;

		const staffChannelId = tryout.staff_channel_id;
		const playerChannelId = tryout.player_channel_id;

		const players = lobby.players.map((p) => {
			return {
				id: p.player.id,
				osuId: p.player.osu_id,
				osuUsername: p.player.osu_username,
				discordId: p.player.discord_id,
			};
		});

		const beatmaps = mappool.map((m) => {
			return {
				beatmapId: m.beatmap_id,
				pickId: m.pick_id,
				mods: m.mods,
			};
		});

		const lobbyData: TryoutLobby = {
			id: lobby.id,
			type: "tryout",
			name: `${tryout.acronym}: (Lobby ${lobby.custom_id}) vs (Tryouts)`,
			customId: lobby.custom_id,
			banchoId: null,
			players,
			referees: referee ? [referee] : [],
			mappool: beatmaps,
			mappoolQueue: mappoolOrder,
			staffNotifChannelId: staffChannelId,
			playerNotifChannelId: playerChannelId,
			refereeRoleId: tryout.referee_role_id,
			schedule: lobby.schedule.toISOString(),
			mappoolHistory: [],
			currentStartedAt: null,
			state: "initializing",
			initialOvertime: false,
		};

		container.logger.debug(`[AutoRef] Creating tryout lobby ${lobby.id}...`);

		const success = await createTryoutLobby(lobbyData);

		if (success) {
			createdCount++;
			continue;
		}

		break;
	}

	if (createdCount > 0) {
		container.logger.debug(`[AutoRef] Created ${createdCount} tryout lobbies.`);
	}
}
