import { ChatInputCommandInteraction, CommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "@/interfaces/command";

export const joinTournament: Command = {
	data: new SlashCommandBuilder()
		.setName("join-tournament")
		.setDescription("Joins a tournament. "),
	execute: async (interaction: ChatInputCommandInteraction) => {
		await interaction.deferReply();
	},
};
