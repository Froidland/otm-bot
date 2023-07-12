import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "@/interfaces/command";

export const joinTryout: Command = {
	data: new SlashCommandBuilder()
		.setName("join-tryout")
		.setDescription("Joins a tryout."),
	execute: async (interaction: ChatInputCommandInteraction) => {
		await interaction.deferReply();


	},
};
