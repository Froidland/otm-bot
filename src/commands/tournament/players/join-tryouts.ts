import { ChatInputCommandInteraction, CommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "@/interfaces/command";

export const joinTryouts: Command = {
	data: new SlashCommandBuilder()
		.setName("join-tryouts")
		.setDescription("Joins a tryout."),
	execute: async (interaction: ChatInputCommandInteraction) => {
		await interaction.deferReply();


	},
};
