import {
	CommandInteraction,
	EmbedBuilder,
	SlashCommandBuilder,
} from "discord.js";
import { Command } from "@/interfaces/command";
import axios from "axios";
import { logger } from "@/utils";
import { createId } from "@paralleldrive/cuid2";
import AdmZip from "adm-zip";
import S3Client from "@/utils/s3client";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { Stream } from "stream";

// TODO: Add an option to add files to the mappack that aren't from chimu.moe.

export const createMappack: Command = {
	data: new SlashCommandBuilder()
		.setName("create-mappack")
		.setDescription(
			"Downloads all the maps specified from chimu.moe and upload a zip file to litterbox"
		)
		.addStringOption((option) =>
			option
				.setName("name")
				.setDescription("The name of the mappack.")
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName("beatmapset-ids")
				.setDescription(
					"The ids of the beatmapsets to include in the mappack. (Separated by spaces)"
				)
				.setRequired(true)
		),
	execute: async (interaction: CommandInteraction) => {
		await interaction.deferReply();
		const fileId = createId();
		const streamPromises: Promise<void>[] = [];
		const zipFile = new AdmZip();

		const batmapsetIdsOptionValue = interaction.options.get(
			"beatmapset-ids",
			true
		).value as string;

		const nameOptionValue = interaction.options.get("name", true)
			?.value as string;

		const fileKey =
			nameOptionValue === null
				? `${fileId}.zip`
				: `${nameOptionValue}-${fileId}.zip`;

		// Download all the maps and save them to a temp folder.

		const beatmapsetIds = batmapsetIdsOptionValue.split(" ").map((id) => +id);

		for (const id of beatmapsetIds) {
			streamPromises.push(
				new Promise<void>(async (resolve, reject) => {
					const response = await axios.get(
						`https://api.chimu.moe/v1/download/${id}`,
						{
							responseType: "stream",
							headers: {
								Accept: "application/octet-stream",
							},
						}
					);

					const stream: Stream = response.data;
					const buffers: Array<Buffer> = [];

					stream.on("data", (chunk: Buffer) => {
						buffers.push(chunk);
					});

					stream.on("end", () => {
						// Concatenate all the buffers into one buffer and add it to the zip file.
						zipFile.addFile(`${id}.osz`, Buffer.concat(buffers));
						resolve();
					});

					stream.on("error", (error: any) => {
						logger.error(error);
						reject(error);
					});
				})
			);
		}

		try {
			await Promise.all(streamPromises);
		} catch (error) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setTitle("Error")
						.setDescription("Something went wrong while downloading the maps.")
						.setColor("Red"),
				],
			});

			return;
		}

		// Upload the zip file to S3-compatible storage.

		try {
			await S3Client.putObject({
				Bucket: process.env.S3_BUCKET_NAME,
				Key: fileKey,
				Body: zipFile.toBuffer(),
			});
		} catch (error) {
			logger.error(error);
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setTitle("Error")
						.setDescription(
							"Something went wrong while uploading the zip file."
						)
						.setColor("Red"),
				],
			});

			return;
		}

		// Get a signed url for the zip file.

		const mappackLink = await getSignedUrl(
			S3Client,
			new GetObjectCommand({
				Bucket: process.env.S3_BUCKET_NAME,
				Key: fileKey,
			}),
			{ expiresIn: 60 * 60 * 24 * 7 } // 1 week
		);

		// Reply with the link to the zip file.

		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setTitle("Success")
					.setDescription(`[Download mappack](${mappackLink})`)
					.setColor("Green"),
			],
		});
	},
};
