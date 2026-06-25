"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function AdminPage() {
 const [matches, setMatches] = useState<any[]>([]);
const [pendingPrizes, setPendingPrizes] = useState<any[]>([]);
const [challengesToValidate, setChallengesToValidate] = useState<any[]>([]);
const [playersList, setPlayersList] = useState<any[]>([]);
const [dashboardStats, setDashboardStats] = useState({
  customersCount: 0,
  predictionsCount: 0,
  visitsCount: 0,
  pendingPrizesCount: 0,
  deliveredPrizesCount: 0,
  sanRafaelCustomersCount: 0,
  ventuCustomersCount: 0,
  birthdayMonthCustomersCount: 0,
  totalPrizesCount: 0,
  registrationGoal: 500,
  predictionGoal: 1000,
  todayCode: "Sin código",
  tomorrowCode: "Sin código",
  topCustomerName: "Sin datos",
  topCustomerStamps: 0,
  topCustomerRaffleEntries: 0,
});
const [topCustomers, setTopCustomers] = useState<any[]>([]);
const [recentCustomers, setRecentCustomers] = useState<any[]>([]);
const [customersList, setCustomersList] = useState<any[]>([]);
const [selectedCustomerDetail, setSelectedCustomerDetail] = useState<any>(null);
const [activeTab, setActiveTab] = useState<"dashboard" | "customers" | "manual" | "history" | "automatic" | "challenges" | "prizes">("dashboard");

  const finishedMatches = matches.filter((match) => isMatchClosed(match));
  const pendingMatches = matches.filter((match) => !isMatchClosed(match));

  const groupedMatches = pendingMatches.reduce((groups: Record<string, any[]>, match) => {
    const date = match.match_date || "Sin fecha";

    if (!groups[date]) {
      groups[date] = [];
    }

    groups[date].push(match);
    return groups;
  }, {});

  const groupedFinishedMatches = finishedMatches.reduce((groups: Record<string, any[]>, match) => {
    const date = match.match_date || "Sin fecha";

    if (!groups[date]) {
      groups[date] = [];
    }

    groups[date].push(match);
    return groups;
  }, {});

  useEffect(() => {
    loadDashboardStats();
    loadMatches();
    loadPendingPrizes();
    loadCustomersList();
    loadChallengesToValidate();
    loadPlayersList();
  }, []);
  async function loadMatches() {
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .order("match_date", { ascending: true });

    if (error) {
      console.log("MATCHES LOAD ERROR:", error);
      return;
    }

    setMatches(data || []);
  }

async function loadDashboardStats() {
  const { count: customersCount } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true });

  const { count: predictionsCount } = await supabase
    .from("challenge_entries")
    .select("*", { count: "exact", head: true });

  const { count: visitsCount } = await supabase
    .from("daily_code_validations")
    .select("*", { count: "exact", head: true });

  const { count: pendingPrizesCount } = await supabase
    .from("customer_prizes")
    .select("*", { count: "exact", head: true })
    .eq("delivered", false);
const { count: deliveredPrizesCount } = await supabase
  .from("customer_prizes")
  .select("*", { count: "exact", head: true })
  .eq("delivered", true);

const { count: totalPrizesCount } = await supabase
  .from("customer_prizes")
  .select("*", { count: "exact", head: true });

const { count: sanRafaelCustomersCount } = await supabase
  .from("customers")
  .select("*", { count: "exact", head: true })
  .eq("favorite_location", "Finca 8 San Rafael");

const { count: ventuCustomersCount } = await supabase
  .from("customers")
  .select("*", { count: "exact", head: true })
  .eq("favorite_location", "Finca 8 Ventu");

const currentMonth = getCurrentMonthName();

const { count: birthdayMonthCustomersCount } = await supabase
  .from("customers")
  .select("*", { count: "exact", head: true })
  .eq("birthday_month", currentMonth);

const todayDate = getLocalDateString(0);
const tomorrowDate = getLocalDateString(1);

const { data: todayCodeData } = await supabase
  .from("daily_codes")
  .select("code")
  .eq("code_date", todayDate)
  .eq("active", true)
  .single();

const { data: tomorrowCodeData } = await supabase
  .from("daily_codes")
  .select("code")
  .eq("code_date", tomorrowDate)
  .eq("active", true)
  .single();
  const { data: topRewards } = await supabase
    .from("rewards")
    .select(`
      stamps_count,
      final_raffle_entries,
      customers (
        name,
        phone
      )
    `)
    .order("final_raffle_entries", { ascending: false })
    .limit(5);

  const { data: latestCustomers } = await supabase
    .from("customers")
