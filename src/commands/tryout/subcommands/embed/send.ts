import { SubCommand } from "@/interfaces/subCommand";
import {
	ChannelType,
	ChatInputCommandInteraction,
	SlashCommandSubcommandBuilder,
} from "discord.js";

export const send: SubCommand = {
	data: new SlashCommandSubcommandBuilder()
		.setName("send-embed")
		.setDescription(
			"Resends the tryout embed to the specified channel, deleting the old one."
		)
		.addChannelOption((option) =>
			option
				.setName("channel")
				.setDescription("The channel where the tryout embed will be sent.")
				.setRequired(true)
				.addChannelTypes(ChannelType.GuildText)
		),
	execute: async (interaction: ChatInputCommandInteraction) => {
		
	},
};
