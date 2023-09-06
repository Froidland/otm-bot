import db from "@/db";
import DiscordBot from "@/discordBot";
import { logger } from "@/utils";
import { EmbedBuilder } from "discord.js";
import { DateTime, Duration } from "luxon";
import { AsyncTask } from "toad-scheduler";

// TODO: Needs a revisit cause this looks too convoluted.
// TODO: Consider running these in a completely separate app/service.
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

				logger.info(
					`Sending ${lobbies.length} ${
						lobbies.length > 1 ? "reminders" : "reminder"
					}...`,
				);

				const fulfilledReminderLobbies = [];

				for (const lobby of lobbies) {
					if (lobby._count.players === 0) {
						logger.info(
							`Skipping lobby ${lobby.id} due to not having any players.`,
						);

						continue;
					}

					const messagePromises = [];
					let staffMessage =
						"The following players are registered for this lobby:\n\n";

					for (const player of lobby.players) {
						staffMessage += `• <@${player.player.discord_id}> | \`${player.player.osu_username}\` - \`!mp invite #${player.player.osu_id}\``;
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
								content: playerMentions.join(" "),
								embeds: [
									new EmbedBuilder()
										.setColor("Blue")
										.setTitle(
											`Lobby ${lobby.custom_id} starts ${DateTime.fromJSDate(
												lobby.schedule,
											)
												.setLocale("en-US")
												.toRelative()}!`,
										)
										.setDescription(
											lobby.referee
												? `The referee <@${lobby.referee.discord_id}> will make the lobby soon, make sure you are in-game to receive your invite. `
												: "The lobby will be made soon, make sure you are in-game to receive your invite.",
										),
								],
							}),
						);
					}

					if (staffChannel && staffChannel.isTextBased()) {
						messagePromises.push(
							staffChannel.send({
								content: lobby.referee
									? `<@${lobby.referee.discord_id}>`
									: `<@&${lobby.stage.tryout.referee_role_id}>`,
								embeds: [
									new EmbedBuilder()
										.setColor(lobby.referee ? "Blue" : "Red")
										.setTitle(
											`Lobby ${lobby.custom_id} starts ${DateTime.fromJSDate(
												lobby.schedule,
											)
												.setLocale("en-US")
												.toRelative()}` +
												(lobby.referee ? "!" : " and has no referee!"),
										)
										.setDescription(staffMessage),
								],
							}),
						);
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
