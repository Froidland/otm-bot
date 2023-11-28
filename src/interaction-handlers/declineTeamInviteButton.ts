import db from "@/db";
import { NoAccountEmbed } from "@/embeds";
import {
	InteractionHandler,
	InteractionHandlerTypes,
	PieceContext,
} from "@sapphire/framework";
import { type ButtonInteraction, EmbedBuilder } from "discord.js";

export class DeclineTeamInviteButton extends InteractionHandler {
	public constructor(context: PieceContext) {
		super(context, {
			name: "declineTeamInviteButton",
			interactionHandlerType: InteractionHandlerTypes.Button,
		});
	}

	public override parse(interaction: ButtonInteraction) {
		if (interaction.customId !== "declineTeamInviteButton") {
			return this.none();
		}

		return this.some();
	}

	public async run(interaction: ButtonInteraction) {
		await interaction.deferReply();

		const user = await db.user.findFirst({
			where: {
				discord_id: interaction.user.id,
			},
			include: {
				team_invites: {
					where: {
						embed_message_id: interaction.message.id,
					},
					include: {
						team: {
							include: {
								creator: true,
								tournament: true,
							},
						},
					},
				},
			},
		});

		if (!user) {
			await interaction.editReply({
				embeds: [NoAccountEmbed],
			});

			return;
		}

		if (user.team_invites.length < 1) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid invite")
						.setDescription("This invite is no longer valid."),
				],
			});

			return;
		}

		if (user.team_invites[0].status !== "Pending") {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid invite")
						.setDescription("You have already responded to this invite."),
				],
			});

			return;
		}

		try {
			await db.user.update({
				where: {
					id: user.id,
				},
				data: {
					team_invites: {
						update: {
							where: {
								id: user.team_invites[0].id,
							},
							data: {
								status: "Rejected",
							},
						},
					},
				},
			});
		} catch (error) {
			this.container.logger.error(error);

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"An error occured while declining the invite. Please try again later.",
						),
				],
			});

			return;
		}

		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setColor("Yellow")
					.setTitle("Invite declined")
					.setDescription("You have declined the invite."),
			],
		});

		if (!user.team_invites[0].team.creator.discord_id) {
			return;
		}

		try {
			const captain = await this.container.client.users.fetch(
				user.team_invites[0].team.creator.discord_id,
			);

			await captain.send({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invite declined")
						.setDescription(
							`<@${user.discord_id}> (\`${user.osu_username}\` - \`#${user.osu_id}\`) has declined your invite to join \`${user.team_invites[0].team.name}\` for tournament \`${user.team_invites[0].team.tournament.name}\`.`,
						),
				],
			});
		} catch (error) {
			this.container.logger.error(error);
		}
	}
}
