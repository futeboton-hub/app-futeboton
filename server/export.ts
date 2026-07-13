import type { Request, Response } from "express";
import ExcelJS from "exceljs";
import * as db from "./db";

export async function handleExcelExport(req: Request, res: Response) {
  try {
    const tournamentId = parseInt(req.query.tournamentId as string) || 1;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Liga Futeboton";
    workbook.created = new Date();

    const players = await db.getAllPlayers(tournamentId);
    const groups = ["A", "B", "C", "D", "E", "F", "G", "H"];

    // ========== ABA 1: Jogadores Inscritos ==========
    const wsPlayers = workbook.addWorksheet("Jogadores Inscritos");
    wsPlayers.columns = [
      { header: "Nº", key: "num", width: 6 },
      { header: "Nome do Botonista", key: "name", width: 30 },
      { header: "Nome Esportivo", key: "sportName", width: 25 },
      { header: "Município", key: "municipality", width: 25 },
      { header: "Time / Clube do Botão", key: "club", width: 25 },
      { header: "Grupo", key: "group", width: 10 },
    ];

    wsPlayers.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    wsPlayers.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B5E20" } };

    players.forEach((p, idx) => {
      wsPlayers.addRow({ num: idx + 1, name: p.name, sportName: p.sportName || "", municipality: p.municipality, club: p.club, group: p.groupLetter });
    });

    // ========== ABA 2: Classificação dos Grupos ==========
    const wsStandings = workbook.addWorksheet("Classificação dos Grupos");

    let currentRow = 1;
    for (const g of groups) {
      const standings = await db.calculateGroupStandings(tournamentId, g);

      const headerRow = wsStandings.getRow(currentRow);
      headerRow.getCell(1).value = `GRUPO ${g}`;
      headerRow.getCell(1).font = { bold: true, size: 12 };
      currentRow++;

      const colHeaders = ["Pos", "Jogador", "Pts", "J", "V", "E", "D", "GP", "GC", "SG"];
      const colRow = wsStandings.getRow(currentRow);
      colHeaders.forEach((h, i) => {
        colRow.getCell(i + 1).value = h;
        colRow.getCell(i + 1).font = { bold: true };
      });
      currentRow++;

      standings.forEach((row, idx) => {
        const dataRow = wsStandings.getRow(currentRow);
        dataRow.getCell(1).value = idx + 1;
        dataRow.getCell(2).value = row.playerName;
        dataRow.getCell(3).value = row.points;
        dataRow.getCell(4).value = row.played;
        dataRow.getCell(5).value = row.won;
        dataRow.getCell(6).value = row.drawn;
        dataRow.getCell(7).value = row.lost;
        dataRow.getCell(8).value = row.goalsFor;
        dataRow.getCell(9).value = row.goalsAgainst;
        dataRow.getCell(10).value = row.goalDiff;
        currentRow++;
      });

      currentRow += 2;
    }

    wsStandings.getColumn(1).width = 6;
    wsStandings.getColumn(2).width = 30;
    for (let i = 3; i <= 10; i++) wsStandings.getColumn(i).width = 8;

    // ========== ABA 3: Jogos (Resultados) ==========
    const wsMatches = workbook.addWorksheet("Jogos - Resultados");
    wsMatches.columns = [
      { header: "Grupo", key: "group", width: 8 },
      { header: "Rodada", key: "round", width: 10 },
      { header: "Mandante", key: "home", width: 25 },
      { header: "Gols M", key: "homeScore", width: 8 },
      { header: "Gols V", key: "awayScore", width: 8 },
      { header: "Visitante", key: "away", width: 25 },
      { header: "Status", key: "status", width: 12 },
    ];

    wsMatches.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    wsMatches.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B5E20" } };

    const allMatches = await db.getGroupMatches(tournamentId);
    for (const match of allMatches) {
      const homeName = players.find(p => p.id === match.homePlayerId)?.name || "";
      const awayName = players.find(p => p.id === match.awayPlayerId)?.name || "";
      wsMatches.addRow({
        group: match.groupLetter,
        round: match.round,
        home: homeName,
        homeScore: match.played === 1 ? match.homeScore : "",
        awayScore: match.played === 1 ? match.awayScore : "",
        away: awayName,
        status: match.played === 1 ? "Realizado" : "Pendente",
      });
    }

    // ========== ABA 4-7: Fase Eliminatória por Série ==========
    const seriesLabels = ["A", "B", "C", "D"];
    const phaseLabels: Record<string, string> = {
      round_of_16: "Oitavas de Final",
      quarter_finals: "Quartas de Final",
      semi_finals: "Semifinal",
      third_place: "Disputa de 3º Lugar",
      final: "Grande Final",
    };

    for (const series of seriesLabels) {
      const wsKnockout = workbook.addWorksheet(`Eliminatórias - Série ${series}`);
      wsKnockout.columns = [
        { header: "Fase", key: "phase", width: 22 },
        { header: "Jogo", key: "matchOrder", width: 8 },
        { header: "Mandante", key: "home", width: 25 },
        { header: "Gols M", key: "homeScore", width: 8 },
        { header: "Gols V", key: "awayScore", width: 8 },
        { header: "Visitante", key: "away", width: 25 },
        { header: "Pên. M", key: "homePen", width: 8 },
        { header: "Pên. V", key: "awayPen", width: 8 },
        { header: "Vencedor", key: "winner", width: 25 },
      ];

      wsKnockout.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      wsKnockout.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B5E20" } };

      const knockoutData = await db.getKnockoutMatches(tournamentId, series);
      for (const match of knockoutData) {
        const homeName = match.homePlayerId ? players.find(p => p.id === match.homePlayerId)?.name || "" : "A definir";
        const awayName = match.awayPlayerId ? players.find(p => p.id === match.awayPlayerId)?.name || "" : "A definir";
        const winnerName = match.winnerId ? players.find(p => p.id === match.winnerId)?.name || "" : "";

        wsKnockout.addRow({
          phase: phaseLabels[match.phase] || match.phase,
          matchOrder: match.matchOrder,
          home: homeName,
          homeScore: match.played === 1 ? match.homeScore : "",
          awayScore: match.played === 1 ? match.awayScore : "",
          away: awayName,
          homePen: match.decisionMethod === "penalties" ? match.homePenalties : "",
          awayPen: match.decisionMethod === "penalties" ? match.awayPenalties : "",
          winner: winnerName,
        });
      }
    }

    // Gerar e enviar
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=Liga_Futeboton_Copa64T.xlsx");

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("[Export] Error:", error);
    res.status(500).json({ error: "Erro ao exportar" });
  }
}
