import BanchoJs from "bancho.js";
import {
	AutoLobby,
	LobbyUser,
	QualifierLobby,
	TryoutLobby,
	lobbyStore,
} from "./store";
import { container } from "@sapphire/pieces";
import { DateTime } from "luxon";
import db from "@/db";
import {
	playerAutoQualifierLobbyEmbed,
	playerAutoTryoutLobbyEmbed,
	staffAutoQualifierLobbyEmbed,
	staffAutoTryoutLobbyEmbed,
} from "@/embeds";
import { EmbedBuilder } from "discord.js";
import {
	matchFinished,
	matchStarted,
	playerJoined,
	allPlayersReady,
	timerEnd as timerEnded,
	message,
} from "./handlers";

/**
 * Creates a lobby in bancho linked to the given lobby, stores it in memory and handles all the necessary setup and events.
 * @param lobby The tryout lobby data necessary to create the lobby. All the data is stored in memory if the lobby is created successfully.
 * @returns `true` if the lobby was created successfully, `false` otherwise.
 */
export async function createTryoutLobby(lobby: TryoutLobby) {
	if (lobbyStore.size >= +(process.env.BANCHO_MAX_LOBBIES || 3)) {
		container.logger.warn(
			`[AutoRef] Could not create tryout lobby ${lobby.id} because there are too many ongoing lobbies.`,
		);

		await db.tryoutLobby.update({
			where: {
				id: lobby.id,
			},
			data: {
				status: "Failed",
			},
		});

		const staffChannel = await container.client.channels.fetch(
			lobby.staffNotifChannelId,
		);

		if (staffChannel && staffChannel.isTextBased()) {
			await staffChannel.send({
				content: lobby.referees.map((r) => `<@${r.discordId}>`).join(" "),
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle(`Unable to create tryout lobby \`${lobby.customId}\``)
						.setDescription(
							"There are too many ongoing lobbies right now. Please create the lobby manually.",
						),
				],
			});
		}

		return false;
	}

	let banchoChannel = null;
	let staffMessage = null;
	let playerMessage = null;

	const firstPick = lobby.mappoolQueue.shift();

	if (!firstPick) {
		container.logger.error(
			`[AutoRef] Could not find first map in mappool for tryout lobby ${lobby.id}.`,
		);

		await db.tryoutLobby.update({
			where: {
				id: lobby.id,
			},
			data: {
				status: "Failed",
			},
		});

		const staffChannel = await container.client.channels.fetch(
			lobby.staffNotifChannelId,
		);

		if (staffChannel && staffChannel.isTextBased()) {
			await staffChannel.send({
				content:
					lobby.referees.length < 1
						? `<@&${lobby.refereeRoleId}>`
						: lobby.referees.map((r) => `<@${r.discordId}>`).join(" "),
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle(`Unable to create tryout lobby \`${lobby.customId}\``)
						.setDescription(
							"Could not find first map in mappool. Please create the lobby manually.",
						),
				],
			});
		}

		return false;
	}

	const map = lobby.mappool.find((m) => m.pickId === firstPick);

	if (!map) {
		container.logger.error(
			`[AutoRef] Could not find first map in mappool for tryout lobby ${lobby.id}.`,
		);

		await db.tryoutLobby.update({
			where: {
				id: lobby.id,
			},
			data: {
				status: "Failed",
			},
		});

		const staffChannel = await container.client.channels.fetch(
			lobby.staffNotifChannelId,
		);

		if (staffChannel && staffChannel.isTextBased()) {
			await staffChannel.send({
				content:
					lobby.referees.length < 1
						? `<@&${lobby.refereeRoleId}>`
						: lobby.referees.map((r) => `<@${r.discordId}>`).join(" "),
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle(`Unable to create tryout lobby \`${lobby.customId}\``)
						.setDescription(
							"Could not find first map in mappool. Please create the lobby manually.",
						),
				],
			});
		}

		return false;
	}

	try {
		banchoChannel = await container.bancho.createLobby(lobby.name);
		addBanchoLobbyListeners(container.bancho, banchoChannel.lobby);
	} catch (error) {
		container.logger.error(error);
		const staffChannel = await container.client.channels.fetch(
			lobby.staffNotifChannelId,
		);

		if (staffChannel && staffChannel.isTextBased()) {
			await staffChannel.send({
				content:
					lobby.referees.length < 1
						? `<@&${lobby.refereeRoleId}>`
						: lobby.referees.map((r) => `<@${r.discordId}>`).join(" "),
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle(`Unable to create tryout lobby \`${lobby.customId}\``)
						.setDescription(
							"An error occurred while creating the lobby. Please create the lobby manually.",
						),
				],
			});
		}

		return false;
	}

	lobby.banchoId = banchoChannel.lobby.id.toString();

	const discordStaffChannel = await container.client.channels.fetch(
		lobby.staffNotifChannelId,
	);

	const discordPlayerChannel = await container.client.channels.fetch(
		lobby.playerNotifChannelId,
	);

	if (discordStaffChannel && discordStaffChannel.isTextBased()) {
		staffMessage = await discordStaffChannel.send(
			staffAutoTryoutLobbyEmbed(lobby),
		);
	}

	if (discordPlayerChannel && discordPlayerChannel.isTextBased()) {
		playerMessage = await discordPlayerChannel.send(
			playerAutoTryoutLobbyEmbed(lobby),
		);
	}

	const scheduledTime = DateTime.fromISO(lobby.schedule);
	const timer = Math.max(
		scheduledTime.toSeconds() - DateTime.now().toSeconds(),
		300,
	);

	await banchoChannel.lobby.startTimer(timer);
	await banchoChannel.lobby.setSettings(0, 3, 16);
	await banchoChannel.lobby.setMap(map.beatmapId);
	await banchoChannel.lobby.setMods(getModsString(map.mods));

	lobby.mappoolHistory.push(map);

	if (lobby.referees.length > 0) {
		await banchoChannel.lobby.addRef("#" + lobby.referees[0].osuId);
	}

	for (const player of lobby.players) {
		await banchoChannel.lobby.invitePlayer("#" + player.osuId);
	}

	lobbyStore.set(banchoChannel.lobby.id, lobby);

	await db.tryoutLobby.update({
		where: {
			id: lobby.id,
		},
		data: {
			bancho_id: banchoChannel.lobby.id.toString(),
			status: "Ongoing",
			staff_embed_message_id: staffMessage?.id || null,
			player_embed_message_id: playerMessage?.id || null,
		},
	});

	return true;
}

