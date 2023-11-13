import db from "@/db";
import { NoAccountEmbed } from "@/embeds";
import {
	InteractionHandler,
	InteractionHandlerTypes,
	PieceContext,
} from "@sapphire/framework";
import { ButtonInteraction, EmbedBuilder } from "discord.js";

export class LeaveTeamVsTeamTournamentButton extends InteractionHandler {
	public constructor(context: PieceContext) {
		super(context, {
			name: "leaveTeamVsTeamTournamentButton",
			interactionHandlerType: InteractionHandlerTypes.Button,
		});
	}

	public override parse(interaction: ButtonInteraction) {
		if (interaction.customId !== "leaveTeamVsTeamTournamentButton") {
			return this.none();
		}

		return this.some();
	}

	public async run(interaction: ButtonInteraction) {
		await interaction.deferReply({
			ephemeral: true,
		});

		if (!interaction.guild) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("This command can only be used in a server."),
				],
			});

			return;
		}

		const user = await db.user.findFirst({
			where: {
				discord_id: interaction.user.id,
			},
		});

		if (!user) {
			await interaction.editReply({
				embeds: [NoAccountEmbed],
			});

			return;
		}

		const tournament = await db.tournament.findFirst({
			where: {
				embed_message_id: interaction.message.id,
			},
			include: {
				teams: {
					where: {
						players: {
							some: {
								player: {
									id: user.id,
								},
							},
						},
					},
					include: {
						players: {
							include: {
								player: true,
							},
						},
						creator: true,
					},
				},
			},
		});

		if (!tournament) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"This tournament does not exist or the embed is no longer valid.",
						),
				],
			});

			return;
		}

		if (tournament.teams.length < 1) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"You cannot leave a tournament that you are not in.",
						),
				],
			});

			return;
		}

		const team = tournament.teams[0];

		if (tournament.registration_end_date < new Date()) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"The registration period for this tournament has ended. You can no longer leave the tournament.",
						),
				],
			});

			return;
		}

		if (team.qualifier_played) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"You cannot leave a tournament that your team has already played in.",
						),
				],
			});

			return;
		}

		// TODO: Add confirmation messages.
		if (team.creator_id === user.id) {
			try {
				await db.team.delete({
					where: {
						id: team.id,
					},
				});

				for (const player of team.players) {
					const member = await interaction.guild.members.fetch(
						player.player.discord_id!,
					);

					await member.roles.remove(tournament.player_role_id);
				}
			} catch (error) {
				this.container.logger.error(error);

				await interaction.editReply({
					embeds: [
						new EmbedBuilder()
							.setColor("Red")
							.setTitle("Error")
							.setDescription(
								"There was an error leaving the tournament. Please try again.",
							),
					],
				});

				return;
			}

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Success")
						.setDescription(
							"You have successfully left the tournament. Your team has been disbanded.",
						),
				],
			});

			for (const player of team.players) {
				if (player.user_id === user.id) {
					continue;
				}

				const discordUser = await this.container.client.users.fetch(
					player.player.discord_id!,
				);

				await discordUser.send({
					embeds: [
						new EmbedBuilder()
							.setColor("Red")
							.setTitle("Team disbanded")
							.setDescription(
								`The captain of your team for tournament \`${tournament.name}\` has disbanded the team.`,
							),
					],
				});
			}
		} else {
			try {
				const member = await interaction.guild.members.fetch(
					interaction.user.id,
				);

				await member.roles.remove(tournament.player_role_id);

				await db.team.update({
					where: {
						id: team.id,
					},
					data: {
						players: {
							delete: {
								team_id_user_id: {
									team_id: team.id,
									user_id: user.id,
								},
							},
						},
					},
				});
			} catch (error) {
				this.container.logger.error(error);

				await interaction.editReply({
					embeds: [
						new EmbedBuilder()
							.setColor("Red")
							.setTitle("Error")
							.setDescription(
								"There was an error leaving the tournament. Please try again.",
							),
					],
				});

				return;
			}

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Success")
						.setDescription(
							"You have successfully left the tournament. You have been removed from your team.",
						),
				],
			});

			const captain = await this.container.client.users.fetch(
				team.creator.discord_id!,
			);

			await captain.send({
				embeds: [
					new EmbedBuilder()
						.setColor("Yellow")
						.setTitle("Player left")
						.setDescription(
							`<@${user.discord_id}> (\`${user.osu_username}\` - \`#${user.osu_id}\`) has left your team for tournament \`${tournament.name}\`.)`,
						),
				],
			});
		}
	}
}
