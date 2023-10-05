import { ApplyOptions } from "@sapphire/decorators";
import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, userMention } from "discord.js";

@ApplyOptions<Command.Options>({
	description: "Sends a ping message.",
})
export class PingCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder: SlashCommandBuilder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
				.addUserOption((option) =>
					option
						.setName("user")
						.setDescription("The user to ping.")
						.setRequired(true),
				),
		);
	}

	public override chatInputRun(
		interaction: Command.ChatInputCommandInteraction,
	) {
		const userToPing = interaction.options.getUser("user", true);
		const mentions = [userToPing.id];

		if (userToPing.id !== interaction.user.id) {
			mentions.push(interaction.user.id);
		}

		return interaction.reply({
			content: `Hey ${userMention(userToPing.id)}, ${userMention(
				interaction.user.id,
			)} says hello!`,
			allowedMentions: {
				users: mentions,
			},
		});
	}
}
