import { QualifierLobby } from "@/bancho/store";
import { createQualifierLobby } from "@/bancho/utils";
import db from "@/db";
import { container } from "@sapphire/pieces";
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

export function initializeTournamentQualifierCreateWorker() {
	const newWorker = new Worker<JobData>(
		"tournamentQualifierCreate",
		workerHandler,
		workerOptions,
	);

	container.logger.info("Initialized tournament qualifier create worker.");

	newWorker.on("error", (error) => {
		container.logger.error(error);
	});

	return newWorker;
}

async function workerHandler(job: Job<JobData, void, string>) {
	const data = job.data;

	const currentDate = DateTime.now();
	const dateThreshold = DateTime.now().plus({ minutes: data.minutes });

	container.logger.debug(
		"[AutoRef] Checking for tournament qualifier lobbies...",
	);

	const lobbies = await db.tournamentQualifierLobby.findMany({
		where: {
			schedule: {
				gt: currentDate.toJSDate(),
				lt: dateThreshold.toJSDate(),
			},
			auto_ref: true,
			status: "Pending",
		},
		include: {
			team: {
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
					creator: {
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
			tournament_qualifier: {
				include: {
					mappool: {
						select: {
							beatmap_id: true,
							pick_id: true,
							mods: true,
						},
					},
					tournament: {
						select: {
							id: true,
							acronym: true,
							staff_channel_id: true,
							player_channel_id: true,
							referee_role_id: true,
							lobby_team_size: true,
						},
					},
				},
			},
		},
	});

	if (lobbies.length === 0) {
		container.logger.debug(
			`[AutoRef] No tournament qualifier lobbies found in the next ${data.minutes} minutes. Skipping...`,
		);

		return;
	}

	container.logger.debug(
		`[AutoRef] Found ${lobbies.length} tournament qualifier lobbies. Attempting to create...`,
	);

	let createdCount = 0;

	for (const lobby of lobbies) {
		const mappool = lobby.tournament_qualifier.mappool;
		const mappoolOrder = lobby.tournament_qualifier.mappool_order.split(" ");

		if (mappoolOrder.length === 0) {
			container.logger.warn(
				`[AutoRef] Tournament qualifier lobby ${lobby.id} has no mappool order set. Skipping...`,
			);

			continue;
		}

		const tournament = lobby.tournament_qualifier.tournament;

		const referee = lobby.referee
			? {
					id: lobby.referee.id,
					osuId: lobby.referee.osu_id,
					osuUsername: lobby.referee.osu_username,
					discordId: lobby.referee.discord_id,
			  }
			: null;

		const staffChannelId = tournament.staff_channel_id;
		const playerChannelId = tournament.player_channel_id;

		const captain = {
			id: lobby.team.creator.id,
			osuId: lobby.team.creator.osu_id,
			osuUsername: lobby.team.creator.osu_username,
			discordId: lobby.team.creator.discord_id,
		};

		const players = lobby.team.players.map((player) => {
			return {
				id: player.player.id,
				osuId: player.player.osu_id,
				osuUsername: player.player.osu_username,
				discordId: player.player.discord_id,
			};
		});

		const beatmaps = mappool.map((m) => {
			return {
				beatmapId: m.beatmap_id,
				pickId: m.pick_id,
				mods: m.mods,
			};
		});

		const lobbyData: QualifierLobby = {
			id: lobby.id,
			type: "qualifier",
			name: `${tournament.acronym}: (${lobby.team.name}) vs (Qualifiers)`,
			teamName: lobby.team.name,
			banchoId: null,
			captain,
			players,
			referees: referee ? [referee] : [],
			mappool: beatmaps,
			mappoolQueue: mappoolOrder,
			staffNotifChannelId: staffChannelId,
			playerNotifChannelId: playerChannelId,
			refereeRoleId: tournament.referee_role_id,
			schedule: lobby.schedule.toISOString(),
			mappoolHistory: [],
			currentStartedAt: null,
			state: "initializing",
			initialOvertime: false,
			inLobbyPlayerCount: tournament.lobby_team_size,
		};

		container.logger.debug(
			`[AutoRef] Creating tournament qualifier lobby ${lobby.id}...`,
		);

		const success = await createQualifierLobby(lobbyData);

		if (success) {
			createdCount++;
			continue;
		}

		break;
	}

	if (createdCount > 0) {
		container.logger.info(
			`[AutoRef] Created ${createdCount} tournament qualifier lobbies.`,
		);
	}
}