.select("id, name, phone, email, birthday_day, birthday_month, favorite_location, consent, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  setTopCustomers(topRewards || []);
  setRecentCustomers(latestCustomers || []);

  const topCustomer = topRewards?.[0];
  const topCustomerData = Array.isArray(topCustomer?.customers)
    ? topCustomer?.customers[0]
    : topCustomer?.customers;

  setDashboardStats({
    customersCount: customersCount || 0,
    predictionsCount: predictionsCount || 0,
    visitsCount: visitsCount || 0,
    pendingPrizesCount: pendingPrizesCount || 0,
    deliveredPrizesCount: deliveredPrizesCount || 0,
    sanRafaelCustomersCount: sanRafaelCustomersCount || 0,
    ventuCustomersCount: ventuCustomersCount || 0,
    birthdayMonthCustomersCount: birthdayMonthCustomersCount || 0,
    totalPrizesCount: totalPrizesCount || 0,
    registrationGoal: 500,
    predictionGoal: 1000,
    todayCode: todayCodeData?.code || "Sin código",
    tomorrowCode: tomorrowCodeData?.code || "Sin código",
    topCustomerName: topCustomerData?.name || "Sin datos",
    topCustomerStamps: topCustomer?.stamps_count || 0,
    topCustomerRaffleEntries: topCustomer?.final_raffle_entries || 0,
  });
}
async function loadPlayersList() {
  const pageSize = 1000;

  const { data: firstPage, error: firstError } = await supabase
    .from("players")
    .select("id, team_name, player_name, active")
    .order("team_name", { ascending: true })
    .order("player_name", { ascending: true })
    .range(0, pageSize - 1);

  if (firstError) {
    console.log("PLAYERS LIST LOAD ERROR:", firstError);
    setPlayersList([]);
    return;
  }

  const { data: secondPage, error: secondError } = await supabase
    .from("players")
    .select("id, team_name, player_name, active")
    .order("team_name", { ascending: true })
    .order("player_name", { ascending: true })
    .range(pageSize, pageSize * 2 - 1);

  if (secondError) {
    console.log("PLAYERS LIST LOAD ERROR:", secondError);
    setPlayersList(firstPage || []);
    return;
  }

  setPlayersList([...(firstPage || []), ...(secondPage || [])]);
}



async function addMatchScorerForMatch(matchId: number, playerName: string, minute: string) {
  if (!playerName || !minute.trim()) {
    alert("Seleccioná goleador e ingresá minuto.");
    return;
  }

  const minuteNumber = Number(minute);

  if (Number.isNaN(minuteNumber) || minuteNumber < 0) {
    alert("Ingresá un minuto válido.");
    return;
  }

  const { error } = await supabase
    .from("match_scorers")
    .insert({
      match_id: matchId,
      player_name: playerName,
      minute: minuteNumber,
    });

  if (error) {
    console.log("MATCH SCORER INSERT ERROR:", error);
    alert("No se pudo agregar el goleador.");
    return;
  }

  alert("Goleador agregado al partido.");
}

async function loadChallengesToValidate() {
  const { data, error } = await supabase
    .from("prediction_challenges")
    .select(`
      id,
      title,
      description,
      difficulty_level,
      prize_id,
      closes_at,
      status,
      available_prizes (
        name
      ),
      challenge_results (
        id,
        validated_at
      ),
      challenge_matches (
        match_id,
        matches (
          id,
          home_team,
          away_team,
          home_score,
          away_score,
          status
        )
      )
    `)
    .order("display_order", { ascending: true })
    .order("closes_at", { ascending: true });

  if (error) {
    console.log("CHALLENGES TO VALIDATE LOAD ERROR:", error);
    setChallengesToValidate([]);
    return;
  }

  setChallengesToValidate(data || []);
}

function getChallengePrizeName(challenge: any) {
  const prizeData = Array.isArray(challenge.available_prizes)
    ? challenge.available_prizes[0]
    : challenge.available_prizes;

  return prizeData?.name || challenge.title || "Premio Golazo Finca 8";
}

function hasChallengeBeenValidated(challenge: any) {
  return Array.isArray(challenge.challenge_results) && challenge.challenge_results.length > 0;
}

function areChallengeMatchesCompleted(challenge: any) {
  return (challenge.challenge_matches || []).every((challengeMatch: any) => {
    const match = challengeMatch.matches;

    return (
      match &&
      match.home_score !== null &&
      match.home_score !== undefined &&
      match.away_score !== null &&
      match.away_score !== undefined
    );
  });
}

function challengeNeedsScorer(challenge: any) {
  return challenge.difficulty_level === "hard" || challenge.difficulty_level === "legendary";
}

function challengeNeedsScorerInEveryMatch(challenge: any) {
  return challenge.difficulty_level === "legendary";
}

