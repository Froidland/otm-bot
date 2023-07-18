import { EmbedBuilder } from "discord.js";

export const InvalidTournamentChannel = new EmbedBuilder()
	.setColor("Red")
	.setTitle("Invalid channel!")
	.setDescription("This command needs to be run in a tournament channel.").data;
