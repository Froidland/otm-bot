import db, { TournamentStage } from "@/db";
import {
	InvalidDateTime,
	InvalidTournamentChannel,
	NoAccountEmbed,
} from "@/embeds";
import { NoStaffRole } from "@/embeds/errors/noStaffRole";
import { isUserTournamentReferee, isUserTournamentStaff } from "@/utils";
import { createId } from "@paralleldrive/cuid2";
import { ApplyOptions } from "@sapphire/decorators";
import { Subcommand } from "@sapphire/plugin-subcommands";
import { EmbedBuilder } from "discord.js";
import { DateTime } from "luxon";

@ApplyOptions<Subcommand.Options>({
	description: "Commands for managing tournament matches.",
	subcommands: [
		{
			name: "create",
			chatInputRun: "chatInputRunCreate",
		},
		{
			name: "claim",
			chatInputRun: "chatInputRunClaim",
		},
	],
})
export class MatchCommand extends Subcommand {
	public override registerApplicationCommands(registry: Subcommand.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
				.addSubcommand((builder) =>
					builder
						.setName("create")
						.setDescription("Create a new match.")
						.addStringOption((option) =>
							option
								.setName("custom-id")
								.setDescription(
									'The custom ID of the match. Example: "A12" (Has to be unique for the tournament)',
								)
								.setRequired(true),
						)
						.addStringOption((option) =>
							option
								.setName("schedule")
								.setDescription(
									'The schedule of the match in UTC. Format: "YYYY-MM-DD HH:MM"',
								)
								.setRequired(true),
						)
						.addStringOption((option) =>
							option
								.setName("red-team")
								.setDescription("The unique ID of the first team in the match.")
								.setRequired(true),
						)
						.addStringOption((option) =>
							option
								.setName("blue-team")
								.setDescription(
									"The unique ID of the second team in the match.",
								)
								.setRequired(true),
						)
						.addStringOption((option) =>
							option
								.setName("stage")
								.setDescription("The stage of the match.")
								.addChoices(
									{
										name: "Group Stage",
										value: "Groups",
									},
									{
										name: "Round of 256",
										value: "RoundOf256",
									},
									{
										name: "Round of 128",
										value: "RoundOf128",
									},
									{
										name: "Round of 64",
										value: "RoundOf64",
									},
									{
										name: "Round of 32",
										value: "RoundOf32",
									},
									{
										name: "Round of 16",
										value: "RoundOf16",
									},
									{
										name: "Quarterfinals",
										value: "Quarterfinals",
									},
									{
										name: "Semifinals",
										value: "Semifinals",
									},
									{
										name: "Finals",
										value: "Finals",
									},
									{
										name: "Grand Finals",
										value: "GrandFinals",
									},
								)
								.setRequired(true),
						),
				)
				.addSubcommand((builder) =>
					builder
						.setName("claim")
						.setDescription("Claim a match.")
						.addStringOption((option) =>
							option
								.setName("match-id")
								.setDescription("The ID of the match you want to claim.")
								.setRequired(true),
						),
				),
		);
	}

	public async chatInputRunCreate(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		await interaction.deferReply();

		const id = createId();

		const user = await db.user.findFirst({
			where: {
				discord_id: interaction.user.id,
			},
		});

		if (!user) {
			await interaction.editReply({
				embeds: [NoAccountEmbed],
			});

			return;
		}

		const redTeamId = interaction.options.getString("red-team", true);
		const blueTeamId = interaction.options.getString("blue-team", true);

		if (redTeamId === blueTeamId) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid team IDs.")
						.setDescription(
							"The team IDs you provided are the same. Please provide different team IDs.",
						),
				],
			});

			return;
		}

		const customId = interaction.options.getString("custom-id", true);

		const tournament = await db.tournament.findFirst({
			where: {
				staff_channel_id: interaction.channelId,
			},
		});

		if (!tournament) {
			await interaction.editReply({
				embeds: [InvalidTournamentChannel],
			});

			return;
		}

		if (!isUserTournamentStaff(interaction, tournament)) {
			await interaction.editReply({
				embeds: [NoStaffRole],
			});
		}

		const existingMatch = await db.match.findFirst({
			where: {
				tournament: {
					id: tournament.id,
				},
				custom_id: customId,
			},
		});

		if (existingMatch) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid custom ID.")
						.setDescription(
							"The custom ID you provided is already in use. Please provide a different custom ID.",
						),
				],
			});

			return;
		}

		const redTeam = await db.team.findFirst({
			where: {
				id: redTeamId,
				tournament: {
					staff_channel_id: interaction.channelId,
				},
			},
		});

		if (!redTeam) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid team ID.")
						.setDescription(
							"The team ID you provided for the red team is invalid or the team is not participating in this tournament.",
						),
				],
			});

			return;
		}

		const blueTeam = await db.team.findFirst({
			where: {
				id: blueTeamId,
				tournament: {
					staff_channel_id: interaction.channelId,
				},
			},
		});

		if (!blueTeam) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid team ID.")
						.setDescription(
							"The team ID you provided for the blue team is invalid or the team is not participating in this tournament.",
						),
				],
			});

			return;
		}

		const stage = interaction.options.getString(
			"stage",
			true,
		) as TournamentStage;

		const schedule = DateTime.fromFormat(
			interaction.options.getString("schedule", true),
			"yyyy-MM-dd HH:mm",
			{ zone: "utc" },
		);

		if (!schedule.isValid) {
			await interaction.editReply({
				embeds: [InvalidDateTime],
			});

			return;
		}

		let embedDescription = `**__Match info__**\n`;
		embedDescription += `**Custom ID:** \`${customId}\`\n`;
		embedDescription += `**Tournament:** \`${tournament.name}\`\n`;
		embedDescription += `**Stage:** \`${stage}\`\n`;
		embedDescription += `**Schedule:** \`${schedule.toRFC2822()}\`\n`;
		embedDescription += `**Red team:** \`${redTeam.name}\`\n`;
		embedDescription += `**Blue team:** \`${blueTeam.name}\`\n`;

		try {
			await db.match.create({
				data: {
					id,
					custom_id: customId,
					schedule: schedule.toJSDate(),
					tournament: {
						connect: {
							id: tournament.id,
						},
					},
					redTeam: {
						connect: {
							id: redTeam.id,
						},
					},
					blueTeam: {
						connect: {
							id: blueTeam.id,
						},
					},
					stage,
				},
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Match created!")
						.setDescription(embedDescription)
						.setFooter({
							text: `Unique ID: ${id}`,
						}),
				],
			});

			this.container.logger.info(
				`Match ${id} created by ${interaction.user.id}.`,
			);
		} catch (error) {
			this.container.logger.error(error);

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("DB error!")
						.setDescription(
							"There was an error while creating the match. Please try again later.",
						),
				],
			});
		}
	}

	public async chatInputRunClaim(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		await interaction.deferReply();

		const user = await db.user.findFirst({
			where: {
				discord_id: interaction.user.id,
			},
		});

		if (!user) {
			await interaction.editReply({
				embeds: [NoAccountEmbed],
			});

			return;
		}

		const matchId = interaction.options.getString("match-id", true);

		const tournament = await db.tournament.findFirst({
			where: {
				referee_channel_id: interaction.channelId,
			},
		});

		if (!tournament) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid channel!")
						.setDescription(
							"This command can only be used in a tournament referee channel.",
						),
				],
			});

			return;
		}

		if (!isUserTournamentReferee(interaction, tournament)) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid permissions!")
						.setDescription(
							"You need to be a tournament referee to use this command.",
						),
				],
			});

			return;
		}

		const match = await db.match.findFirst({
			where: {
				id: matchId,
			},
		});

		if (!match) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid match!")
						.setDescription("This match does not exist."),
				],
			});

			return;
		}

		if (match.referee_id) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid match!")
						.setDescription(
							"This match has already been claimed by another referee.",
						),
				],
			});

			return;
		}

		try {
			await db.match.update({
				where: {
					id: matchId,
				},
				data: {
					referee_id: user.id,
				},
			});
		} catch (error) {
			this.container.logger.error(error);

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error!")
						.setDescription("An error occurred while claiming this match."),
				],
			});

			return;
		}
	}
}
