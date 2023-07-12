import { SubCommand } from "@/interfaces/subCommand";
import { SlashCommandSubcommandBuilder } from "discord.js";

const join: SubCommand = {
	data: new SlashCommandSubcommandBuilder()
		.setName("join")
		.setDescription("Join a tryout."),
	execute: async () => {},
};
