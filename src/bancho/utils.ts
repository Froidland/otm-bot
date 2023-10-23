import BanchoJs from "bancho.js";
import { AutoLobby, ongoingTryoutLobbies } from "./store";
import { container } from "@sapphire/pieces";
import { DateTime } from "luxon";
import db from "@/db";
import {
	playerAutoTryoutLobbyEmbed,
	staffAutoTryoutLobbyEmbed,
} from "@/embeds";

// TODO: Send message to staff and player channel when lobby is created with buttons to addref and invite respectively.
/**
 * @returns `true` if the lobby was created successfully, `false` otherwise.
 */
export async function createTryoutLobby(lobby: AutoLobby) {
	if (ongoingTryoutLobbies.length >= +(process.env.BANCHO_MAX_LOBBIES || 5)) {
		return false;
	}

	let newLobby = null;
	let staffMessage = null;
	let playerMessage = null;

	const firstPick = lobby.mappoolQueue.shift();

	if (!firstPick) {
		container.logger.error(
			`[AutoRef] Could not find first map in mappool for lobby ${lobby.id}.`,
		);

		await db.tryoutLobby.update({
			where: {
				id: lobby.id,
			},
			data: {
				status: "Failed",
			},
		});

		// TODO: Send message to staff and player channel that the lobby failed to create.

		return false;
	}

	const map = lobby.mappool.find((m) => m.pickId === firstPick);

	if (!map) {
		container.logger.error(
			`[AutoRef] Could not find first map in mappool for lobby ${lobby.id}.`,
		);

		await db.tryoutLobby.update({
			where: {
				id: lobby.id,
			},
			data: {
				status: "Failed",
			},
		});

		// TODO: Send message to staff and player channel that the lobby failed to create.

		return false;
	}

	try {
		newLobby = await container.bancho.createLobby(lobby.name);
	} catch (error) {
		console.log(error);

		return false;
	}

	const banchoId = newLobby.name.split("_")[1];

	lobby.banchoId = banchoId;

	const discordStaffChannel = await container.client.channels.fetch(
		lobby.staffChannelId,
	);

	const discordPlayerChannel = await container.client.channels.fetch(
		lobby.playerChannelId,
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
	// TODO: Add embed for player channel.
	// TODO: Add button to invite.

	const scheduledTime = DateTime.fromISO(lobby.schedule);
	const timer = scheduledTime.toSeconds() - DateTime.now().toSeconds();

	await newLobby.sendMessage(`!mp timer ${timer}`);
	await newLobby.sendMessage(`!mp set 0 3 16`);
	await newLobby.sendMessage(`!mp map ${map?.beatmapId}`);

	if (lobby.referees.length > 0) {
		await newLobby.sendMessage(`!mp addref #${lobby.referees[0].osuId}`);
	}

	lobby.lastPick = {
		beatmapId: map.beatmapId,
		pickId: map.pickId,
		startedAt: null,
	};

	for (const player of lobby.players) {
		await newLobby.sendMessage(`!mp invite #${player.osuId}`);
	}

	ongoingTryoutLobbies.push(lobby);

	await db.tryoutLobby.update({
		where: {
			id: lobby.id,
		},
		data: {
			bancho_id: banchoId,
			status: "Ongoing",
			staff_embed_message_id: staffMessage?.id || null,
			player_embed_message_id: playerMessage?.id || null,
		},
	});

	return true;
}

/* export async function endLobby(lobby: AutoLobby) {
	
} */

export function getMissingPlayers(
	channel: BanchoJs.BanchoChannel,
	lobby: AutoLobby,
) {
	const currentPlayers: string[] = [];
	const expectedPlayers = lobby.players;

	for (const playerName of channel.channelMembers.keys()) {
		currentPlayers.push(playerName);
	}

	const missingPlayers = expectedPlayers.filter(
		(player) => !currentPlayers.includes(player.osuUsername),
	);

	return missingPlayers;
}
