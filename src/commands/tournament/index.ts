import {
	ChatInputCommandInteraction,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js";
import { Command } from "@/interfaces/command";
import subCommands from "./subcommands";
import { create } from "./subcommands/create";

const tournament: Command = {
	data: new SlashCommandBuilder()
		.setName("tournament")
		.setDescription("Tournament management commands.")
		.addSubcommand(create.data)
		.setDMPermission(false),
	execute: async (interaction: ChatInputCommandInteraction) => {
		await interaction.deferReply();
		const subCommandName = interaction.options.getSubcommand(true);

		for (const subCommand of subCommands) {
			if (subCommand.data.name === subCommandName) {
				await subCommand.execute(interaction);
				break;
			}
		}
	},
};

export default tournament;
