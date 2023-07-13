import { Command } from "@/interfaces/command";
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import subCommands from "./subcommands";
import create from "./subcommands/create";

const team: Command = {
	data: new SlashCommandBuilder()
		.setName("team")
		.setDescription("Team management commands.")
		.addSubcommand(create.data)
		.setDMPermission(true),
	execute: async (interaction: ChatInputCommandInteraction) => {
		const subCommandName = interaction.options.getSubcommand();

		for (const subCommand of subCommands) {
			if (subCommand.data.name === subCommandName) {
				await subCommand.execute(interaction);
				return;
			}
		}
	},
};

export default team;
