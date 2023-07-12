import {
	ChatInputCommandInteraction,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js";
import { create } from "./subcommands/create";
import { Command } from "@/interfaces/command";
import subCommands from "./subcommands";

const tryout: Command = {
	data: new SlashCommandBuilder()
		.setName("tryout")
		.setDescription("Tryout management commands.")
		.addSubcommand(create.data)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
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

export default tryout;
