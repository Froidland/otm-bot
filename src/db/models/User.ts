import {
	Entity,
	Column,
	PrimaryColumn,
	CreateDateColumn,
	UpdateDateColumn,
	OneToOne,
	OneToMany,
	ManyToMany,
	JoinTable,
} from "typeorm";
import { Tournament } from "./Tournament";
import { Team } from "./Team";
import { TryoutLobby } from "./TryoutLobby";

@Entity({
	name: "users",
})
export class User {
	@PrimaryColumn("varchar")
	discordId: string;

	@Column("int", {
		unique: true,
	})
	osuId: number;

	@Column("varchar", {
		length: 32,
	})
	username: string;

	@Column("bigint", {
		default: 0,
	})
	balance: number;

	@Column("varchar", {
		select: false,
	})
	tokenType: string;

	@Column("timestamp", {
		select: false,
	})
	tokenExpiry: Date;

	@Column("varchar", {
		select: false,
		length: 1024,
	})
	accessToken: string;

	@Column("varchar", {
		select: false,
		length: 1024,
	})
	refreshToken: string;

	@OneToMany(() => Tournament, (tournament) => tournament.creator)
	createdTournaments: Tournament[];

	@OneToMany(() => Team, (team) => team.owner)
	ownedTeams: Team[];

	@ManyToMany(() => Team, (team) => team.members)
	joinedTeams: Team[];

	@ManyToMany(() => TryoutLobby, (lobby) => lobby.id)
	@JoinTable()
	joinedTryoutLobbies: TryoutLobby[];

	@CreateDateColumn({
		type: "timestamp",
	})
	createdAt: Date;

	@UpdateDateColumn({
		type: "timestamp",
	})
	updatedAt: Date;
}
