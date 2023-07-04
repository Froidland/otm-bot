import {
	ChatInputCommandInteraction,
	CommandInteraction,
	EmbedBuilder,
	SlashCommandBuilder,
} from "discord.js";
import { Command } from "@/interfaces/command";
import db from "@/db";

export const joinLobby: Command = {
	data: new SlashCommandBuilder()
		.setName("join-lobby")
		.setDescription(
			"Joins a lobby. If you are the captain of your team, this will affect your team's lobby."
		)
		.addStringOption((option) =>
			option
				.setName("lobby-id")
				.setDescription("The ID of the lobby you want to join.")
				.setRequired(true)
		),
	execute: async (interaction: ChatInputCommandInteraction) => {
		await interaction.deferReply();

		const lobbyId = interaction.options.get("lobby-id", true).value as string;

		const user = await db.users.findOne({
			where: {
				discordId: interaction.user.id,
			},
		});

		if (!user) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"You don't have an account. Please use the `/link` command to link your osu! account."
						),
				],
			});

			return;
		}

		const lobby = await db.lobbies.findOne({
			where: {
				tournament: [
					{
						scheduleChannelId: interaction.channelId,
					},
					{
						refereeChannelId: interaction.channelId,
					},
					{
						mappoolerChannelId: interaction.channelId,
					},
					{
						staffChannelId: interaction.channelId,
					},
					{
						playerChannelId: interaction.channelId,
					},
				],
				customId: lobbyId,
			},
			relations: ["tournament"],
		});

		if (!lobby) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("This lobby does not exist."),
				],
			});

			return;
		}

		if (lobby.tournament.type === "Tryouts") {

		}
	},
};
