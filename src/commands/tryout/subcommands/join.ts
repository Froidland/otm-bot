import { getUser } from "@/commands/utils";
import db from "@/db";
import { NoAccountEmbed } from "@/embeds";
import { SubCommand } from "@/interfaces/subCommand";
import {
	ChatInputCommandInteraction,
	SlashCommandSubcommandBuilder,
} from "discord.js";

// TODO: Implement this command.
//? Ideally you join a tryout first, then you can join a lobby which corresponds to a stage that is currently active.
//? Tryouts will be able to have restrictions, like only players with a certain role can join, or players from a specific country.
//! This commands has to be executed in a player-dedicated channel
const join: SubCommand = {
	data: new SlashCommandSubcommandBuilder()
		.setName("join")
		.setDescription("Join a tryout."),
	execute: async (interaction: ChatInputCommandInteraction) => {
		await interaction.deferReply({
			ephemeral: true,
		});

		const user = await getUser(interaction);

		if (!user) {
			await interaction.editReply({
				embeds: [NoAccountEmbed],
			});

			return;
		}

		/* const tryout = await db.tryouts.findOne({
			where: {
				
			}
		}) */
	},
};
