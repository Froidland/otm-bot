import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "@/interfaces/command";

export const template: Command = {
	data: new SlashCommandBuilder()
		.setName("template")
		.setDescription("Template"),
	execute: async (interaction: ChatInputCommandInteraction) => {},
};
