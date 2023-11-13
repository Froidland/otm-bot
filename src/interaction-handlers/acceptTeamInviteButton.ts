import db from "@/db";
import { NoAccountEmbed } from "@/embeds";
import {
	InteractionHandler,
	InteractionHandlerTypes,
	PieceContext,
} from "@sapphire/framework";
import { EmbedBuilder, type ButtonInteraction } from "discord.js";

export class AcceptTeamInviteButton extends InteractionHandler {
	public constructor(context: PieceContext) {
		super(context, {
			name: "acceptTeamInviteButton",
			interactionHandlerType: InteractionHandlerTypes.Button,
		});
	}

	public override parse(interaction: ButtonInteraction) {
		if (interaction.customId !== "acceptTeamInviteButton") {
			return this.none();
		}

		return this.some();
	}

	public async run(interaction: ButtonInteraction) {
		await interaction.deferReply();

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
			include: {
				team_invites: {
					where: {
						embed_message_id: interaction.message.id,
					},
					include: {
						team: {
							include: {
								tournament: true,
								players: true,
								creator: true,
							},
						},
					},
				},
			},
		});

		if (!user) {
			await interaction.editReply({
				embeds: [NoAccountEmbed],
			});

			return;
		}

		if (user.team_invites.length < 1) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid invite")
						.setDescription("This invite is no longer valid."),
				],
			});

			return;
		}

		if (user.team_invites[0].status !== "Pending") {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid invite")
						.setDescription("You have already responded to this invite."),
				],
			});

			return;
		}

		const tournament = user.team_invites[0].team.tournament;

		if (tournament.registration_end_date < new Date()) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid invite")
						.setDescription(
							"The registration period for the tournament has ended. This invite is no longer valid.",
						),
				],
			});

			return;
		}

		const team = user.team_invites[0].team;

		if (team.players.length >= tournament.max_team_size) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid invite")
						.setDescription("The team that invited you is full."),
				],
			});

			return;
		}

		if (team.players.some((p) => p.user_id === user.id)) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid invite")
						.setDescription("You are already in this team."),
				],
			});

			return;
		}

		try {
			const member = await interaction.guild.members.fetch(interaction.user.id);

			await member.roles.add(tournament.player_role_id);

			await db.user.update({
				where: {
					id: user.id,
				},
				data: {
					teams: {
						create: {
							team_id: team.id,
						},
					},
					team_invites: {
						update: {
							where: {
								id: user.team_invites[0].id,
							},
							data: {
								status: "Accepted",
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
							"An error occurred while trying to accept the invite. Please try again later.",
						),
				],
			});

			return;
		}

		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setColor("Green")
					.setTitle("Invite accepted")
					.setDescription(
						`You have successfully accepted the invite to join **${team.name}**.`,
					),
			],
		});

		try {
			const captain = await this.container.client.users.fetch(
				team.creator.discord_id!,
			);

			await captain.send({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Player joined")
						.setDescription(
							`<@${user.discord_id}> (\`${user.osu_username}\` - \`#${user.osu_id}\`) has accepted your invite to join \`${team.name}\` for tournament \`${tournament.name}\`.`,
						),
				],
			});
		} catch (error) {
			this.container.logger.error(error);
		}
	}
}
