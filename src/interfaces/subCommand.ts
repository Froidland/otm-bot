import {
	ChatInputCommandInteraction,
	SlashCommandSubcommandBuilder,
} from "discord.js";

export interface SubCommand {
	data: SlashCommandSubcommandBuilder;
	execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}
