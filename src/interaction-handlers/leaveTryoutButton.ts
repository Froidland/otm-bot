import db from "@/db";
import { NoAccountEmbed } from "@/embeds";
import { ApplyOptions } from "@sapphire/decorators";
import {
	InteractionHandler,
	InteractionHandlerTypes,
} from "@sapphire/framework";
import {
	EmbedBuilder,
	type ButtonInteraction,
	GuildMemberRoleManager,
} from "discord.js";

// TODO: Check if player has registered for a lobby. Maybe unregister them and then remove their role?.
@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button,
})
export class LeaveTryoutButtonHandler extends InteractionHandler {
	public async run(interaction: ButtonInteraction) {
		await interaction.deferReply({
			ephemeral: true,
		});

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

		const tryout = await db.tryout.findFirst({
			where: {
				embed_message_id: interaction.message.id,
			},
			include: {
				players: {
					where: {
						user_id: user.id,
					},
				},
				stages: {
					where: {
						lobbies: {
							some: {
								players: {
									some: {
										user_id: user.id,
									},
								},
							},
						},
					},
				},
			},
		});

		if (!tryout) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("This tryout no longer exists."),
				],
			});

			return;
		}

		if (tryout.players.length === 0) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("You are not in this tryout."),
				],
			});

			return;
		}

		if (tryout.stages.length > 0) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"You cannot leave this tryout because you have already joined a lobby.",
						),
				],
			});

			return;
		}

		try {
			await db.tryout.update({
				where: {
					id: tryout.id,
				},
				data: {
					players: {
						delete: {
							tryout_id_user_id: {
								user_id: user.id,
								tryout_id: tryout.id,
							},
						},
					},
				},
			});

			const playerRole = await interaction.guild?.roles.fetch(
				tryout.player_role_id,
			);

			if (!playerRole) {
				throw new Error("Player role not found.");
			}

			await (interaction.member?.roles as GuildMemberRoleManager).remove(
				playerRole,
			);

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Yellow")
						.setTitle("Success")
						.setDescription("You have left the tryout."),
				],
			});
		} catch (error) {
			this.container.logger.error(error);

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("Something went wrong. Please try again later."),
				],
			});

			return;
		}
	}

	public override parse(interaction: ButtonInteraction) {
		if (interaction.customId !== "leaveTryoutButton") return this.none();

		return this.some();
	}
}
