import db from "@/db";
import { NoAccountEmbed } from "@/embeds";
import { v2 } from "osu-api-extended";
import { ApplyOptions } from "@sapphire/decorators";
import { Command } from "@sapphire/framework";
import { EmbedBuilder } from "discord.js";
import { DateTime } from "luxon";
import { getFlagUrl } from "@/utils";

const gamemodes = ["osu", "taiko", "fruits", "mania"] as const;
type Gamemode = (typeof gamemodes)[number];

@ApplyOptions<Command.Options>({
	description:
		"Sends the profile of your linked username. Accepts a username as an optional argument.",
})
export class ProfileCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
				.addStringOption((option) =>
					option
						.setName("username")
						.setDescription("Username of the user to display the profile of."),
				)
				.addStringOption((option) =>
					option
						.setName("mode")
						.setDescription("Game mode to display the profile of.")
						.addChoices(
							{
								name: "standard",
								value: "osu",
							},
							{
								name: "taiko",
								value: "taiko",
							},
							{
								name: "catch",
								value: "fruits",
							},
							{
								name: "mania",
								value: "mania",
							},
						),
				),
		);
	}

	public override async chatInputRun(
		interaction: Command.ChatInputCommandInteraction,
	) {
		await interaction.deferReply();

		const usernameOption = interaction.options.getString("username");
		let userQuery = usernameOption;
		const mode = interaction.options.getString("mode") as Gamemode | null;

		// If the option is null, we search for the user_id associated with the users discord_id, otherwise we just use the username option.
		if (!usernameOption) {
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

			userQuery = user.osu_id.toString();
		}

		const userDetails = await v2.user.details(
			userQuery!,
			mode || "osu",
			!usernameOption ? "id" : "username",
		);

		// @ts-expect-error Unfortunately, the response can indeed have an error property, osu-api-extended doesn't throw an error when the user is not found.
		if (userDetails["error"] !== undefined) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(`\`User not found.\``),
				],
			});
			return;
		}

		const countryFlagUrl = getFlagUrl(userDetails.country_code);

		const acc = userDetails.statistics.hit_accuracy.toFixed(2);
		const currentLevel = userDetails.statistics.level.current;
		const currentLevelProgress = userDetails.statistics.level.progress;

		const playCount = userDetails.statistics.play_count;
		const playTimeHours = (userDetails.statistics.play_time / 3600).toFixed(0);

		const medalCount = userDetails.user_achievements.length;

		let description = `Accuracy: \`${acc}%\` • Level: \`${currentLevel}.${currentLevelProgress}\`\n`;
		description += `Playcount: \`${playCount}\` (\`${playTimeHours} hrs\`)\n`;
		description += `Medals: \`${medalCount}\``;

		const embed = new EmbedBuilder()
			.setColor("Green")
			.setAuthor({
				name: `${userDetails.username}: ${userDetails.statistics.pp.toFixed(
					2,
				)}pp (#${userDetails.statistics.global_rank ?? 0} ${
					userDetails.country_code
				}${userDetails.statistics.country_rank ?? 0})`,
				url: `https://osu.ppy.sh/users/${userDetails.id}`,
				iconURL: countryFlagUrl,
			})
			.setDescription(description)
			.setFooter({
				text: `Joined osu! on ${DateTime.fromISO(
					userDetails.join_date,
				).toFormat("dd/MM/yyyy, HH:mm")}`,
			})
			.setThumbnail(userDetails.avatar_url);

		await interaction.editReply({ embeds: [embed] });
	}
}