/**
 * Creates a lobby in bancho linked to the given lobby, stores it in memory and handles all the necessary setup and events.
 * @param lobby The qualifier lobby data necessary to create the lobby. All the data is stored in memory if the lobby is created successfully.
 * @returns `true` if the lobby was created successfully, `false` otherwise.
 */
export async function createQualifierLobby(lobby: QualifierLobby) {
	if (lobbyStore.size >= +(process.env.BANCHO_MAX_LOBBIES || 5)) {
		container.logger.warn(
			`[AutoRef] Could not create qualifier lobby ${lobby.id} because there are too many ongoing lobbies.`,
		);

		await db.tournamentQualifierLobby.update({
			where: {
				id: lobby.id,
			},
			data: {
				status: "Failed",
			},
		});

		const staffChannel = await container.client.channels.fetch(
			lobby.staffNotifChannelId,
		);

		if (staffChannel && staffChannel.isTextBased()) {
			await staffChannel.send({
				content:
					lobby.referees.length < 1
						? `<@&${lobby.refereeRoleId}>`
						: lobby.referees.map((r) => `<@${r.discordId}>`).join(" "),
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle(
							`Unable to create qualifier lobby for team \`${lobby.teamName}\``,
						)
						.setDescription(
							"There are too many ongoing lobbies right now. Please create the lobby manually.",
						),
				],
			});
		}

		return false;
	}

	let banchoChannel = null;
	let staffMessage = null;
	let playerMessage = null;

	const firstPick = lobby.mappoolQueue.shift();

	if (!firstPick) {
		container.logger.error(
			`[AutoRef] Could not find first map in mappool for qualifier lobby ${lobby.id}.`,
		);

		await db.tournamentQualifierLobby.update({
			where: {
				id: lobby.id,
			},
			data: {
				status: "Failed",
			},
		});

		const staffChannel = await container.client.channels.fetch(
			lobby.staffNotifChannelId,
		);

		if (staffChannel && staffChannel.isTextBased()) {
			await staffChannel.send({
				content:
					lobby.referees.length < 1
						? `<@&${lobby.refereeRoleId}>`
						: lobby.referees.map((r) => `<@${r.discordId}>`).join(" "),
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle(
							`Unable to create qualifier lobby for team \`${lobby.teamName}\``,
						)
						.setDescription(
							"Could not find first map in mappool. Please create the lobby manually.",
						),
				],
			});
		}

		return false;
	}

	const map = lobby.mappool.find((m) => m.pickId === firstPick);

	if (!map) {
		container.logger.error(
			`[AutoRef] Could not find first map in mappool for qualifier lobby ${lobby.id}.`,
		);

		await db.tournamentQualifierLobby.update({
			where: {
				id: lobby.id,
			},
			data: {
				status: "Failed",
			},
		});

		const staffChannel = await container.client.channels.fetch(
			lobby.staffNotifChannelId,
		);

		if (staffChannel && staffChannel.isTextBased()) {
			await staffChannel.send({
				content:
					lobby.referees.length < 1
						? `<@&${lobby.refereeRoleId}>`
						: lobby.referees.map((r) => `<@${r.discordId}>`).join(" "),
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle(
							`Unable to create qualifier lobby for team \`${lobby.teamName}\``,
						)
						.setDescription(
							"Could not find first map in mappool. Please create the lobby manually.",
						),
				],
			});
		}

		return false;
	}

	try {
		banchoChannel = await container.bancho.createLobby(lobby.name);
		addBanchoLobbyListeners(container.bancho, banchoChannel.lobby);
	} catch (error) {
		container.logger.error(error);
		const staffChannel = await container.client.channels.fetch(
			lobby.staffNotifChannelId,
		);

		if (staffChannel && staffChannel.isTextBased()) {
			await staffChannel.send({
				content:
					lobby.referees.length < 1
						? `<@&${lobby.refereeRoleId}>`
						: lobby.referees.map((r) => `<@${r.discordId}>`).join(" "),
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle(
							`Unable to create qualifier lobby for team \`${lobby.teamName}\``,
						)
						.setDescription(
							"An error occurred while creating the lobby. Please create the lobby manually.",
						),
				],
			});
		}

		return false;
	}

	lobby.banchoId = banchoChannel.lobby.id.toString();

	const discordStaffChannel = await container.client.channels.fetch(
		lobby.staffNotifChannelId,
	);

	const discordPlayerChannel = await container.client.channels.fetch(
		lobby.playerNotifChannelId,
	);

	if (discordStaffChannel && discordStaffChannel.isTextBased()) {
		staffMessage = await discordStaffChannel.send(
			staffAutoQualifierLobbyEmbed(lobby),
		);
	}

	if (discordPlayerChannel && discordPlayerChannel.isTextBased()) {
		playerMessage = await discordPlayerChannel.send(
			playerAutoQualifierLobbyEmbed(lobby),
		);
	}

	const scheduledTime = DateTime.fromISO(lobby.schedule);
	const timer = Math.max(
		scheduledTime.toSeconds() - DateTime.now().toSeconds(),
		300,
	);

	await banchoChannel.lobby.startTimer(timer);
	await banchoChannel.lobby.setSettings(0, 3, 16);
	await banchoChannel.lobby.setMap(map.beatmapId);
	await banchoChannel.lobby.setMods(getModsString(map.mods));

	lobby.mappoolHistory.push(map);

	if (lobby.referees.length > 0) {
		await banchoChannel.lobby.addRef("#" + lobby.referees[0].osuId);
	}

	await banchoChannel.lobby.invitePlayer("#" + lobby.captain.osuId);

	lobbyStore.set(banchoChannel.lobby.id, lobby);

	await db.tournamentQualifierLobby.update({
		where: {
			id: lobby.id,
		},
		data: {
			bancho_id: banchoChannel.lobby.id.toString(),
			status: "Ongoing",
			staff_embed_message_id: staffMessage?.id || null,
			player_embed_message_id: playerMessage?.id || null,
		},
	});

	return true;
}

