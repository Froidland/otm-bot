import { banchoLobbies } from "@/bancho/store";
import db from "@/db";
import { NoAccountEmbed } from "@/embeds";
import { hasTournamentOrganizerRole, hasTournamentRefereeRole } from "@/utils";
import {
	InteractionHandler,
	InteractionHandlerTypes,
	PieceContext,
} from "@sapphire/framework";
import { ButtonInteraction, EmbedBuilder } from "discord.js";

export class AddRefQualifiersLobbyButton extends InteractionHandler {
	public constructor(context: PieceContext) {
		super(context, {
			name: "addRefQualifiersLobbyButton",
			interactionHandlerType: InteractionHandlerTypes.Button,
		});
	}

	public override parse(interaction: ButtonInteraction) {
		if (interaction.customId !== "addRefQualifiersLobbyButton") {
			return this.none();
		}

		return this.some();
	}

	public async run(interaction: ButtonInteraction) {
		await interaction.deferReply({
			ephemeral: true,
		});

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
				staff_embed_message_id: interaction.message.id,
			},
			include: {
				tournament_qualifier: {
					include: {
						tournament: true,
					},
				},
			},
		});

		if (!lobby) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"This lobby no longer exists or the embed is invalid.",
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
						.setDescription(
							"You do not have permission to add yourself to this lobby.",
						),
				],
			});

			return;
		}

		const ongoingLobby = banchoLobbies.find((l) => l.id === lobby.id);

		if (!ongoingLobby) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("This lobby is longer active."),
				],
			});

			return;
		}

		if (ongoingLobby.referees.some((r) => r.osuId === user.osu_id)) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("You are already set as a referee for this lobby."),
				],
			});

			return;
		}

		const banchoChannel = this.container.bancho.getChannel(
			`#mp_${ongoingLobby.banchoId}}`,
		);
		ongoingLobby.referees.push({
			osuId: user.osu_id,
			osuUsername: user.osu_username,
			discordId: user.discord_id,
		});

		await banchoChannel.sendMessage(`!mp addref #${user.osu_id}`);

		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setColor("Green")
					.setTitle("Success")
					.setDescription("You have been added as a referee for this lobby."),
			],
		});
	}
}