async function validateChallengeWinners(challenge: any) {
  if (hasChallengeBeenValidated(challenge)) {
    alert("Este reto ya fue validado.");
    return;
  }

  if (!areChallengeMatchesCompleted(challenge)) {
    alert("Primero ingresá los resultados reales de todos los partidos del reto.");
    return;
  }

  const challengeMatches = challenge.challenge_matches || [];
  const matchIds = challengeMatches.map((challengeMatch: any) => challengeMatch.match_id);

  const { data: existingResult } = await supabase
    .from("challenge_results")
    .select("id")
    .eq("challenge_id", challenge.id)
    .maybeSingle();

  if (existingResult) {
    alert("Este reto ya fue validado.");
    await loadChallengesToValidate();
    return;
  }

  const { data: entries, error: entriesError } = await supabase
    .from("challenge_entries")
    .select("id, customer_id, challenge_id")
    .eq("challenge_id", challenge.id);

  if (entriesError) {
    console.log("CHALLENGE ENTRIES LOAD ERROR:", entriesError);
    alert("No se pudieron cargar las participaciones del reto.");
    return;
  }

  const entryIds = (entries || []).map((entry: any) => entry.id);
  const customerIds = (entries || []).map((entry: any) => entry.customer_id);

  if (entryIds.length === 0) {
    await supabase.from("challenge_results").insert({
      challenge_id: challenge.id,
      validated_by: "admin",
      notes: "Reto validado sin participaciones.",
    });

    alert("Reto validado. No hubo participaciones.");
    await loadChallengesToValidate();
    return;
  }

  const { data: entryDetails, error: detailsError } = await supabase
    .from("challenge_entry_details")
    .select("id, challenge_entry_id, match_id, predicted_goal_scorer")
    .in("challenge_entry_id", entryIds);

  if (detailsError) {
    console.log("CHALLENGE ENTRY DETAILS LOAD ERROR:", detailsError);
    alert("No se pudieron cargar los detalles del reto.");
    return;
  }

  const { data: predictions, error: predictionsError } = await supabase
    .from("user_match_predictions")
    .select("customer_id, match_id, predicted_home_score, predicted_away_score")
    .in("customer_id", customerIds)
    .in("match_id", matchIds);

  if (predictionsError) {
    console.log("USER MATCH PREDICTIONS LOAD ERROR:", predictionsError);
    alert("No se pudieron cargar las predicciones base.");
    return;
  }

  const { data: scorers, error: scorersError } = await supabase
    .from("match_scorers")
    .select("match_id, player_name")
    .in("match_id", matchIds);

  if (scorersError) {
    console.log("MATCH SCORERS LOAD ERROR:", scorersError);
    alert("No se pudieron cargar los goleadores reales.");
    return;
  }

  const winners: any[] = [];

  for (const entry of entries || []) {
    const allScoresCorrect = challengeMatches.every((challengeMatch: any) => {
      const match = challengeMatch.matches;

      const prediction = (predictions || []).find(
        (item: any) => item.customer_id === entry.customer_id && item.match_id === challengeMatch.match_id
      );

      return (
        prediction &&
        match &&
        prediction.predicted_home_score === match.home_score &&
        prediction.predicted_away_score === match.away_score
      );
    });

    if (!allScoresCorrect) {
      continue;
    }

    if (!challengeNeedsScorer(challenge)) {
      winners.push(entry);
      continue;
    }

    const detailsForEntry = (entryDetails || []).filter(
      (detail: any) => detail.challenge_entry_id === entry.id
    );

    const correctScorerDetails = detailsForEntry.filter((detail: any) => {
      if (!detail.predicted_goal_scorer) {
        return false;
      }

      return (scorers || []).some(
        (scorer: any) =>
          scorer.match_id === detail.match_id &&
          scorer.player_name === detail.predicted_goal_scorer
      );
    });

    if (challengeNeedsScorerInEveryMatch(challenge)) {
      const allMatchesHaveCorrectScorer = challengeMatches.every((challengeMatch: any) =>
        correctScorerDetails.some((detail: any) => detail.match_id === challengeMatch.match_id)
      );

      if (allMatchesHaveCorrectScorer) {
        winners.push(entry);
      }
    } else if (correctScorerDetails.length > 0) {
      winners.push(entry);
    }
  }

  const prizeName = getChallengePrizeName(challenge);

  if (winners.length > 0) {
    const prizeRows = winners.map((winner) => ({
      customer_id: winner.customer_id,
      prize_name: `${prizeName} - Golazo Finca 8`,
      delivered: false,
    }));

    const { error: prizeError } = await supabase
      .from("customer_prizes")
      .insert(prizeRows);

    if (prizeError) {
      console.log("CHALLENGE PRIZE INSERT ERROR:", prizeError);
      alert("Se detectaron ganadores, pero no se pudieron asignar los premios.");
      return;
    }
  }

  const { error: resultError } = await supabase
    .from("challenge_results")
    .insert({
      challenge_id: challenge.id,
      validated_by: "admin",
      notes: `${winners.length} ganador(es) detectado(s).`,
    });

  if (resultError) {
    console.log("CHALLENGE RESULT INSERT ERROR:", resultError);
    alert("Se asignaron premios, pero no se pudo marcar el reto como validado.");
    return;
  }

  alert(`Reto validado. Ganadores detectados: ${winners.length}`);

  await loadChallengesToValidate();
  await loadPendingPrizes();
  await loadDashboardStats();
}

async function loadPendingPrizes() {
  const { data, error } = await supabase
    .from("customer_prizes")
    .select(`
      id,
      prize_name,
      delivered,
      delivered_at,
      customers (
        name,
        phone
      )
    `)
    .eq("delivered", false)
    .order("id", { ascending: true });

  if (error) {
    console.log("PENDING PRIZES LOAD ERROR:", error);
    setPendingPrizes([]);
    return;
  }

  setPendingPrizes(data || []);
}

async function loadCustomersList() {
  const { data, error } = await supabase
    .from("customers")
.select("id, name, phone, email, birthday_day, birthday_month, favorite_location, consent, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.log("CUSTOMERS LIST LOAD ERROR:", error);
    setCustomersList([]);
    return;
  }

  setCustomersList(data || []);
}

async function loadCustomerDetail(customerId: number) {
  const { data: customer } = await supabase
    .from("customers")
    .select("id, name, phone, email, birthday_day, birthday_month, favorite_location, consent, created_at")
    .eq("id", customerId)
    .single();

  const { data: rewards } = await supabase
    .from("rewards")
    .select("stamps_count, final_raffle_entries")
    .eq("customer_id", customerId)
    .single();

  const { data: predictions } = await supabase
    .from("predictions")
    .select(`
      id,
      home_score_prediction,
      away_score_prediction,
      is_correct,
      points_awarded,
      matches (
        home_team,
        away_team,
        match_date,
        home_score_actual,
        away_score_actual
      )
    `)
    .eq("customer_id", customerId)
    .order("id", { ascending: false });

  const { data: visits } = await supabase
    .from("visits")
    .select("id, visit_date, location, stamp_awarded")
    .eq("customer_id", customerId)
    .order("visit_date", { ascending: false });

  const { data: prizes } = await supabase
    .from("customer_prizes")
    .select("id, prize_name, delivered, delivered_at")
    .eq("customer_id", customerId)
    .order("id", { ascending: false });

  setSelectedCustomerDetail({
    customer,
    rewards,
    predictions: predictions || [],
    visits: visits || [],
    prizes: prizes || [],
  });
}