/**
 * Ends the given lobby by closing it, removing it from memory and sending a message to the staff channel.
 * @param lobby The lobby to end.
 */
export async function endLobby(
	lobby: AutoLobby,
	banchoLobby: BanchoJs.BanchoLobby,
	skipped: boolean = false,
) {
	await banchoLobby.closeLobby();

	lobbyStore.delete(banchoLobby.id)

	if (skipped) {
		return;
	}

	try {
		const notificationChannel = await container.client.channels.fetch(
			lobby.staffNotifChannelId,
		);

		if (notificationChannel && notificationChannel.isTextBased()) {
			await notificationChannel.send({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle(
							lobby.type === "tryout"
								? `Tryout lobby \`${lobby.customId}\` finished`
								: `Qualifier lobby for team \`${lobby.teamName}\` finished`,
						)
						.setDescription(
							`The lobby has been closed. You can view the results [here](https://osu.ppy.sh/community/matches/${lobby.banchoId}).`,
						),
				],
			});
		}
	} catch (error) {
		container.logger.error(error);
	}
}

/**
 * Compares the list of players in the given channel with the expected list of players in the given lobby and returns an array of players OR the number of players required to start the lobby depending on the lobby type.
 * @param channel BanchoChannel instance to get the current list of players from.
 * @param lobby AutoLobby instance to get the expected list of players from.
 * @returns An array of players that are expected to be in the lobby but are not.
 */
