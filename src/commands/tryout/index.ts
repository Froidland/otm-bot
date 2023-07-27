import {
	ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";
import { create } from "./subcommands/create";
import { Command } from "@/interfaces/command";
import { subCommandGroups, subCommands } from "./subcommands";
import embedGroup from "./subcommands/embed";
import lobbyGroup from "./subcommands/lobby";
import stageGroup from "./subcommands/stage";

// TODO: Research subcommand groups and implement them for the tryout-lobby and tryout-stage commands.
const tryout: Command = {
	data: new SlashCommandBuilder()
		.setName("tryout")
		.setDescription("Tryout management commands.")
		.addSubcommand(create.data)
		.addSubcommandGroup(embedGroup.data)
		.addSubcommandGroup(lobbyGroup.data)
		.addSubcommandGroup(stageGroup.data)
		.setDMPermission(false),
	execute: async (interaction: ChatInputCommandInteraction) => {
		const subCommandName = interaction.options.getSubcommand(true);
		const groupName = interaction.options.getSubcommandGroup(false);

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
				return;
			}
		}
	},
};

export default tryout;
