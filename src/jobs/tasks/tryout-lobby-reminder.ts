import db from "@/db";
import DiscordBot from "@/discordBot";
import { logger } from "@/utils";
import { DateTime, Duration } from "luxon";
import { AsyncTask } from "toad-scheduler";

// TODO: Needs a revisit cause this looks too convoluted.
const tryoutLobbyReminderTask = new AsyncTask(
	"tryout-lobby-reminder",
	async () => {
		logger.info("Checking for pending reminders...");
		const currentDate = DateTime.now();

		const dateThreshold = currentDate.plus(
			Duration.fromObject({
				minutes: 15,
			}),
		);

		db.tryoutLobby
			.findMany({
				where: {
					schedule: {
						gt: currentDate.toJSDate(),
						lt: dateThreshold.toJSDate(),
					},
					is_reminder_sent: false,
				},
				include: {
					players: {
						select: {
							player: {
								select: {
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
					referee: true,
					_count: {
						select: {
							players: true,
						},
					},
				},
			})
			.then(async (lobbies) => {
				if (lobbies.length === 0) {
					logger.info("No pending reminders.");
					return;
				}

				logger.info(`Seding ${lobbies.length} reminders...`);
				const fulfilledReminderLobbies = [];

				for (const lobby of lobbies) {
					const messagePromises = [];
					if (lobby._count.players === 0) {
						logger.info(
							`Skipping lobby ${lobby.id} due to not having any players.`,
						);
						continue;
					}

					const playerMentions = lobby.players.map((player) => {
						return `<@${player.player.discord_id}>`;
					});

					const playerChannel = await DiscordBot.channels.fetch(
						lobby.stage.tryout.player_channel_id,
					);

					const staffChannel = await DiscordBot.channels.fetch(
						lobby.stage.tryout.staff_channel_id,
					);

					if (playerChannel && playerChannel.isTextBased()) {
						messagePromises.push(
							playerChannel.send({
								content: `Lobby \`${lobby.custom_id}\` starts in <t:${
									lobby.schedule.getTime() / 1000
								}:R>\n${playerMentions.join(" ")}`,
							}),
						);
					}

					if (staffChannel && staffChannel.isTextBased()) {
						if (lobby.referee) {
							messagePromises.push(
								staffChannel.send({
									content: `Lobby \`${lobby.custom_id}\` starts in <t:${
										lobby.schedule.getTime() / 1000
									}:R>, make sure you are able to ref it or unclaim it so that another referee can take it`,
								}),
							);
						} else {
							messagePromises.push(
								staffChannel.send({
									content: `Lobby \`${lobby.custom_id}\` starts in <t:${
										lobby.schedule.getTime() / 1000
									}:R> and has no referee. <@${
										lobby.stage.tryout.referee_role_id
									}>`,
								}),
							);
						}
					}

					fulfilledReminderLobbies.push(lobby.id);
				}

				return fulfilledReminderLobbies;
			})
			.then(async (fulfilledReminders) => {
				if (!fulfilledReminders || fulfilledReminders.length === 0) {
					return;
				}

				await db.tryoutLobby.updateMany({
					where: {
						id: {
							in: fulfilledReminders,
						},
					},
					data: {
						is_reminder_sent: true,
					},
				});
			});
	},
	(error: Error) => logger.error(error),
);

export default tryoutLobbyReminderTask;
