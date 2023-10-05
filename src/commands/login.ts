import { ApplyOptions } from "@sapphire/decorators";
import { Command } from "@sapphire/framework";
import { EmbedBuilder } from "discord.js";

@ApplyOptions<Command.Options>({
	description:
		"Help message for linking your discord account to your osu! account.",
})
export class LoginCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description),
		);
	}

	public override async chatInputRun(
		interaction: Command.ChatInputCommandInteraction,
	) {
		await interaction.deferReply({ ephemeral: true });

		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setColor("Blue")
					.setTitle("Authentication!")
					.setDescription(
						`Please login with your osu account on [this website](${
							process.env.FRONTEND_URL! + process.env.FRONTEND_LOGIN_ROUTE!
						}) and then link your discord account in order to make use of all the bot's features.`,
					),
			],
		});
	}
}
