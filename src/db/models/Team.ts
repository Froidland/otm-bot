import {
	Column,
	CreateDateColumn,
	Entity,
	ManyToMany,
	OneToMany,
	PrimaryColumn,
	UpdateDateColumn,
} from "typeorm";
import { User } from "./User";
import { Lobby } from "./Lobby";

@Entity({
	name: "teams",
})
export class Team {
	@PrimaryColumn("varchar")
	id: string;

	@Column("varchar")
	name: string;

	@Column({
		type: "enum",
		enum: [
			"-10UTC",
			"-11UTC",
			"-12UTC",
			"-9UTC",
			"-8UTC",
			"-7UTC",
			"-6UTC",
			"-5UTC",
			"-4UTC",
			"-3UTC",
			"-2UTC",
			"-1UTC",
			"0UTC",
			"10UTC",
			"11UTC",
			"12UTC",
			"1UTC",
			"2UTC",
			"3UTC",
			"4UTC",
			"5UTC",
			"6UTC",
			"7UTC",
			"8UTC",
			"9UTC",
		],
	})
	preferredTimezone:
		| "-10UTC"
		| "-11UTC"
		| "-12UTC"
		| "-9UTC"
		| "-8UTC"
		| "-7UTC"
		| "-6UTC"
		| "-5UTC"
		| "-4UTC"
		| "-3UTC"
		| "-2UTC"
		| "-1UTC"
		| "0UTC"
		| "10UTC"
		| "11UTC"
		| "12UTC"
		| "1UTC"
		| "2UTC"
		| "3UTC"
		| "4UTC"
		| "5UTC"
		| "6UTC"
		| "7UTC"
		| "8UTC"
		| "9UTC";

	@OneToMany(() => User, (user) => user.captainedTeams, {
		cascade: true,
	})
	captain: User;

	@ManyToMany(() => User, (user) => user.joinedTeams)
	members: User[];

	@ManyToMany(() => Lobby, (lobby) => lobby.teams)
	joinedLobbies: Lobby[];
}
