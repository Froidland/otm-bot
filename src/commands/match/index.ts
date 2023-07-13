import { Command } from "@/interfaces/command";
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import subCommands from "./subcommands";
import create from "./subcommands/create";

const match: Command = {
	data: new SlashCommandBuilder()
		.setName("match")
		.setDescription("Match management commands.")
		.addSubcommand(create.data)
		.setDMPermission(false),
	execute: async (interaction: ChatInputCommandInteraction) => {
		const subCommandName = interaction.options.getSubcommand(true);

		for (const subCommand of subCommands) {
			if (subCommand.data.name === subCommandName) {
				await subCommand.execute(interaction);
				return;
			}
		}
	},
};

export default match;
