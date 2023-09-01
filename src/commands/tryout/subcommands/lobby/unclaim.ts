import db from "@/db";
import { NoAccountEmbed } from "@/embeds";
import { SubCommand } from "@/interfaces";
import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	SlashCommandSubcommandBuilder,
} from "discord.js";
import { isUserTryoutReferee } from "@/utils/discordUtils";
import { logger } from "@/utils";

export const unclaim: SubCommand = {
	data: new SlashCommandSubcommandBuilder()
		.setName("unclaim")
		.setDescription("Unclaim a lobby as a referee.")
		.addStringOption((option) =>
			option
				.setName("lobby-id")
				.setDescription("The ID of the lobby to unclaim.")
				.setRequired(true),
		),
	execute: async (interaction: ChatInputCommandInteraction) => {
		await interaction.deferReply();

		const lobbyId = interaction.options
			.getString("lobby-id", true)
			.toUpperCase();

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

		const tryout = await db.tryout.findFirst({
			where: {
				staff_channel_id: interaction.channel?.id,
			},
			include: {
				stages: {
					where: {
						lobbies: {
							some: {
								custom_id: lobbyId,
							},
						},
					},
					include: {
						lobbies: {
							where: {
								custom_id: lobbyId,
							},
							include: {
								referee: true,
							},
						},
					},
				},
			},
		});

		if (!tryout) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"This channel is not a staff channel for a tryout.",
						),
				],
			});

			return;
		}

		if (!isUserTryoutReferee(interaction, tryout)) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"You are not a referee for this tryout. Please contact an organizer if you believe this is a mistake.",
						),
				],
			});

			return;
		}

		if (tryout.stages.length < 1) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("No lobbies were found for the provided ID."),
				],
			});

			return;
		}

		const lobby = tryout.stages[0].lobbies[0];

		if (lobby.referee && lobby.referee_id !== user.id) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Already claimed!")
						.setDescription(
							`This lobby is claimed by <@${lobby.referee.discord_id}>.`,
						),
				],
			});

			return;
		}

		try {
			await db.tryoutLobby.update({
				where: {
					id: lobby.id,
				},
				data: {
					referee_id: null,
				},
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Lobby unclaimed!")
						.setDescription(
							`You have successfully unclaimed lobby \`${lobby.custom_id}\`.`,
						),
				],
			});
		} catch (error) {
			logger.error(error);

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"An error occurred while trying to unclaim this lobby. Please try again later or contact an organizer if this issue persists.",
						),
				],
			});
		}
	},
};
