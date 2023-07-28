import db from "@/db";
import { NoAccountEmbed } from "@/embeds";
import { SubCommand } from "@/interfaces";
import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	SlashCommandSubcommandBuilder,
} from "discord.js";

export const claim: SubCommand = {
	data: new SlashCommandSubcommandBuilder()
		.setName("claim")
		.setDescription("Claim a lobby as a referee.")
		.addStringOption((option) =>
			option
				.setName("lobby-id")
				.setDescription("The ID of the lobby to claim.")
				.setRequired(true)
		),
	execute: async (interaction: ChatInputCommandInteraction) => {
		await interaction.deferReply();

		const user = await db.user.findFirst({
			where: {
				discordId: interaction.user.id,
			},
		});

		if (!user) {
			await interaction.editReply({
				embeds: [NoAccountEmbed],
			});

			return;
		}

		const lobbyId = interaction.options.getString("lobby-id", true);

		//? Get the tryout for the current staff channel and include any lobbies that match the lobby ID.
		const tryout = await db.tryout.findFirst({
			where: {
				staffChannelId: interaction.channelId,
			},
			include: {
				stages: {
					where: {
						lobbies: {
							some: {
								id: lobbyId,
							},
						},
					},
					include: {
						lobbies: {
							where: {
								customId: lobbyId,
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
							"This channel is not a staff channel for a tryout."
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

		if (lobby.refereeId) {
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

		try {
			await db.tryoutLobby.update({
				where: {
					id: lobby.id,
				},
				data: {
					refereeId: user.id,
				},
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Success")
						.setDescription(
							`You have successfully claimed the lobby ${lobby.customId}.`
						),
				],
			});
		} catch (error) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"An error occurred while claiming the lobby. Please try again later."
						),
				],
			});

			return;
		}
	},
};
