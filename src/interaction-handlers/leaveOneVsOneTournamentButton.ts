import db from "@/db";
import { NoAccountEmbed } from "@/embeds";
import {
	InteractionHandler,
	InteractionHandlerTypes,
	PieceContext,
} from "@sapphire/framework";
import { ButtonInteraction, EmbedBuilder } from "discord.js";

export class LeaveOneVsOneTournamentButton extends InteractionHandler {
	public constructor(context: PieceContext) {
		super(context, {
			name: "leaveOneVsOneTournamentButton",
			interactionHandlerType: InteractionHandlerTypes.Button,
		});
	}

	public override parse(interaction: ButtonInteraction) {
		if (interaction.customId !== "leaveOneVsOneTournamentButton") {
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
						creator_id: user.id,
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
							"The registration period for this tournament has ended. You can no longer leave this tournament.",
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
							"You can't leave a tournament you already played in.",
						),
				],
			});

			return;
		}

		try {
			const member = await interaction.guild.members.fetch(interaction.user.id);

			await member.roles.remove(tournament.player_role_id);

			await db.team.delete({
				where: {
					id: team.id,
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
							"An error occurred while leaving the tournament. Please try again later.",
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
					.setDescription("You have successfully left the tournament."),
			],
		});
	}
}
