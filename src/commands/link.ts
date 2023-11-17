import { ApplyOptions } from "@sapphire/decorators";
import { Command } from "@sapphire/framework";
import { EmbedBuilder } from "discord.js";

@ApplyOptions<Command.Options>({
	description:
		"Help message for linking your discord account to your osu! account.",
})
export class LinkCommand extends Command {
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
						`Please sign in with your osu! account [here](${process.env.FRONTEND_URL}${process.env.FRONTEND_LOGIN_ROUTE}) in order to link your Discord account to your osu! account.`,
					),
			],
		});
	}
}
