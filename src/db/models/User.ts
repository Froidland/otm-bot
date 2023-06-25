import {
	Entity,
	Column,
	PrimaryColumn,
	CreateDateColumn,
	UpdateDateColumn,
	OneToOne,
	OneToMany,
	ManyToMany,
} from "typeorm";
import { Tournament } from "./Tournament";
import { Team } from "./Team";

@Entity({
	name: "users",
})
export class User {
	@PrimaryColumn("varchar")
	discordId: string;

	@Column("int", {
		nullable: true,
	})
	osuId?: number;

	@Column("varchar", {
		nullable: true,
		length: 32,
	})
	username?: string;

	@Column("bigint", {
		default: 0,
	})
	balance: number;

	@OneToMany(() => Tournament, (tournament) => tournament.creator)
	createdTournaments: Tournament[];

	@OneToMany(() => Team, (team) => team.captain)
	captainedTeams: Team[];

	@ManyToMany(() => Team, (team) => team.members)
	joinedTeams: Team[];

	@CreateDateColumn({
		type: "timestamp",
	})
	createdAt: Date;

	@UpdateDateColumn({
		type: "timestamp",
	})
	updatedAt: Date;
}