export function getMissingPlayers(
	channel: BanchoJs.BanchoChannel,
	lobby: TryoutLobby,
) {
	const currentPlayers: LobbyUser[] = [];

	for (const playerName of channel.channelMembers.keys()) {
		const player = lobby.players.find((p) => p.osuUsername === playerName);

		if (player) {
			currentPlayers.push(player);
		}
	}

	return currentPlayers.filter((p) => !lobby.players.includes(p));
}

/**
 * Compares the list of players in the given channel with the expected list of players in the given lobby and returns an array of players that are in both as LobbyUser instances.
 * @param channel BanchoChannel instance to get the current list of players from.
 * @param lobby AutoLobby instance to get the expected list of players from.
 * @returns An array of players that are in both the channel and the lobby.
 */
export function getCurrentPlayers(
	channel: BanchoJs.BanchoChannel,
	lobby: AutoLobby,
) {
	const currentPlayers: LobbyUser[] = [];

	for (const playerName of channel.channelMembers.keys()) {
		const player = lobby.players.find((p) => p.osuUsername === playerName);

		if (player) {
			currentPlayers.push(player);
		}
	}

	return currentPlayers;
}

/**
 * Takes an unformatted string of mods and transforms it into a string usable by BanchoBot.
 * @param mods An unformatted string of mods.
 * @returns A formatted string of mods compatible with the command `!mp mods`.
 * @example getModsString("HDHR") // "HD HR"
 * @example getModsString("FM DT") // "FreeMod DT"
 */
export function getModsString(mods: string) {
	const result: string[] = [];

	if (mods === "NM") {
		return "NF";
	}

	if (!mods.startsWith("FM")) {
		result.push("NF");
	}

	for (let i = 0; i < mods.length; i += 2) {
		const substring = mods.slice(i, i + 2);

		if (substring === "FM") {
			result.push("FreeMod");

			continue;
		}

		result.push(substring);
	}

	return result.join(" ");
}

/**
 * Adds all the necessary listeners to the given lobby.
 * @param client BanchoClient instance.
 * @param lobby BanchoLobby instance.
 */
export function addBanchoLobbyListeners(
	client: BanchoJs.BanchoClient,
	lobby: BanchoJs.BanchoLobby,
) {
	lobby.on("matchFinished", () => matchFinished(client, lobby));
	lobby.on("matchStarted", () => matchStarted(client, lobby));
	lobby.on("playerJoined", (entity) => playerJoined(client, lobby, entity));
	lobby.on("allPlayersReady", () => allPlayersReady(client, lobby));
	lobby.on("timerEnded", () => timerEnded(client, lobby));

	lobby.channel.on("message", (msg) => message(client, lobby, msg));
}
