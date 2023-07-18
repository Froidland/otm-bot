import db from "@/db";
import { NoAccountEmbed } from "@/embeds";
import { SubCommand } from "@/interfaces/subCommand";
import { logger } from "@/utils";
import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	SlashCommandSubcommandBuilder,
} from "discord.js";

const invite: SubCommand = {
	data: new SlashCommandSubcommandBuilder()
		.setName("invite")
		.setDescription("Invite a player to your team.")
		.addUserOption((option) =>
			option
				.setName("player")
				.setDescription("The player you want to invite.")
				.setRequired(true)
		),
	execute: async (interaction: ChatInputCommandInteraction) => {
		await interaction.deferReply({ ephemeral: true });

		const player = interaction.options.getUser("player", true);

		const user = await db.user.findFirst({
			where: {
				discordId: interaction.user.id,
			},
		});

		if (!user) {
			await interaction.editReply({
				embeds: [NoAccountEmbed],
			});

			return;
		}

		const tournament = await db.tournament.findFirst({
			where: {
				playerChannelId: interaction.channelId,
			},
		});

		if (!tournament) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid channel!")
						.setDescription(
							"This command can only be used in a player channel."
						),
				],
			});

			return;
		}

		const team = await db.team.findFirst({
			where: {
				tournamentId: tournament.id,
				ownerId: user.id,
			},
		});

		if (!team) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid team!")
						.setDescription(
							"You are not the owner of a team in this tournament. Only the owner of a team can invite players."
						),
				],
			});

			return;
		}

		const playerUser = await db.user.findFirst({
			where: {
				discordId: player.id,
			},
			include: {
				ownedTeams: {
					where: {
						tournamentId: tournament.id,
					},
				},
				teams: {
					where: {
						team: {
							tournamentId: tournament.id,
						},
					},
				},
			},
		});

		if (!playerUser) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid player!")
						.setDescription(
							"The player you are trying to invite does not have an account."
						),
				],
			});

			return;
		}

		if (playerUser.ownedTeams.length > 0 || playerUser.teams.length > 0) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid player!")
						.setDescription(
							"The player you are trying to invite is already in a team."
						),
				],
			});

			return;
		}

		try {
			await db.teamInvite.create({
				data: {
					teamId: team.id,
					playerId: playerUser.id,
				},
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Player invited!")
						.setDescription(
							`You have successfully invited ${interaction.user} to your team.`
						),
				],
			});

			// TODO: This should have a button to accept or decline the invite.
			await player.send({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("You have been invited to a team!")
						.setDescription(
							`${interaction.user} has invited you to their team for the ${tournament.name} tournament.`
						),
				],
			});

			logger.info(
				`User ${interaction.user.id} invited ${player.id} to their team.`
			);
		} catch (error) {
			logger.error(error);

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Something went wrong!")
						.setDescription(
							"An error occurred while trying to invite the player to your team. Please try again later."
						),
				],
			});
		}
	},
};

export default invite;
