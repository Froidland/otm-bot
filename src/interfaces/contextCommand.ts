import {
	ContextMenuCommandBuilder,
	MessageContextMenuCommandInteraction,
	UserContextMenuCommandInteraction,
} from "discord.js";

export interface ContextCommand {
	data: ContextMenuCommandBuilder;
	execute: (interaction: MessageContextMenuCommandInteraction | UserContextMenuCommandInteraction) => Promise<void>;
}
