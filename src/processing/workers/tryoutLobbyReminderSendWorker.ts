import db from "@/db";
import { container } from "@sapphire/framework";
import { Job, Worker, WorkerOptions } from "bullmq";
import { EmbedBuilder } from "discord.js";
import { DateTime } from "luxon";

// TODO: Consider auto ref.

type JobData = {
	lobbyId: string;
	customId: string;
	players: {
		osuId: string;
		osuUsername: string;
		discordId: string | null;
	}[];
	referee: {
		osu_id: string;
		osu_username: string;
		discord_id: string | null;
	} | null;
	refereeRoleId: string;
	staffChannelId: string;
	playerChannelId: string;
	schedule: string;
};

const workerOptions: WorkerOptions = {
	connection: {
		host: process.env.REDIS_HOST || "localhost",
		port: +(process.env.REDIS_PORT || 6379),
		username: process.env.REDIS_USER || "default",
		password: process.env.REDIS_PASSWORD,
	},
	concurrency: 5,
};

export function initializeTryoutLobbyReminderSendWorker() {
	const newWorker = new Worker<JobData>(
		"tryoutLobbyReminderSend",
		workerHandler,
		workerOptions,
	);

	container.logger.info("Initialized tryout lobby reminder send worker.");

	newWorker.on("error", (error) => {
		container.logger.error(error);
	});

	return newWorker;
}

async function workerHandler(job: Job<JobData, void, string>) {
	const data = job.data;
	const schedule = new Date(data.schedule);

	if (schedule.getTime() < Date.now()) {
		await db.tryoutLobby.update({
			where: {
				id: data.lobbyId,
			},
			data: {
				reminder_status: "Skipped",
			},
		});

		return;
	}

	if (data.players.length === 0) {
		container.logger.debug(
			`[Reminders] Tryout lobby ${data.lobbyId} has no players, skipping...`,
		);

		await db.tryoutLobby.update({
			where: {
				id: data.lobbyId,
			},
			data: {
				reminder_status: "Skipped",
			},
		});

		return;
	}

	let playerMessage = null;
	let staffMessage = null;

	const staffMessageDescription = `The following players are registered for this lobby:\n\n${data.players.map(
		(player) =>
			`• <@${player.discordId}> | \`${player.osuUsername}\` - \`!mp invite #${player.osuId}\``,
	)}`;

	const playerChannel = await container.client.channels.fetch(
		data.playerChannelId,
	);

	const staffChannel = await container.client.channels.fetch(
		data.staffChannelId,
	);

	if (playerChannel?.isTextBased()) {
		playerMessage = await playerChannel.send({
			content: data.players.map((player) => `<@${player.discordId}>`).join(" "),
			embeds: [
				new EmbedBuilder()
					.setColor("Blue")
					.setTitle(
						`Lobby \`${data.customId}\` starts ${DateTime.fromJSDate(
							schedule,
						).toRelative()}!`,
					)
					.setDescription(
						`The lobby will be made soon, make sure you are in-game to receive your invite.${
							data.referee
								? ` In case you need any help, your referee is <@${data.referee.discord_id}> (\`${data.referee.osu_username}\` - \`#${data.referee.osu_id}\`)`
								: ""
						}`,
					)
					.setFooter({
						text: `Unique ID: ${data.lobbyId}`,
					}),
			],
			nonce: "1",
		});
	}

	if (staffChannel?.isTextBased()) {
		staffMessage = await staffChannel.send({
			content: data.referee
				? `<@${data.referee.discord_id}>`
				: `<@&${data.refereeRoleId}>`,
			embeds: [
				new EmbedBuilder()
					.setColor(data.referee ? "Blue" : "Yellow")
					.setTitle(
						`Lobby \`${data.customId}\` starts ${DateTime.fromJSDate(
							schedule,
						).toRelative()}` + (data.referee ? "!" : " and has no referee!"),
					)
					.setDescription(staffMessageDescription)
					.setFooter({
						text: `Unique ID: ${data.lobbyId}`,
					}),
			],
			nonce: "1",
		});
	}

	if (
		playerMessage &&
		playerMessage.nonce !== "1" &&
		staffMessage &&
		staffMessage.nonce !== "1"
	) {
		container.logger.error(
			`[Reminders] Failed to send reminder for tryout lobby ${data.lobbyId}`,
		);

		await db.tryoutLobby.update({
			where: {
				id: data.lobbyId,
			},
			data: {
				reminder_status: "Error",
			},
		});

		return;
	}

	await db.tryoutLobby.update({
		where: {
			id: data.lobbyId,
		},
		data: {
			reminder_status: "Sent",
		},
	});
}
