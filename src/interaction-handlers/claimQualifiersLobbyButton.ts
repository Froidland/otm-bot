import db from "@/db";
import { NoAccountEmbed } from "@/embeds";
import { hasTournamentOrganizerRole, hasTournamentRefereeRole } from "@/utils";
import {
	InteractionHandler,
	InteractionHandlerTypes,
	PieceContext,
} from "@sapphire/framework";
import { ButtonInteraction, EmbedBuilder } from "discord.js";
import { DateTime } from "luxon";

export class ClaimQualifiersLobbyButton extends InteractionHandler {
	public constructor(context: PieceContext) {
		super(context, {
			name: "claimQualifiersLobbyButton",
			interactionHandlerType: InteractionHandlerTypes.Button,
		});
	}

	public override parse(interaction: ButtonInteraction) {
		if (interaction.customId !== "claimQualifiersLobbyButton") {
			return this.none();
		}

		return this.some();
	}

	public async run(interaction: ButtonInteraction) {
		await interaction.deferReply({ ephemeral: true });

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

		const lobby = await db.tournamentQualifierLobby.findFirst({
			where: {
				schedule_embed_message_id: interaction.message.id,
			},
			include: {
				tournament_qualifier: {
					include: {
						tournament: true,
					},
				},
				team: true,
			},
		});

		if (!lobby) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"This embed is no longer valid or the lobby no longer exists.",
						),
				],
			});

			return;
		}

		const tournament = lobby.tournament_qualifier.tournament;

		if (
			!hasTournamentRefereeRole(interaction, tournament) &&
			!hasTournamentOrganizerRole(interaction, tournament)
		) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("You do not have permission to claim this lobby."),
				],
			});

			return;
		}

		if (lobby.referee_id === user.id) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Yellow")
						.setTitle("Warning")
						.setDescription("You have already claimed this lobby."),
				],
			});

			return;
		}

		if (lobby.referee_id) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("This lobby has already been claimed."),
				],
			});

			return;
		}

		if (DateTime.fromJSDate(lobby.schedule).diffNow("minutes").minutes < 5) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"You cannot claim this lobby because it is starting soon or has already started.",
						),
				],
			});

			return;
		}

		try {
			await db.tournamentQualifierLobby.update({
				where: {
					id: lobby.id,
				},
				data: {
					referee_id: user.id,
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
							"An error occurred while claiming this lobby. Please try again later.",
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
						`You have successfully claimed the lobby for team \`${lobby.team.name}\`.`,
					),
			],
		});
	}
}
