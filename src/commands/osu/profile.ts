import {
	CommandInteraction,
	EmbedBuilder,
	SlashCommandBuilder,
} from "discord.js";
import { v2 } from "osu-api-extended";
import { Command } from "@/interfaces/command";
import { getFlagUrl } from "@/utils";
import db from "@/db";

export const profile: Command = {
	data: new SlashCommandBuilder()
		.setName("profile")
		.setDescription(
			"Sends the profile of your linked username. Accepts a username as an optional argument."
		)
		.addStringOption((option) =>
			option
				.setName("username")
				.setDescription("Username of the user to display the profile of.")
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
					}
				)
		),
	execute: async (interaction: CommandInteraction) => {
		await interaction.deferReply();
		// TODO: Refactor to comply with strict mode

		const modeOption = interaction.options.get("mode", false);

		const usernameOption = interaction.options.get("username", false);
		let searchParameter: string | number;

		// If the option is null, we search for the user_id associated with the users discord_id, otherwise we just use the username option.
		if (usernameOption === null) {
			const user = await db.users.findOne({
				where: {
					discordId: interaction.user.id,
				},
			});

			if (!user || user.osuId === undefined) {
				await interaction.editReply({
					embeds: [
						new EmbedBuilder()
							.setColor("Red")
							.setTitle("Error")
							.setDescription(
								`\`Please link an osu! username in order to use this command with no arguments.\``
							),
					],
				});

				return;
			}

			searchParameter = user.osuId;
		} else {
			searchParameter = interaction.options.get("username")?.value as string;
		}

		const userDetails = await v2.user.details(
			searchParameter,
			modeOption === null
				? "osu"
				: (modeOption.value as "osu" | "taiko" | "fruits" | "mania"),
			usernameOption === null ? "id" : "username"
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

		const joinDateString = new Date(userDetails.join_date).toLocaleString(
			new Intl.Locale("es-ES")
		);

		let description = `Accuracy: \`${acc}%\` • Level: \`${currentLevel}.${currentLevelProgress}\`\n`;
		description += `Playcount: \`${playCount}\` (\`${playTimeHours} hrs\`)\n`;
		description += `Medals: \`${medalCount}\``;

		const embed = new EmbedBuilder()
			.setColor("Green")
			.setAuthor({
				name: `${userDetails.username}: ${userDetails.statistics.pp.toFixed(
					2
				)}pp (#${userDetails.statistics.global_rank ?? 0} ${
					userDetails.country_code
				}${userDetails.statistics.country_rank ?? 0})`,
				url: `https://osu.ppy.sh/users/${userDetails.id}`,
				iconURL: countryFlagUrl,
			})
			.setDescription(description)
			.setFooter({ text: `Joined osu! on ${joinDateString}` })
			.setThumbnail(userDetails.avatar_url);

		await interaction.editReply({ embeds: [embed] });
	},
};
