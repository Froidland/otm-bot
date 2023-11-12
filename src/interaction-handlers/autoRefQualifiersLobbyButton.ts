import db from "@/db";
import { NoAccountEmbed } from "@/embeds";
import { hasTournamentOrganizerRole } from "@/utils";
import {
	InteractionHandler,
	InteractionHandlerTypes,
	PieceContext,
} from "@sapphire/framework";
import { ButtonInteraction, EmbedBuilder } from "discord.js";
import { DateTime } from "luxon";

export class AutoRefQualifiersLobby extends InteractionHandler {
	public constructor(context: PieceContext) {
		super(context, {
			name: "autoRefQualifiersLobbyButton",
			interactionHandlerType: InteractionHandlerTypes.Button,
		});
	}

	public override parse(interaction: ButtonInteraction) {
		if (interaction.customId !== "autoRefQualifiersLobbyButton") {
			return this.none();
		}

		return this.some();
	}

	public async run(interaction: ButtonInteraction) {
		await interaction.deferReply();

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

		if (!hasTournamentOrganizerRole(interaction, tournament)) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("You do not have permission to do this."),
				],
			});

			return;
		}

		const date = DateTime.fromJSDate(lobby.schedule);

		if (date.diffNow("minutes").minutes < 15) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"You cannot toggle auto ref if the lobby is in less than 15 minutes.",
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
					auto_ref: !lobby.auto_ref,
				},
			});
		} catch (error) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"An error occurred while updating the lobby. Please try again later.",
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
						`Successfully ${
							lobby.auto_ref ? "disabled" : "enabled"
						} auto ref for this lobby.`,
					),
			],
		});
	}
}