async function markPrizeDelivered(prizeId: number) {
  const { error } = await supabase
    .from("customer_prizes")
    .update({
      delivered: true,
      delivered_at: new Date().toISOString(),
    })
    .eq("id", prizeId);

  if (error) {
    console.log("PRIZE DELIVERY ERROR:", error);
    alert("No se pudo marcar el premio como entregado.");
    return;
  }

  alert("Premio marcado como entregado");

  await loadPendingPrizes();
  await loadDashboardStats();
}
  async function saveResult(
    id: number,
    homeScore: number,
    awayScore: number
  ) {
    const { error: matchError } = await supabase
      .from("matches")
      .update({
        home_score_actual: homeScore,
        away_score_actual: awayScore,
        home_score: homeScore,
        away_score: awayScore,
        status: "completed",
        is_finished: true,
      })
      .eq("id", id);

    if (matchError) {
      console.log("MATCH UPDATE ERROR:", matchError);
      alert("No se pudo guardar el resultado.");
      return;
    }

    const { data: predictions, error: predictionsError } = await supabase
      .from("predictions")
      .select("id, customer_id, home_score_prediction, away_score_prediction, points_awarded")
      .eq("match_id", id);

    if (predictionsError) {
      console.log("PREDICTIONS LOAD ERROR:", predictionsError);
      alert("Resultado guardado, pero no se pudieron revisar los pronósticos.");
      await loadMatches();
      return;
    }

    for (const prediction of predictions || []) {
      const points = calculatePoints(
        prediction.home_score_prediction,
        prediction.away_score_prediction,
        homeScore,
        awayScore
      );

      const previousPoints = prediction.points_awarded || 0;
      const pointsDelta = points - previousPoints;

      const { error: predictionUpdateError } = await supabase
        .from("predictions")
        .update({
          is_correct: points > 0,
          points_awarded: points,
        })
        .eq("id", prediction.id);

      if (predictionUpdateError) {
        console.log("PREDICTION UPDATE ERROR:", predictionUpdateError);
      }

      if (pointsDelta !== 0) {
        const { data: reward, error: rewardLoadError } = await supabase
          .from("rewards")
          .select("final_raffle_entries")
          .eq("customer_id", prediction.customer_id)
          .single();

        if (rewardLoadError) {
          console.log("REWARD LOAD ERROR:", rewardLoadError);
          continue;
        }

        const currentEntries = reward?.final_raffle_entries || 0;
        const nextEntries = Math.max(currentEntries + pointsDelta, 0);

        const { error: rewardUpdateError } = await supabase
          .from("rewards")
          .update({
            final_raffle_entries: nextEntries,
          })
          .eq("customer_id", prediction.customer_id);

        if (rewardUpdateError) {
          console.log("REWARD UPDATE ERROR:", rewardUpdateError);
        }
      }

      if (points === 3) {
        const { error: prizeInsertError } = await supabase
          .from("customer_prizes")
          .insert({
            customer_id: prediction.customer_id,
            prediction_id: prediction.id,
            prize_name: "Premio 1",
            delivered: false,
          });

        if (prizeInsertError && prizeInsertError.code !== "23505") {
          console.log("PRIZE INSERT ERROR:", prizeInsertError);
        }
      }
    }

    alert("Resultado guardado y pronósticos revisados");

    await loadDashboardStats();
    await loadMatches();
    await loadPendingPrizes();
    setActiveTab("history");
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <h1 className="text-4xl font-bold mb-8">
        ⚙️ Panel Administrador
      </h1>

      <div className="flex flex-wrap gap-3 mb-8">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`px-5 py-3 rounded-lg font-bold ${
            activeTab === "dashboard"
              ? "bg-red-600 text-white"
              : "bg-zinc-800 text-gray-300 border border-zinc-700"
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab("customers")}
          className={`px-5 py-3 rounded-lg font-bold ${
            activeTab === "customers"
              ? "bg-red-600 text-white"
              : "bg-zinc-800 text-gray-300 border border-zinc-700"
          }`}
        >
          Clientes
        </button>
        <button
          onClick={() => setActiveTab("manual")}
          className={`px-5 py-3 rounded-lg font-bold ${
            activeTab === "manual"
              ? "bg-red-600 text-white"
              : "bg-zinc-800 text-gray-300 border border-zinc-700"
          }`}
        >
          Resultados manuales
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`px-5 py-3 rounded-lg font-bold ${
            activeTab === "history"
              ? "bg-red-600 text-white"
              : "bg-zinc-800 text-gray-300 border border-zinc-700"
          }`}
        >
          Historial
        </button>

        <button
          onClick={() => setActiveTab("automatic")}
          className={`px-5 py-3 rounded-lg font-bold ${
            activeTab === "automatic"
              ? "bg-red-600 text-white"
              : "bg-zinc-800 text-gray-300 border border-zinc-700"
          }`}
        >
          Resultados automáticos
        </button>
        <button
          onClick={() => setActiveTab("challenges")}
          className={`px-5 py-3 rounded-lg font-bold ${
            activeTab === "challenges"
              ? "bg-red-600 text-white"
              : "bg-zinc-800 text-gray-300 border border-zinc-700"
          }`}
        >
          Validar retos
        </button>
        <button
          onClick={() => setActiveTab("prizes")}
          className={`px-5 py-3 rounded-lg font-bold ${
            activeTab === "prizes"
              ? "bg-red-600 text-white"
              : "bg-zinc-800 text-gray-300 border border-zinc-700"
          }`}
        >
          Premios pendientes
        </button>
      </div>
      {activeTab === "dashboard" && (
        <div className="space-y-6 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Clientes registrados"
              value={dashboardStats.customersCount}
              goal={dashboardStats.registrationGoal}
            />

            <MetricCard
              title="Participaciones en retos"
              value={dashboardStats.predictionsCount}
              goal={dashboardStats.predictionGoal}
            />

            <MetricCard
              title="Clientes con código validado"
              value={dashboardStats.visitsCount}
            />

            <MetricCard
              title="Premios pendientes"
              value={dashboardStats.pendingPrizesCount}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Código de hoy"
              value={dashboardStats.todayCode}
            />

            <MetricCard
              title="Código de mañana"
              value={dashboardStats.tomorrowCode}
            />

            <MetricCard
              title="Premios entregados"
              value={dashboardStats.deliveredPrizesCount}
            />

            <MetricCard
              title="Cumpleaños del mes"
              value={dashboardStats.birthdayMonthCustomersCount}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Clientes San Rafael"
              value={dashboardStats.sanRafaelCustomersCount}
            />

            <MetricCard
              title="Clientes Ventu"
              value={dashboardStats.ventuCustomersCount}
            />

            <MetricCard
              title="Premios generados"
              value={dashboardStats.totalPrizesCount}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 max-w-3xl">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4">📋 Resumen operativo</h2>
              <p className="text-gray-300 mb-2">
                Clientes registrados: {dashboardStats.customersCount}
              </p>
              <p className="text-gray-300 mb-2">
                Participaciones por cliente: {dashboardStats.customersCount > 0 ? (dashboardStats.predictionsCount / dashboardStats.customersCount).toFixed(1) : "0"}
              </p>
              <p className="text-gray-300">
                Premios pendientes por entregar: {dashboardStats.pendingPrizesCount}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 max-w-3xl">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4">🆕 Clientes recientes</h2>

              {recentCustomers.length === 0 && (
                <p className="text-gray-300">Todavía no hay clientes recientes.</p>
              )}

              <div className="space-y-3">
                {recentCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="border-b border-zinc-800 pb-3"
                  >
                    <p className="font-bold">{customer.name || "Sin nombre"}</p>
                    <p className="text-sm text-gray-400">
                      {customer.phone || "Sin teléfono"}
                    </p>
                    <p className="text-sm text-gray-500">
                      Cumpleaños: {customer.birthday_month || "Sin dato"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "customers" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4">👥 Clientes</h2>

            {customersList.length === 0 && (
              <p className="text-gray-300">Todavía no hay clientes registrados.</p>
            )}

            <div className="space-y-3">
              {customersList.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => loadCustomerDetail(customer.id)}
                  className="w-full text-left bg-black border border-zinc-700 rounded-lg p-4 hover:border-red-600"
                >
                  <p className="font-bold">{customer.name || "Sin nombre"}</p>
                  <p className="text-sm text-gray-400">WhatsApp: {customer.phone || "Sin teléfono"}</p>
                  <p className="text-sm text-gray-400">Email: {customer.email || "Sin email"}</p>
                  <p className="text-sm text-gray-500">
                    Cumpleaños: {customer.birthday_day || "--"} de {customer.birthday_month || "--"}
                  </p>
                  <p className="text-sm text-gray-500">
                    Local: {customer.favorite_location || "Sin dato"}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4">📋 Historial del cliente</h2>

            {!selectedCustomerDetail && (
              <p className="text-gray-300">Seleccioná un cliente para ver su historial.</p>
            )}

            {selectedCustomerDetail && (
              <div className="space-y-6">
                <div>
                  <p className="text-xl font-bold">{selectedCustomerDetail.customer?.name || "Sin nombre"}</p>
                  <p className="text-gray-400">WhatsApp: {selectedCustomerDetail.customer?.phone || "Sin teléfono"}</p>
                  <p className="text-gray-400">Email: {selectedCustomerDetail.customer?.email || "Sin email"}</p>
                  <p className="text-gray-400">
                    Cumpleaños: {selectedCustomerDetail.customer?.birthday_day || "--"} de {selectedCustomerDetail.customer?.birthday_month || "--"}
                  </p>
                  <p className="text-gray-400">
                    Local: {selectedCustomerDetail.customer?.favorite_location || "Sin dato"}
                  </p>
                  <p className="text-gray-400">
                    Consentimiento: {selectedCustomerDetail.customer?.consent ? "Sí" : "No"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-black border border-zinc-700 rounded-lg p-4">
                    <p className="text-gray-400">Estampas</p>
                    <p className="text-3xl font-bold">{selectedCustomerDetail.rewards?.stamps_count || 0}</p>
                  </div>

                  <div className="bg-black border border-zinc-700 rounded-lg p-4">
                    <p className="text-gray-400">Boletos</p>
                    <p className="text-3xl font-bold">{selectedCustomerDetail.rewards?.final_raffle_entries || 0}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold mb-2">⚽ Pronósticos</h3>
                  {selectedCustomerDetail.predictions.length === 0 && (
                    <p className="text-gray-400">Sin pronósticos.</p>
                  )}
                  <div className="space-y-2">
                    {selectedCustomerDetail.predictions.map((prediction: any) => (
                      <div key={prediction.id} className="bg-black border border-zinc-700 rounded-lg p-3">
                        <p className="font-bold">
                          {prediction.matches?.home_team} vs {prediction.matches?.away_team}
                        </p>
                        <p className="text-sm text-gray-400">
                          Pronóstico: {prediction.home_score_prediction}-{prediction.away_score_prediction}
                        </p>
                        <p className="text-sm text-gray-400">
                          Resultado: {prediction.matches?.home_score_actual ?? "-"}-{prediction.matches?.away_score_actual ?? "-"}
                        </p>
                        <p className="text-sm text-gray-400">
                          Puntos: {prediction.points_awarded || 0}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold mb-2">🎁 Premios</h3>
                  {selectedCustomerDetail.prizes.length === 0 && (
                    <p className="text-gray-400">Sin premios.</p>
                  )}
                  <div className="space-y-2">
                    {selectedCustomerDetail.prizes.map((prize: any) => (
                      <div key={prize.id} className="bg-black border border-zinc-700 rounded-lg p-3">
                        <p className="font-bold">{prize.prize_name}</p>
                        <p className="text-sm text-gray-400">
                          Estado: {prize.delivered ? "Entregado" : "Pendiente"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold mb-2">📍 Visitas</h3>
                  {selectedCustomerDetail.visits.length === 0 && (
                    <p className="text-gray-400">Sin visitas registradas.</p>
                  )}
                  <div className="space-y-2">
                    {selectedCustomerDetail.visits.map((visit: any) => (
                      <div key={visit.id} className="bg-black border border-zinc-700 rounded-lg p-3">
                        <p>{visit.visit_date}</p>
                        <p className="text-sm text-gray-400">{visit.location || "Sin ubicación"}</p>
                        <p className="text-sm text-gray-400">
                          Estampa: {visit.stamp_awarded ? "Sí" : "No"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "manual" && (
        <div className="space-y-10">
          {pendingMatches.length === 0 && (
            <p className="text-gray-300">
              No hay partidos pendientes para ingresar resultados.
            </p>
          )}

          {Object.entries(groupedMatches).map(([date, matchesForDate]) => (
            <section key={date}>
              <h2 className="text-2xl font-bold mb-4 border-b border-zinc-700 pb-2">
                {formatDate(date)}
              </h2>

              <div className="space-y-6">
                {matchesForDate.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    onSave={saveResult}
                    playersList={playersList}
                    onAddScorer={addMatchScorerForMatch}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-10">
          {finishedMatches.length === 0 && (
            <p className="text-gray-300">
              Todavía no hay resultados guardados.
            </p>
          )}

          {Object.entries(groupedFinishedMatches).map(([date, matchesForDate]) => (
            <section key={date}>
              <h2 className="text-2xl font-bold mb-4 border-b border-zinc-700 pb-2">
                {formatDate(date)}
              </h2>

              <div className="space-y-6">
                {matchesForDate.map((match) => (
                  <FinishedMatchCard
                    key={match.id}
                    match={match}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {activeTab === "automatic" && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-3xl">
          <h2 className="text-2xl font-bold mb-4">
            🤖 Resultados automáticos
          </h2>

          <p className="text-gray-300 mb-4">
            Esta sección queda reservada para conectar una API deportiva que actualice resultados automáticamente.
          </p>

          <div className="bg-black border border-zinc-700 rounded-lg p-4 text-left mb-6">
            <p className="font-bold mb-3">Flujo propuesto:</p>
            <p className="mb-2">1. Consultar API externa del Mundial.</p>
            <p className="mb-2">2. Actualizar resultados en la tabla matches.</p>
            <p className="mb-2">3. Marcar partidos como finalizados.</p>
            <p className="mb-2">4. Calcular aciertos en predictions.</p>
            <p>5. Generar puntos, boletos y premios.</p>
          </div>

          <button
            disabled
            className="w-full bg-zinc-700 text-gray-400 p-4 rounded-lg font-bold cursor-not-allowed"
          >
            CONECTAR API DE RESULTADOS — PRÓXIMA FASE
          </button>
        </div>
      )}

      {activeTab === "challenges" && (
        <div className="space-y-6 max-w-5xl">
          {challengesToValidate.length === 0 && (
            <p className="text-gray-300">
              No hay retos creados todavía.
            </p>
          )}

          {challengesToValidate.map((challenge) => {
            const alreadyValidated = hasChallengeBeenValidated(challenge);
            const matchesCompleted = areChallengeMatchesCompleted(challenge);
            const prizeName = getChallengePrizeName(challenge);

            return (
              <div
                key={challenge.id}
                className="bg-zinc-900 border border-zinc-700 rounded-xl p-6"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-[0.2em] mb-1">
                      {challenge.difficulty_level === "easy" && "Premio pequeño"}
                      {challenge.difficulty_level === "medium" && "Premio mediano"}
                      {challenge.difficulty_level === "hard" && "Premio grande"}
                      {challenge.difficulty_level === "legendary" && "Premio legendario"}
                    </p>

                    <h2 className="text-2xl font-bold mb-2">
                      {challenge.title}
                    </h2>

                    <p className="text-gray-300 mb-2">
                      Premio: {prizeName}
                    </p>

                    <p className="text-sm text-gray-500">
                      Cierre: {new Date(challenge.closes_at).toLocaleString("es-HN")}
                    </p>
                  </div>

                  <div className="text-sm">
                    {alreadyValidated ? (
                      <span className="bg-green-900/60 border border-green-700 text-green-200 px-3 py-2 rounded-lg inline-block">
                        Validado
                      </span>
                    ) : matchesCompleted ? (
                      <span className="bg-yellow-900/60 border border-yellow-700 text-yellow-200 px-3 py-2 rounded-lg inline-block">
                        Listo para validar
                      </span>
                    ) : (
                      <span className="bg-zinc-800 border border-zinc-700 text-gray-300 px-3 py-2 rounded-lg inline-block">
                        Pendiente de resultados
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-3 mb-5">
                  {(challenge.challenge_matches || []).map((challengeMatch: any) => {
                    const match = challengeMatch.matches;

                    if (!match) {
                      return null;
                    }

                    return (
                      <div
                        key={challengeMatch.match_id}
                        className="bg-black border border-zinc-700 rounded-lg p-4"
                      >
                        <p className="font-bold">
                          {match.home_team} vs {match.away_team}
                        </p>
                        <p className="text-sm text-gray-400">
                          Resultado: {match.home_score ?? "-"} - {match.away_score ?? "-"}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => validateChallengeWinners(challenge)}
                  disabled={alreadyValidated || !matchesCompleted}
                  className={`w-full p-4 rounded-lg font-bold ${
                    alreadyValidated || !matchesCompleted
                      ? "bg-zinc-700 text-gray-400 cursor-not-allowed"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  }`}
                >
                  {alreadyValidated ? "RETO YA VALIDADO" : "VALIDAR Y ASIGNAR PREMIOS"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "prizes" && (
        <div className="space-y-6 max-w-3xl">
          {pendingPrizes.length === 0 && (
            <p className="text-gray-300">
              No hay premios pendientes por entregar.
            </p>
          )}

          {pendingPrizes.map((prize) => (
            <div
              key={prize.id}
              className="bg-zinc-900 border border-zinc-700 rounded-xl p-6"
            >
              <h2 className="text-2xl font-bold mb-2">
                🎁 {prize.prize_name}
              </h2>

              <p className="text-gray-300 mb-2">
                Cliente: {prize.customers?.name || "Sin nombre"}
              </p>

              <p className="text-gray-300 mb-6">
                WhatsApp: {prize.customers?.phone || "Sin teléfono"}
              </p>

              <button
                onClick={() => markPrizeDelivered(prize.id)}
                className="bg-red-600 hover:bg-red-700 p-3 rounded font-bold"
              >
                Marcar entregado
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Sponsors and developer footer */}
      <div className="mt-12 flex flex-col items-center gap-8">
        <div className="flex flex-col items-center">
          <p className="text-xs text-gray-500 mb-3 uppercase tracking-[0.2em]">
            Conseguí beneficios en comercios aliados
          </p>

          <img
            src="/Variante BAC Sello50 Blanco (2).png"
            alt="BAC"
            className="w-36 sm:w-44 object-contain opacity-95"
          />
        </div>

        <div className="w-32 h-px bg-zinc-800" />

        <div className="flex flex-col items-center">
          <p className="text-xs text-gray-500 mb-3 uppercase tracking-[0.2em]">
            Experiencia desarrollada por
          </p>

          <img
            src="/tecnomovi-logo.png"
            alt="TecnoMovi"
            className="w-44 object-contain opacity-90"
          />
        </div>
      </div>
    </main>
  );
}

function MatchCard({
  match,
  onSave,
  playersList,
  onAddScorer,
}: {
  match: any;
  playersList: any[];
  onSave: (
    id: number,
    homeScore: number,
    awayScore: number
  ) => void;
  onAddScorer: (
    matchId: number,
    playerName: string,
    minute: string
  ) => void;
}) {
  const [homeScore, setHomeScore] = useState(match.home_score_actual ?? 0);
  const [awayScore, setAwayScore] = useState(match.away_score_actual ?? 0);

  const [selectedScorer, setSelectedScorer] = useState("");
  const [scorerMinuteValue, setScorerMinuteValue] = useState("");

  const homeTeamPlayers = playersList
    .filter((player) => teamsMatch(player.team_name, match.home_team))
    .sort((a, b) => a.player_name.localeCompare(b.player_name));

  const awayTeamPlayers = playersList
    .filter((player) => teamsMatch(player.team_name, match.away_team))
    .sort((a, b) => a.player_name.localeCompare(b.player_name));

  return (
    <div className="bg-zinc-900 rounded-xl p-6">
      <h2 className="text-2xl font-bold mb-4">
        {match.home_team} vs {match.away_team}
      </h2>

      <div className="flex gap-4 mb-4">
        <input
          type="number"
          value={homeScore}
          onChange={(e) => setHomeScore(Number(e.target.value))}
          className="bg-white text-black p-3 rounded w-24"
        />

        <input
          type="number"
          value={awayScore}
          onChange={(e) => setAwayScore(Number(e.target.value))}
          className="bg-white text-black p-3 rounded w-24"
        />
      </div>

      <button
        onClick={() => onSave(match.id, homeScore, awayScore)}
        className="bg-red-600 hover:bg-red-700 p-3 rounded font-bold"
      >
        Guardar resultado
      </button>

      <div className="mt-6 border-t border-zinc-700 pt-5">
        <h3 className="font-bold mb-3">⚽ Goleadores reales</h3>

        <div className="space-y-3">
          <select
            value={selectedScorer}
            onChange={(e) => setSelectedScorer(e.target.value)}
            className="w-full bg-white text-black p-3 rounded-lg"
          >
            <option value="">Seleccionar goleador</option>
            <option disabled>── {match.home_team} ──</option>
            {homeTeamPlayers.map((player) => (
              <option key={player.id} value={player.player_name}>
                {player.player_name} — {player.team_name}
              </option>
            ))}

            <option disabled>── {match.away_team} ──</option>
            {awayTeamPlayers.map((player) => (
              <option key={player.id} value={player.player_name}>
                {player.player_name} — {player.team_name}
              </option>
            ))}
          </select>

          <input
            type="number"
            value={scorerMinuteValue}
            onChange={(e) => setScorerMinuteValue(e.target.value)}
            placeholder="Minuto del gol"
            className="w-full bg-white text-black p-3 rounded-lg"
          />

          <button
            onClick={async () => {
              await onAddScorer(match.id, selectedScorer, scorerMinuteValue);
              setSelectedScorer("");
              setScorerMinuteValue("");
            }}
            className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 p-3 rounded font-bold"
          >
            Agregar goleador
          </button>
        </div>
      </div>
    </div>
  );
}

function FinishedMatchCard({ match }: { match: any }) {
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 opacity-90">
      <h2 className="text-2xl font-bold mb-2">
        {match.home_team} vs {match.away_team}
      </h2>

      <p className="text-gray-300 mb-4">
        Resultado final guardado
      </p>

      <div className="flex gap-4 mb-4">
        <div className="bg-black border border-zinc-700 rounded-lg p-4 w-24 text-center">
          <p className="text-sm text-gray-400">{match.home_team}</p>
          <p className="text-3xl font-bold">{match.home_score_actual}</p>
        </div>

        <div className="bg-black border border-zinc-700 rounded-lg p-4 w-24 text-center">
          <p className="text-sm text-gray-400">{match.away_team}</p>
          <p className="text-3xl font-bold">{match.away_score_actual}</p>
        </div>
      </div>

      <p className="text-sm text-gray-500">
        Este resultado ya fue cerrado. Para modificarlo, se debe hacer desde Supabase o por un administrador técnico.
      </p>
    </div>
  );
}

function formatDate(date: string) {
  if (date === "Sin fecha") {
    return date;
  }

  return new Date(`${date}T00:00:00`).toLocaleDateString("es-HN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function calculatePoints(
  predictedHome: number,
  predictedAway: number,
  actualHome: number,
  actualAway: number
) {
  const exactScore = predictedHome === actualHome && predictedAway === actualAway;

  if (exactScore) {
    return 3;
  }

  const predictedOutcome = getOutcome(predictedHome, predictedAway);
  const actualOutcome = getOutcome(actualHome, actualAway);

  if (predictedOutcome === actualOutcome) {
    return 1;
  }

  return 0;
}

function getOutcome(homeScore: number, awayScore: number) {
  if (homeScore > awayScore) {
    return "home";
  }

  if (homeScore < awayScore) {
    return "away";
  }

  return "draw";
}

function isMatchClosed(match: any) {
  return (
    match.is_finished === true ||
    (match.home_score_actual !== null &&
      match.home_score_actual !== undefined &&
      match.away_score_actual !== null &&
      match.away_score_actual !== undefined)
  );
}

function getLocalDateString(daysToAdd: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysToAdd);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getCurrentMonthName() {
  const months = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];

  return months[new Date().getMonth()];
}

function MetricCard({
  title,
  value,
  goal,
}: {
  title: string;
  value: number | string;
  goal?: number;
}) {
  const numericValue = typeof value === "number" ? value : 0;
  const progress = goal ? Math.min((numericValue / goal) * 100, 100) : null;

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6">
      <p className="text-gray-400 mb-2">{title}</p>
      <p className="text-4xl font-bold">{value}</p>

      {goal && (
        <>
          <p className="text-xs text-gray-500 mt-2">
            Meta: {goal}
          </p>

          <div className="w-full bg-black rounded-full h-2 mt-3 border border-zinc-800">
            <div
              className="bg-red-600 h-full rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
}
// Helper functions moved to module scope for MatchCard access

function normalizeTeamName(teamName: string) {
  const normalized = String(teamName || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ");

  const aliases: Record<string, string> = {
    "espana": "spain",
    "spain": "spain",
    "congo dr": "dr congo",
    "dr congo": "dr congo",
    "cote d'ivoire": "ivory coast",
    "ivory coast": "ivory coast",
    "ir iran": "iran",
    "iran": "iran",
    "korea republic": "south korea",
    "south korea": "south korea",
    "united states": "united states",
    "united states of america": "united states",
    "usa": "united states",
    "u.s.a.": "united states",
    "us": "united states",
    "curacao": "curacao",
    "turkiye": "turkey",
    "turkey": "turkey",
    "cabo verde": "cape verde",
    "cape verde": "cape verde",
  };

  return aliases[normalized] || normalized;
}

function teamsMatch(playerTeamName: string, matchTeamName: string) {
  return normalizeTeamName(playerTeamName) === normalizeTeamName(matchTeamName);
}
