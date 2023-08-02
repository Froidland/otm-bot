import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "@/interfaces/command";
import { subCommandGroups, subCommands } from "./subcommands";
import { create } from "./subcommands/create";

const tournament: Command = {
	data: new SlashCommandBuilder()
		.setName("tournament")
		.setDescription("Tournament management commands.")
		.addSubcommand(create.data)
		.setDMPermission(false),
	execute: async (interaction: ChatInputCommandInteraction) => {
		const groupName = interaction.options.getSubcommandGroup(false);
		const subCommandName = interaction.options.getSubcommand(true);

		if (groupName) {
			for (const group of subCommandGroups) {
				if (group.data.name === groupName) {
					for (const subcommand of group.subCommands) {
						if (subcommand.data.name === subCommandName) {
							await subcommand.execute(interaction);
							return;
						}
					}
				}
			}
		}

		for (const subCommand of subCommands) {
			if (subCommand.data.name === subCommandName) {
				await subCommand.execute(interaction);
				break;
			}
		}
	},
};

export default tournament;
