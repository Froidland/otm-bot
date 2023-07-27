import { SlashCommandSubcommandGroupBuilder } from "discord.js";
import { SubCommand } from "./subCommand";

export interface SubCommandGroup {
	data: SlashCommandSubcommandGroupBuilder;
	subCommands: SubCommand[];
}
