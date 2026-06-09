import { NextRequest, NextResponse } from "next/server";
import { listTeams, createTeam, updateTeam, deleteTeam } from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const teams = listTeams(params.id);
  return NextResponse.json(teams);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const team = createTeam(params.id, body);
  return NextResponse.json(team, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, ...data } = body;
  const team = updateTeam(id, data);
  if (!team)
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  return NextResponse.json(team);
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const ok = deleteTeam(body.id);
  if (!ok)
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
